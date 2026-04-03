import Plan from "@/models/Plan";
import Tenant from "@/models/Tenant";

export type PlanEntitlements = {
  planName: string;
  maxUsers: number | null;
  maxBranches: number | null;
  maxProducts: number | null;
  maxCustomers: number | null;
  features: string[];
  isExpired: boolean; // true if plan has reached expiry date
  expiryDate: Date | null;
};

export type ResourceCap = "users" | "branches" | "products" | "customers";

type PlanDefaults = Pick<
  PlanEntitlements,
  "maxUsers" | "maxBranches" | "maxProducts" | "maxCustomers"
>;

const DEFAULT_PLAN_LIMITS: Record<string, PlanDefaults> = {
  basic: { maxUsers: 1, maxBranches: 1, maxProducts: null, maxCustomers: null },
  premium: {
    maxUsers: null,
    maxBranches: null,
    maxProducts: null,
    maxCustomers: null,
  },
  professional: {
    maxUsers: null,
    maxBranches: null,
    maxProducts: null,
    maxCustomers: null,
  },
  corporate: {
    maxUsers: null,
    maxBranches: 4,
    maxProducts: null,
    maxCustomers: null,
  },
  enterprise: {
    maxUsers: null,
    maxBranches: 7,
    maxProducts: null,
    maxCustomers: null,
  },
};

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizePlanName(planName?: string | null) {
  const normalized = (planName || "basic").trim().toLowerCase();
  return normalized || "basic";
}

function getDefaultLimits(planName: string): PlanDefaults {
  return DEFAULT_PLAN_LIMITS[planName] || DEFAULT_PLAN_LIMITS.basic;
}

function toNumberOrNull(value: unknown, fallback: number | null) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }
  if (value === null) {
    return null;
  }
  return fallback;
}

export async function resolveTenantPlanEntitlements(
  tenantId: string,
): Promise<PlanEntitlements> {
  const tenant = await Tenant.findById(tenantId)
    .select("plan planExpiry")
    .lean();
  const normalizedPlan = normalizePlanName(tenant?.plan);
  const expiryDate = tenant?.planExpiry ? new Date(tenant.planExpiry) : null;
  const now = new Date();
  const isExpired = expiryDate && expiryDate < now;

  // If plan is expired, revert to basic limits to prevent abuse
  const effectivePlan = isExpired ? "basic" : normalizedPlan;
  const defaults = getDefaultLimits(effectivePlan);

  const matchingPlan = await Plan.findOne({
    name: new RegExp(`^${escapeRegExp(effectivePlan)}$`, "i"),
  })
    .select("name maxUsers maxBranches maxProducts maxCustomers features")
    .lean();

  if (!matchingPlan) {
    return {
      planName: effectivePlan,
      maxUsers: defaults.maxUsers,
      maxBranches: defaults.maxBranches,
      maxProducts: defaults.maxProducts,
      maxCustomers: defaults.maxCustomers,
      features: [],
      isExpired: !!isExpired,
      expiryDate: expiryDate,
    };
  }

  return {
    planName: normalizePlanName(matchingPlan.name),
    maxUsers: toNumberOrNull(matchingPlan.maxUsers, defaults.maxUsers),
    maxBranches: toNumberOrNull(matchingPlan.maxBranches, defaults.maxBranches),
    maxProducts: toNumberOrNull(matchingPlan.maxProducts, defaults.maxProducts),
    maxCustomers: toNumberOrNull(
      matchingPlan.maxCustomers,
      defaults.maxCustomers,
    ),
    features: Array.isArray(matchingPlan.features)
      ? matchingPlan.features.filter(
          (feature): feature is string => typeof feature === "string",
        )
      : [],
    isExpired: !!isExpired,
    expiryDate: expiryDate,
  };
}

export function formatResourceLimitMessage(
  resource: ResourceCap,
  planName: string,
  limit: number | null,
): string {
  const labels: Record<ResourceCap, string> = {
    users: "active user",
    branches: "active branch",
    products: "product",
    customers: "customer",
  };

  const label = labels[resource];
  if (limit === null) {
    return `Unlimited ${label}s`;
  }

  return `${planName.toUpperCase()} plan allows up to ${limit} ${label}${limit === 1 ? "" : "s"}. Upgrade your plan to add more.`;
}

export function getResourceCapKey(
  resource: ResourceCap,
): keyof PlanEntitlements {
  const capKeys: Record<ResourceCap, keyof PlanEntitlements> = {
    users: "maxUsers",
    branches: "maxBranches",
    products: "maxProducts",
    customers: "maxCustomers",
  };
  return capKeys[resource];
}

/**
 * Check if a plan is expiring within X days (grace period for warning)
 * @param expiryDate - The plan expiry date
 * @param gracePeriodDays - Number of days to consider "expiring soon" (default: 7)
 * @returns true if plan expires within the grace period
 */
export function isPlanExpiringWithinGracePeriod(
  expiryDate: Date | null,
  gracePeriodDays: number = 7,
): boolean {
  if (!expiryDate) return false;
  const now = new Date();
  const gracePeriodEnd = new Date(
    now.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000,
  );
  return expiryDate <= gracePeriodEnd && expiryDate > now;
}

/**
 * Format an expiry warning message for the UI
 * @param daysRemaining - Number of days until expiry
 * @returns User-friendly expiry warning message
 */
export function formatExpiryWarning(daysRemaining: number): string {
  if (daysRemaining <= 0) {
    return "Your plan has expired. Features have been limited to Basic plan limits. Please renew to restore full access.";
  }
  if (daysRemaining === 1) {
    return "Your plan expires tomorrow. Please renew to avoid interruption.";
  }
  return `Your plan expires in ${daysRemaining} days. Renew now to maintain uninterrupted access.`;
}

/**
 * Calculate days remaining until plan expiry
 * @param expiryDate - The plan expiry date
 * @returns Number of days remaining (can be negative if expired)
 */
export function getDaysUntilPlanExpiry(expiryDate: Date | null): number {
  if (!expiryDate) return Infinity;
  const now = new Date();
  const msRemaining = new Date(expiryDate).getTime() - now.getTime();
  return Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
}
