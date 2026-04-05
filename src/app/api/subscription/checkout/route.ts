import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api-helpers";
import { getSession } from "@/lib/auth";
import Plan from "@/models/Plan";
import Tenant from "@/models/Tenant";
import SubscriptionCheckout from "@/models/SubscriptionCheckout";
import { SiliconPayService } from "@/lib/silicon-pay";
import { resolveSubscriptionWorkflow } from "@/lib/subscription-policy";

type BillingCycle = "monthly" | "annual" | "biennial";

const BILLING_CYCLE_CONFIG: Record<
  BillingCycle,
  { months: number; discountRate: number }
> = {
  monthly: { months: 1, discountRate: 0 },
  annual: { months: 12, discountRate: 0.05 },
  biennial: { months: 24, discountRate: 0.1 },
};

const COMPLETED_STATUSES = new Set([
  "COMPLETED",
  "PAID",
  "SUCCESS",
  "APPROVED",
  "OK",
  "1",
]);
const FAILED_STATUSES = new Set([
  "FAILED",
  "FAIL",
  "DECLINED",
  "CANCELLED",
  "CANCELED",
  "ERROR",
  "REJECTED",
  "UNSUCCESSFUL",
  "0",
]);

function parseBillingCycle(input: unknown): BillingCycle {
  const raw = String(input || "monthly")
    .toLowerCase()
    .trim();
  if (raw === "annual" || raw === "biennial" || raw === "monthly") {
    return raw;
  }
  return "monthly";
}

function addMonths(baseDate: Date, months: number) {
  const next = new Date(baseDate);
  next.setMonth(next.getMonth() + months);
  return next;
}

function buildBillingQuote(monthlyPrice: number, cycle: BillingCycle) {
  const config = BILLING_CYCLE_CONFIG[cycle];
  const baseTotal = monthlyPrice * config.months;
  const discountedTotal = Number(
    (baseTotal * (1 - config.discountRate)).toFixed(2),
  );
  const savingsAmount = Number((baseTotal - discountedTotal).toFixed(2));

  return {
    months: config.months,
    discountRate: config.discountRate,
    amount: discountedTotal,
    savingsAmount,
    baseMonthlyPrice: monthlyPrice,
  };
}

function readStatusCode(statusResult: unknown) {
  const payload = statusResult as {
    status?: string;
    payment_status?: string;
    state?: string;
    payment_status_code?: string;
    status_code?: string | number;
  } | null;

  return String(
    payload?.status ||
      payload?.payment_status ||
      payload?.state ||
      payload?.payment_status_code ||
      payload?.status_code ||
      "",
  )
    .toUpperCase()
    .trim();
}

function resolveCheckoutStatus(statusResult: unknown) {
  const statusCode = readStatusCode(statusResult);
  return {
    statusCode,
    completed: COMPLETED_STATUSES.has(statusCode),
    failed: FAILED_STATUSES.has(statusCode),
  };
}

function readStatusMessage(statusResult: unknown) {
  const payload = statusResult as {
    message?: string;
    error?: string;
    payment_status_description?: string;
    status_description?: string;
    description?: string;
    status?: string;
  } | null;

  return (
    payload?.message ||
    payload?.error ||
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
    source.hosted_link,
    source.hostedLink,
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
    nested?.hosted_link,
    nested?.hostedLink,
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
    source.error_description,
    source.status,
    nested?.message,
    nested?.error,
    nested?.status,
  ];

  return candidates.find(
    (value) => typeof value === "string" && value.trim(),
  ) as string | undefined;
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
    source.txRef,
    source.tx_ref,
    source.txId,
    source.reference,
    source.merchant_reference,
    nested?.order_tracking_id,
    nested?.orderTrackingId,
    nested?.transactionId,
    nested?.transaction_id,
    nested?.txRef,
    nested?.tx_ref,
    nested?.txId,
    nested?.reference,
    nested?.merchant_reference,
  ];

  return candidates.find(
    (value) => typeof value === "string" && value.trim(),
  ) as string | undefined;
}

