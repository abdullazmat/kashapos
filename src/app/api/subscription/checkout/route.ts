import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api-helpers";
import { getSession } from "@/lib/auth";
import Plan from "@/models/Plan";
import Tenant from "@/models/Tenant";
import SubscriptionCheckout from "@/models/SubscriptionCheckout";
import { PesapalService } from "@/lib/pesapal";
import { resolveSubscriptionWorkflow } from "@/lib/subscription-policy";

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

function readCheckoutUrl(raw: unknown) {
  if (!raw || typeof raw !== "object") return undefined;
  const source = raw as Record<string, unknown>;
  const nested = source.data as Record<string, unknown> | undefined;

  const candidates = [
    source.redirect_url,
    source.redirectUrl,
    source.checkout_url,
    source.checkoutUrl,
    source.payment_url,
    source.paymentUrl,
    source.payment_link,
    source.paymentLink,
    source.url,
    source.link,
    nested?.redirect_url,
    nested?.redirectUrl,
    nested?.checkout_url,
    nested?.checkoutUrl,
    nested?.payment_url,
    nested?.paymentUrl,
    nested?.payment_link,
    nested?.paymentLink,
    nested?.url,
    nested?.link,
  ];

  return candidates.find(
    (value) => typeof value === "string" && value.trim(),
  ) as string | undefined;
}

function readGatewayError(raw: unknown) {
  if (!raw || typeof raw !== "object") return undefined;
  const source = raw as Record<string, unknown>;
  const nested = source.data as Record<string, unknown> | undefined;
  const error = source.error as
    | { message?: string; code?: string }
    | string
    | undefined;

  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object" && error.message?.trim()) {
    return error.message;
  }

  const candidates = [
    source.message,
    source.status,
    nested?.message,
    nested?.status,
  ];

  const message = candidates.find(
    (value) => typeof value === "string" && value.trim(),
  ) as string | undefined;

  return message;
}

function readTrackingId(raw: unknown) {
  if (!raw || typeof raw !== "object") return undefined;
  const source = raw as Record<string, unknown>;
  const nested = source.data as Record<string, unknown> | undefined;

  const candidates = [
    source.order_tracking_id,
    source.orderTrackingId,
    source.transactionId,
    source.transaction_id,
    nested?.order_tracking_id,
    nested?.orderTrackingId,
    nested?.transactionId,
  ];

  return candidates.find(
    (value) => typeof value === "string" && value.trim(),
  ) as string | undefined;
}

async function activateTenantPlan({
  tenantId,
  planName,
}: {
  tenantId: string;
  planName: string;
}) {
  const normalizedPlan = planName.toLowerCase();
  const allowedPlans = new Set([
    "basic",
    "premium",
    "professional",
    "corporate",
    "enterprise",
  ]);

  if (!allowedPlans.has(normalizedPlan)) {
    return;
  }

  const now = new Date();
  const nextExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await Tenant.findByIdAndUpdate(tenantId, {
    $set: {
      plan: normalizedPlan,
      planExpiry: nextExpiry,
    },
  });
}

export const dynamic = "force-dynamic";

