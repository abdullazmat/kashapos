import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SubscriptionCheckout from "@/models/SubscriptionCheckout";
import Tenant from "@/models/Tenant";

const SUCCESS_STATUS = new Set([
  "SUCCESS",
  "COMPLETED",
  "PAID",
  "APPROVED",
  "OK",
  "1",
]);

const FAILURE_STATUS = new Set([
  "FAILED",
  "FAIL",
  "DECLINED",
  "ERROR",
  "REJECTED",
  "CANCELED",
  "CANCELLED",
  "0",
]);

function normalizeText(value: unknown) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function readPayloadStatus(payload: Record<string, unknown>) {
  const status = normalizeText(
    payload.status || payload.payment_status || payload.state || payload.result,
  );

  return {
    statusCode: status,
    success: SUCCESS_STATUS.has(status),
    failure: FAILURE_STATUS.has(status),
  };
}

function readReference(payload: Record<string, unknown>) {
  const candidates = [
    payload.txRef,
    payload.tx_ref,
    payload.txId,
    payload.reference,
    payload.OrderMerchantReference,
    payload.order_merchant_reference,
    payload.orderReference,
    payload.order_reference,
  ];

  return candidates.find(
    (value) => typeof value === "string" && value.trim(),
  ) as string | undefined;
}

function readTrackingId(payload: Record<string, unknown>) {
  const candidates = [
    payload.transaction_id,
    payload.transactionId,
    payload.order_tracking_id,
    payload.orderTrackingId,
    payload.OrderTrackingId,
    payload.txId,
    payload.txRef,
  ];

  return candidates.find(
    (value) => typeof value === "string" && value.trim(),
  ) as string | undefined;
}

function readMessage(payload: Record<string, unknown>) {
  const candidates = [
    payload.message,
    payload.error,
    payload.error_description,
    payload.status_description,
    payload.payment_status_description,
    payload.status,
  ];

  return (
    (candidates.find((value) => typeof value === "string" && value.trim()) as
      | string
      | undefined) || "Payment callback received"
  );
}

function addMonths(baseDate: Date, months: number) {
  const next = new Date(baseDate);
  next.setMonth(next.getMonth() + months);
  return next;
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

  const months =
    Number.isFinite(billingMonths) && (billingMonths || 0) > 0
      ? Number(billingMonths)
      : 1;

  await Tenant.findByIdAndUpdate(tenantId, {
    $set: {
      plan: normalizedPlan,
      planExpiry: addMonths(new Date(), months),
    },
  });
}

async function parsePostPayload(req: NextRequest) {
  const contentType = (req.headers.get("content-type") || "").toLowerCase();

  if (contentType.includes("application/json")) {
    const json = await req.json();
    return (json || {}) as Record<string, unknown>;
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await req.formData();
    return Object.fromEntries(form.entries()) as Record<string, unknown>;
  }

  const rawText = await req.text();
  if (!rawText.trim()) {
    return {};
  }

  try {
    return JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    const params = new URLSearchParams(rawText);
    return Object.fromEntries(params.entries()) as Record<string, unknown>;
  }
}

async function processCallback(
  payload: Record<string, unknown>,
  token?: string,
) {
  await dbConnect();

  const configuredToken =
    process.env.SILICON_PAY_SUBSCRIPTION_CALLBACK_TOKEN?.trim() ||
    process.env.SILICON_PAY_CALLBACK_TOKEN?.trim();

  if (configuredToken && token !== configuredToken) {
    return NextResponse.json(
      { success: false, message: "Invalid callback token" },
      { status: 401 },
    );
  }

  const reference = readReference(payload);
  const trackingId = readTrackingId(payload);

  if (!reference && !trackingId) {
    return NextResponse.json(
      { success: false, message: "Missing subscription reference" },
      { status: 400 },
    );
  }

  const checkout = await SubscriptionCheckout.findOne({
    $or: [
      ...(reference ? [{ reference }] : []),
      ...(trackingId ? [{ trackingId }] : []),
    ],
  });

  if (!checkout) {
    return NextResponse.json(
      { success: false, message: "Subscription checkout not found" },
      { status: 404 },
    );
  }

  const status = readPayloadStatus(payload);
  const statusMessage = readMessage(payload);

  if (trackingId) {
    checkout.trackingId = trackingId;
  }

  if (status.success) {
    checkout.status = "completed";
    checkout.errorMessage = "";
    checkout.activatedAt = new Date();

    await activateTenantPlan({
      tenantId: String(checkout.tenantId),
      planName: checkout.planName,
      billingMonths: checkout.billingMonths,
    });
  } else if (status.failure) {
    checkout.status = "failed";
    checkout.errorMessage = statusMessage;
  } else {
    checkout.status = "initiated";
    checkout.errorMessage = statusMessage;
  }

  checkout.raw = payload;
  await checkout.save();

  return NextResponse.json({
    success: true,
    statusCode: status.statusCode,
    message: statusMessage,
  });
}

export async function POST(req: NextRequest) {
  try {
    const payload = await parsePostPayload(req);
    const tokenFromQuery = req.nextUrl.searchParams.get("token") || undefined;
    const tokenFromPayload =
      (typeof payload.token === "string" ? payload.token : undefined) ||
      tokenFromQuery;

    return await processCallback(payload, tokenFromPayload);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const token = req.nextUrl.searchParams.get("token") || undefined;
    return await processCallback(params, token);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
