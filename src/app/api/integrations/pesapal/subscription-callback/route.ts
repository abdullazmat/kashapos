import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SubscriptionCheckout from "@/models/SubscriptionCheckout";
import Tenant from "@/models/Tenant";
import { PesapalService } from "@/lib/pesapal";

const COMPLETED_STATUSES = new Set(["COMPLETED", "PAID", "SUCCESS", "1"]);
const FAILED_STATUSES = new Set([
  "FAILED",
  "FAIL",
  "DECLINED",
  "CANCELLED",
  "CANCELED",
  "ERROR",
  "0",
]);

function readStatusCode(statusResult: unknown) {
  return String(
    (
      statusResult as {
        payment_status_code?: string;
        status_code?: string | number;
      } | null
    )?.payment_status_code ||
      (
        statusResult as {
          payment_status_code?: string;
          status_code?: string | number;
        } | null
      )?.status_code ||
      "",
  )
    .toUpperCase()
    .trim();
}

function readStatusMessage(statusResult: unknown) {
  const payload = statusResult as {
    payment_status_description?: string;
    status_description?: string;
    description?: string;
    status?: string;
  } | null;

  return (
    payload?.payment_status_description ||
    payload?.status_description ||
    payload?.description ||
    payload?.status ||
    "Payment status checked"
  );
}

async function activateTenantPlan({
  tenantId,
  planName,
  billingMonths,
}: {
  tenantId: string;
  planName: string;
  billingMonths?: number;
}) {
  const normalizedPlan = planName.toLowerCase();
  const allowedPlans = new Set([
    "basic",
    "premium",
    "professional",
    "corporate",
    "enterprise",
  ]);

  if (!allowedPlans.has(normalizedPlan)) return;

  const now = new Date();
  const months =
    Number.isFinite(billingMonths) && (billingMonths || 0) > 0
      ? Number(billingMonths)
      : 1;
  const nextExpiry = new Date(now);
  nextExpiry.setMonth(nextExpiry.getMonth() + months);

  await Tenant.findByIdAndUpdate(tenantId, {
    $set: {
      plan: normalizedPlan,
      planExpiry: nextExpiry,
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const callbackToken = searchParams.get("token");
    const orderTrackingId = searchParams.get("OrderTrackingId");
    const merchantReference = searchParams.get("OrderMerchantReference");
    const configuredToken =
      process.env.PESAPAL_SUBSCRIPTION_CALLBACK_TOKEN?.trim() ||
      process.env.PESAPAL_CALLBACK_TOKEN?.trim();

    if (configuredToken && callbackToken !== configuredToken) {
      return NextResponse.json(
        { success: false, message: "Invalid callback token" },
        { status: 401 },
      );
    }

    if (!merchantReference && !orderTrackingId) {
      return NextResponse.json(
        { success: false, message: "Missing subscription reference" },
        { status: 400 },
      );
    }

    if (merchantReference && !merchantReference.startsWith("SUB-")) {
      return NextResponse.json(
        { success: false, message: "Invalid subscription reference" },
        { status: 400 },
      );
    }

    let checkout = null;
    if (merchantReference) {
      checkout = await SubscriptionCheckout.findOne({
        reference: merchantReference,
      });
    } else if (orderTrackingId) {
      checkout = await SubscriptionCheckout.findOne({
        trackingId: orderTrackingId,
      });
    }

    if (!checkout) {
      return NextResponse.json(
        { success: false, message: "Subscription checkout not found" },
        { status: 404 },
      );
    }

    if (
      orderTrackingId &&
      checkout.trackingId &&
      checkout.trackingId !== orderTrackingId
    ) {
      return NextResponse.json(
        { success: false, message: "Tracking reference mismatch" },
        { status: 400 },
      );
    }

    const trackingId = orderTrackingId || checkout.trackingId;
    if (!trackingId) {
      return NextResponse.json(
        { success: false, message: "Tracking ID missing" },
        { status: 400 },
      );
    }

    const statusResult = await PesapalService.getTransactionStatus(trackingId);
    if (!statusResult) {
      return NextResponse.json(
        { success: false, message: "No status response from Pesapal" },
        { status: 502 },
      );
    }

    const statusCode = readStatusCode(statusResult);
    const statusMessage = readStatusMessage(statusResult);
    const completed = COMPLETED_STATUSES.has(statusCode);
    const failed = FAILED_STATUSES.has(statusCode);

    checkout.trackingId = trackingId;
    checkout.raw = statusResult as Record<string, unknown>;

    if (completed) {
      checkout.status = "completed";
      checkout.errorMessage = "";
      checkout.activatedAt = new Date();
      await checkout.save();

      await activateTenantPlan({
        tenantId: String(checkout.tenantId),
        planName: checkout.planName,
        billingMonths: checkout.billingMonths,
      });
    } else if (failed) {
      checkout.status = "failed";
      checkout.errorMessage = statusMessage;
      await checkout.save();
    } else {
      checkout.status = "initiated";
      checkout.errorMessage = statusMessage;
      await checkout.save();
    }

    return NextResponse.json({
      success: true,
      completed,
      statusCode,
      message: statusMessage,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