function businessError(
  message: string,
  code: string,
  status = 422,
  workflow?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      message,
      code,
      ...(workflow ? { workflow } : {}),
    },
    { status },
  );
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return apiError("Unauthorized", 401);
    }

    await dbConnect();

    const [tenant, recent] = await Promise.all([
      Tenant.findById(session.tenantId).select("plan planExpiry").lean(),
      SubscriptionCheckout.find({ tenantId: session.tenantId })
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
    ]);

    return apiSuccess({
      tenant: tenant || null,
      checkouts: recent,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const normalized = message.toLowerCase();

    if (
      normalized.includes("amount_exceeds_default_limit") ||
      normalized.includes("transaction amount exceeds limit") ||
      normalized.includes("contractual_error")
    ) {
      return apiError(
        "PESAPAL_LIMIT: Checkout amount exceeds your current Pesapal account limit. Use Contact Sales or ask Pesapal support to raise the limit.",
        422,
      );
    }

    return apiError(message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError("Unauthorized", 401);
    }
    if (session.role !== "admin" && session.role !== "super_admin") {
      return apiError("Only admin users can manage subscriptions", 403);
    }

    await dbConnect();

    const {
      planId,
      action,
      reference: recheckReference,
    } = await request.json();

    if (action === "recheck") {
      if (!recheckReference) {
        return apiError("Subscription reference is required", 400);
      }

      const checkout = await SubscriptionCheckout.findOne({
        tenantId: session.tenantId,
        reference: recheckReference,
      });

      if (!checkout) {
        return apiError("Subscription payment not found", 404);
      }

      if (checkout.status === "completed") {
        return apiSuccess({
          checkout,
          completed: true,
          statusCode: "COMPLETED",
          message: "Subscription is already active.",
        });
      }

      if (!checkout.trackingId) {
        return apiError("Tracking ID missing for this payment", 400);
      }

      const statusResult = await PesapalService.getTransactionStatus(
        checkout.trackingId,
      );

      if (!statusResult) {
        return apiError("No status response from Pesapal", 502);
      }

      const statusCode = readStatusCode(statusResult);
      const message = readStatusMessage(statusResult);
      const completed = COMPLETED_STATUSES.has(statusCode);
      const failed = FAILED_STATUSES.has(statusCode);

      if (completed) {
        checkout.status = "completed";
        checkout.errorMessage = "";
        checkout.activatedAt = new Date();
      } else if (failed) {
        checkout.status = "failed";
        checkout.errorMessage = message;
      } else {
        checkout.status = "initiated";
        checkout.errorMessage = message;
      }

      checkout.raw = statusResult as Record<string, unknown>;
      await checkout.save();

      if (completed) {
        await activateTenantPlan({
          tenantId: String(checkout.tenantId),
          planName: checkout.planName,
        });
      }

      return apiSuccess({
        checkout,
        completed,
        statusCode,
        message,
      });
    }

    if (!planId) {
      return apiError("Plan is required", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(planId)) {
      return apiError("Invalid plan id", 400);
    }

    const [plan, tenant] = await Promise.all([
      Plan.findById(planId).lean(),
      Tenant.findById(session.tenantId).lean(),
    ]);

    if (!plan || !plan.isActive) {
      return apiError("Plan not found", 404);
    }

    if (
      String(tenant?.plan || "").toLowerCase() ===
      String(plan.name || "").toLowerCase()
    ) {
      return businessError(
        "You are already subscribed to this plan.",
        "PLAN_ALREADY_ACTIVE",
        409,
      );
    }

    const workflow = resolveSubscriptionWorkflow({
      name: plan.name,
      price: plan.price,
      isActive: plan.isActive,
    });

    if (workflow.workflow !== "gateway") {
      return businessError(
        workflow.message,
        "PLAN_CONTACT_SALES_REQUIRED",
        422,
        {
          checkoutWorkflow: workflow.workflow,
          reason: workflow.reason,
          gatewayLimit: workflow.gatewayLimit,
          planName: plan.name,
        },
      );
    }

    if (plan.price == null || plan.price <= 0) {
      return apiError(
        "This plan requires custom pricing. Please contact sales.",
        400,
      );
    }

    if (!tenant) {
      return apiError("Tenant not found", 404);
    }

    const customerEmail = (session.email || tenant.email || "").trim();
    if (!customerEmail) {
      return apiError("Account email is required for plan checkout", 400);
    }

    const consumerKey = process.env.PESAPAL_CONSUMER_KEY?.trim();
    const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET?.trim();

    if (!consumerKey || !consumerSecret) {
      return apiError("Pesapal credentials are not configured", 400);
    }

    const appUrl = new URL(request.url).origin;
    const callbackToken =
      process.env.PESAPAL_SUBSCRIPTION_CALLBACK_TOKEN?.trim() ||
      process.env.PESAPAL_CALLBACK_TOKEN?.trim() ||
      "";
    const callbackUrl = callbackToken
      ? `${appUrl}/api/integrations/pesapal/subscription-callback?token=${encodeURIComponent(callbackToken)}`
      : `${appUrl}/api/integrations/pesapal/subscription-callback`;

    const notificationId =
      process.env.PESAPAL_IPN_ID?.trim() ||
      (await PesapalService.registerIpn(callbackUrl));

    const reference = `SUB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const gatewayResponse = await PesapalService.submitOrderRequest({
      id: reference,
      amount: Number(plan.price),
      currency: plan.currency || "UGX",
      description: `Subscription payment for ${plan.name}`,
      callback_url: callbackUrl,
      notification_id: notificationId,
      billing_address: {
        email_address: customerEmail,
        phone_number: tenant.phone || undefined,
        first_name: session.name || tenant.name || "Customer",
        last_name: "",
      },
    });

    const checkoutUrl = readCheckoutUrl(gatewayResponse);
    const trackingId = readTrackingId(gatewayResponse);

    if (!checkoutUrl) {
      const gatewayError = readGatewayError(gatewayResponse);
      console.error("Pesapal checkout URL missing", {
        reference,
        gatewayResponse,
      });
      return businessError(
        gatewayError
          ? `Pesapal checkout was not created: ${gatewayError}`
          : "Pesapal checkout was not created. Verify IPN/callback configuration.",
        "CHECKOUT_URL_MISSING",
        502,
      );
    }

    const checkout = await SubscriptionCheckout.create({
      tenantId: session.tenantId,
      planId: plan._id,
      planName: plan.name,
      amount: Number(plan.price),
      currency: plan.currency || "UGX",
      provider: "pesapal",
      status: "initiated",
      reference,
      trackingId,
      checkoutUrl,
      customerEmail,
      raw: gatewayResponse as Record<string, unknown>,
    });

    return apiSuccess(
      {
        checkout,
        checkoutUrl,
        message: "Checkout created. Complete payment to activate your plan.",
      },
      201,
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const normalized = message.toLowerCase();

    if (
      normalized.includes("amount_exceeds_default_limit") ||
      normalized.includes("transaction amount exceeds limit") ||
      normalized.includes("contractual_error")
    ) {
      return businessError(
        "Checkout amount exceeds your current Pesapal account limit. Use Contact Sales or ask Pesapal support to raise the limit.",
        "PESAPAL_LIMIT",
        422,
      );
    }

    return apiError(message, 500);
  }
}
