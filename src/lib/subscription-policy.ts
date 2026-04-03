export type SubscriptionWorkflow = "gateway" | "contact_sales" | "unavailable";

export type SubscriptionWorkflowReason =
  | "active_plan"
  | "custom_pricing"
  | "assisted_tier"
  | "gateway_limit"
  | "inactive_plan"
  | "unsupported_price"
  | "plan_expired"
  | "plan_expiring_soon";

export interface SubscriptionWorkflowResult {
  workflow: SubscriptionWorkflow;
  reason: SubscriptionWorkflowReason;
  message: string;
  gatewayLimit?: number;
}

export interface SubscriptionPolicyPlan {
  name?: string;
  price?: number | null;
  isActive?: boolean;
}

function readGatewayLimit() {
  const value =
    process.env.PESAPAL_SUBSCRIPTION_MAX_AMOUNT ||
    process.env.PESAPAL_DEFAULT_LIMIT ||
    process.env.PESAPAL_TRANSACTION_LIMIT ||
    "";
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function resolveSubscriptionWorkflow(
  plan: SubscriptionPolicyPlan,
): SubscriptionWorkflowResult {
  const name = String(plan.name || "")
    .toLowerCase()
    .trim();
  const price =
    plan.price == null || Number.isNaN(Number(plan.price))
      ? null
      : Number(plan.price);
  const gatewayLimit = readGatewayLimit();

  if (plan.isActive === false) {
    return {
      workflow: "unavailable",
      reason: "inactive_plan",
      message: "This plan is not available for purchase right now.",
      gatewayLimit,
    };
  }

  if (price == null || price <= 0) {
    return {
      workflow: "contact_sales",
      reason: "custom_pricing",
      message: "This plan uses custom pricing and is handled by sales.",
      gatewayLimit,
    };
  }

  if (name === "corporate" || name === "enterprise") {
    return {
      workflow: "contact_sales",
      reason: "assisted_tier",
      message: "This tier uses assisted onboarding and is handled by sales.",
      gatewayLimit,
    };
  }

  if (gatewayLimit && price > gatewayLimit) {
    return {
      workflow: "contact_sales",
      reason: "gateway_limit",
      message:
        "Plan amount exceeds the current Pesapal checkout limit. Use contact sales.",
      gatewayLimit,
    };
  }

  return {
    workflow: "gateway",
    reason: "active_plan",
    message: "Plan can be purchased through gateway checkout.",
    gatewayLimit,
  };
}

/**
 * Check plan expiry status and return appropriate policy
 * Used to enforce limits on expired plans and warn about expiring plans
 */
export function checkPlanExpiryStatus(
  expiryDate: Date | null,
  planName: string,
): { isExpired: boolean; daysRemaining: number; message?: string } {
  if (!expiryDate) {
    return { isExpired: false, daysRemaining: Infinity };
  }

  const now = new Date();
  const msRemaining = new Date(expiryDate).getTime() - now.getTime();
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

  if (msRemaining <= 0) {
    return {
      isExpired: true,
      daysRemaining: 0,
      message: `${planName} plan has expired. Features limited to Basic plan. Renew immediately.`,
    };
  }

  if (daysRemaining <= 7) {
    return {
      isExpired: false,
      daysRemaining,
      message: `${planName} plan expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}. Renew soon.`,
    };
  }

  return { isExpired: false, daysRemaining };
}