function splitDisplayName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return { firstName: "Customer", lastName: "" };
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function isLocalHost(hostname: string) {
  const value = hostname.toLowerCase();
  return (
    value === "localhost" ||
    value === "127.0.0.1" ||
    value === "::1" ||
    value.endsWith(".local")
  );
}

function resolveCallbackBaseUrl(request: NextRequest) {
  const candidates = [
    process.env.SILICON_PAY_CALLBACK_BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.NEXTAUTH_URL,
    new URL(request.url).origin,
  ];

  for (const candidate of candidates) {
    if (!candidate?.trim()) continue;
    try {
      const parsed = new URL(candidate.trim());
      return parsed;
    } catch {
      continue;
    }
  }

  return new URL(request.url);
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

  if (!allowedPlans.has(normalizedPlan)) {
    return;
  }

  const now = new Date();
  const months =
    Number.isFinite(billingMonths) && (billingMonths || 0) > 0
      ? Number(billingMonths)
      : 1;
  const nextExpiry = addMonths(now, months);

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
      billingCycle: requestedBillingCycle,
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

      if (checkout.status === "failed") {
        return apiSuccess({
          checkout,
          completed: false,
          statusCode: "FAILED",
          message: checkout.errorMessage || "Payment was marked as failed.",
        });
      }

      const statusReference = checkout.trackingId || checkout.reference;
      const statusResult =
        await SiliconPayService.getTransactionStatus(statusReference);

      if (!statusResult) {
        return apiSuccess({
          checkout,
          completed: false,
          statusCode: "PENDING",
          message:
            "Payment is still pending. Complete the Silicon Pay prompt and wait for callback confirmation.",
        });
      }

      const { statusCode, completed, failed } =
        resolveCheckoutStatus(statusResult);
      const message = readStatusMessage(statusResult);

      if (!statusCode) {
        return apiSuccess({
          checkout,
          completed: false,
          statusCode: "PENDING",
          message: "Payment is pending callback confirmation from Silicon Pay.",
        });
      }

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
          billingMonths: checkout.billingMonths,
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

    const billingCycle = parseBillingCycle(requestedBillingCycle);
    const quote = buildBillingQuote(Number(plan.price), billingCycle);

    if (!tenant) {
      return apiError("Tenant not found", 404);
    }

    const customerEmail = (session.email || tenant.email || "").trim();
    if (!customerEmail) {
      return apiError("Account email is required for plan checkout", 400);
    }

    const siliconPayPublicKey = process.env.SILICON_PAY_PUBLIC_KEY?.trim();
    const siliconPayEncryptionKey =
      process.env.SILICON_PAY_ENCRYPTION_KEY?.trim();
    const checkoutMode = (
      process.env.SILICON_PAY_SUBSCRIPTION_CHECKOUT_MODE || "hosted"
    )
      .trim()
      .toLowerCase();

    if (!siliconPayPublicKey || !siliconPayEncryptionKey) {
      return apiError("Silicon Pay credentials are not configured", 400);
    }

    const tenantPhone = String(tenant.phone || "").trim();
    if (!tenantPhone && checkoutMode === "mobile_money") {
      return apiError(
        "Tenant phone number is required for Silicon Pay checkout",
        400,
      );
    }

    const { firstName, lastName } = splitDisplayName(
      session.name || tenant.name || "Customer",
    );

    const appUrl = resolveCallbackBaseUrl(request);
    if (checkoutMode === "hosted") {
      if (appUrl.protocol !== "https:" || isLocalHost(appUrl.hostname)) {
        return businessError(
          "Hosted Silicon Pay checkout requires a public HTTPS callback base URL. Set SILICON_PAY_CALLBACK_BASE_URL to your public app URL.",
          "SILICON_PAY_PUBLIC_CALLBACK_URL_REQUIRED",
          400,
        );
      }
    }

    const callbackToken =
      process.env.SILICON_PAY_SUBSCRIPTION_CALLBACK_TOKEN?.trim() ||
      process.env.SILICON_PAY_CALLBACK_TOKEN?.trim() ||
      "";
    const callbackUrl = callbackToken
      ? `${appUrl.origin}/api/integrations/silicon-pay/subscription-callback?token=${encodeURIComponent(callbackToken)}`
      : `${appUrl.origin}/api/integrations/silicon-pay/subscription-callback`;
    const redirectBase = `${appUrl.origin}/dashboard/subscription`;

    const reference = `SUB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const gatewayInput = {
      amount: quote.amount,
      phoneNumber: tenantPhone || undefined,
      email: customerEmail,
      firstName,
      lastName,
      txId: reference,
      reason: `Subscription payment for ${plan.name} (${billingCycle})`,
      currency: plan.currency || "UGX",
      callbackUrl,
      successUrl: `${redirectBase}?payment=success&reference=${encodeURIComponent(reference)}`,
      failureUrl: `${redirectBase}?payment=failed&reference=${encodeURIComponent(reference)}`,
    };

    let gatewayResponse: unknown;
    if (checkoutMode === "mobile_money") {
      gatewayResponse = await SiliconPayService.collect(gatewayInput, {
        siliconPayPublicKey,
        siliconPayEncryptionKey,
      });
    } else if (checkoutMode === "auto") {
      try {
        gatewayResponse = await SiliconPayService.collectHostedCheckout(
          gatewayInput,
          {
            siliconPayPublicKey,
            siliconPayEncryptionKey,
          },
        );
      } catch {
        gatewayResponse = await SiliconPayService.collect(gatewayInput, {
          siliconPayPublicKey,
          siliconPayEncryptionKey,
        });
      }
    } else {
      gatewayResponse = await SiliconPayService.collectHostedCheckout(
        gatewayInput,
        {
          siliconPayPublicKey,
          siliconPayEncryptionKey,
        },
      );
    }

    const checkoutUrl = readCheckoutUrl(gatewayResponse);
    const trackingId = readTrackingId(gatewayResponse) || reference;
    const immediateStatus = resolveCheckoutStatus(gatewayResponse);
    const immediateError = readGatewayError(gatewayResponse);

    const checkout = await SubscriptionCheckout.create({
      tenantId: session.tenantId,
      planId: plan._id,
      planName: plan.name,
      amount: quote.amount,
      baseMonthlyPrice: quote.baseMonthlyPrice,
      billingCycle,
      billingMonths: quote.months,
      discountRate: quote.discountRate,
      savingsAmount: quote.savingsAmount,
      currency: plan.currency || "UGX",
      provider: "silicon_pay",
      status: immediateStatus.completed
        ? "completed"
        : immediateStatus.failed
          ? "failed"
          : "initiated",
      reference,
      trackingId,
      checkoutUrl,
      customerEmail,
      errorMessage: immediateStatus.failed
        ? immediateError || "Payment was not completed"
        : undefined,
      raw: gatewayResponse as Record<string, unknown>,
      activatedAt: immediateStatus.completed ? new Date() : undefined,
    });

    if (immediateStatus.completed) {
      await activateTenantPlan({
        tenantId: String(checkout.tenantId),
        planName: checkout.planName,
        billingMonths: checkout.billingMonths,
      });
    }

    return apiSuccess(
      {
        checkout,
        checkoutUrl,
        message: immediateStatus.completed
          ? "Payment confirmed and plan activated."
          : immediateStatus.failed
            ? "Payment request created but marked as failed. Please try again."
            : checkoutUrl
              ? "Silicon Pay payment page created. Complete payment to activate your plan."
              : "Silicon Pay mobile payment prompt sent. Approve it on your phone to activate your plan.",
      },
      201,
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const normalized = message.toLowerCase();

    if (normalized.includes("public key not configured")) {
      return apiError("Silicon Pay public key is not configured", 400);
    }

    if (normalized.includes("silicon pay collection failed")) {
      const gatewayMessage = message.replace(
        /^Silicon Pay Collection Failed:\s*/i,
        "",
      );
      return businessError(
        gatewayMessage ||
          "Silicon Pay checkout request failed. Please verify gateway configuration and try again.",
        "SILICON_PAY_REQUEST_FAILED",
        502,
        { gatewayMessage: gatewayMessage || message },
      );
    }

    return apiError(message, 500);
  }
}
