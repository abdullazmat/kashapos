"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  BadgeCheck,
  CheckCircle2,
  CircleX,
  CreditCard,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Wallet,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useSession } from "../layout";

type Plan = {
  _id: string;
  name: string;
  description: string;
  price: number | null;
  currency: string;
  period: string;
  features: string[];
  ctaText?: string;
  isPopular?: boolean;
  checkoutWorkflow?: "gateway" | "contact_sales" | "unavailable";
  workflowReason?: string;
  workflowMessage?: string;
  gatewayLimit?: number;
};

type Checkout = {
  _id: string;
  reference: string;
  planName: string;
  amount: number;
  billingCycle?: "monthly" | "annual" | "biennial";
  billingMonths?: number;
  discountRate?: number;
  savingsAmount?: number;
  currency: string;
  status: "initiated" | "completed" | "failed";
  checkoutUrl?: string;
  paymentFlow?: "direct_prompt" | "hosted_web";
  errorMessage?: string;
  createdAt: string;
};

type TenantBilling = {
  plan?: string;
  planExpiry?: string;
};

type RecheckOptions = {
  silent?: boolean;
};

type BillingCycle = "monthly" | "annual" | "biennial";

const BILLING_CYCLE_META: Record<
  BillingCycle,
  { label: string; months: number; discountRate: number }
> = {
  monthly: { label: "Monthly", months: 1, discountRate: 0 },
  annual: { label: "Annual Auto-Bill", months: 12, discountRate: 0.05 },
  biennial: { label: "2-Year Auto-Bill", months: 24, discountRate: 0.1 },
};

function getCyclePricing(monthlyPrice: number, cycle: BillingCycle) {
  const meta = BILLING_CYCLE_META[cycle];
  const baseTotal = monthlyPrice * meta.months;
  const total = Number((baseTotal * (1 - meta.discountRate)).toFixed(2));
  const savings = Number((baseTotal - total).toFixed(2));
  return {
    ...meta,
    baseTotal,
    total,
    savings,
    effectiveMonthly: Number((total / meta.months).toFixed(2)),
  };
}

const statusTone: Record<Checkout["status"], string> = {
  initiated: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
  completed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
  failed: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20",
};

function getReadableCheckoutError(message: string) {
  const raw = String(message || "").trim();
  if (!raw) {
    return "We could not start Silicon Pay checkout. Please try again.";
  }

  const lowered = raw.toLowerCase();
  if (
    lowered.includes("403 forbidden") ||
    lowered.includes("you don't have permission")
  ) {
    return "Silicon Pay blocked this checkout request (403). Please contact support to enable your merchant account/API access.";
  }

  if (lowered.includes("invalid email")) {
    return "Silicon Pay rejected the customer email address. Please update the account email and try again.";
  }

  if (lowered.includes("hosted checkout is unavailable")) {
    return "Hosted web checkout is not enabled for this Silicon Pay account. Ask Silicon Pay support to enable hosted/card checkout or switch checkout mode to mobile money.";
  }

  if (lowered.includes("silicon pay collection failed")) {
    const cleaned = raw
      .replace(/^silicon pay collection failed:\s*/i, "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (cleaned.toLowerCase().includes("403 forbidden")) {
      return "Silicon Pay blocked this checkout request (403). Please contact support to enable your merchant account/API access.";
    }

    return cleaned || "Silicon Pay checkout failed. Please try again.";
  }

  const withoutHtml = raw
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!withoutHtml) {
    return "Silicon Pay checkout failed. Please try again.";
  }

  return withoutHtml;
}

export default function SubscriptionPage() {
  const { tenant } = useSession();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [tenantBilling, setTenantBilling] = useState<TenantBilling | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(
    null,
  );
  const [recheckingRef, setRecheckingRef] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [showContactSales, setShowContactSales] = useState(false);
  const [sendingContactSales, setSendingContactSales] = useState(false);
  const [selectedCustomPlan, setSelectedCustomPlan] = useState<Plan | null>(
    null,
  );
  const [showCheckoutPhoneModal, setShowCheckoutPhoneModal] = useState(false);
  const [selectedCheckoutPlan, setSelectedCheckoutPlan] = useState<Plan | null>(
    null,
  );
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [contactSalesForm, setContactSalesForm] = useState({
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    companyName: tenant?.name || "",
    message: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<"mobile_money" | "card">("mobile_money");
  const autoPollRef = useRef<number | null>(null);

  const activePendingCheckout = useMemo(
    () => checkouts.find((item) => item.status === "initiated"),
    [checkouts],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, checkoutRes] = await Promise.all([
        fetch("/api/subscription/plans", { cache: "no-store" }),
        fetch("/api/subscription/checkout", { cache: "no-store" }),
      ]);

      const plansData = await plansRes.json();
      const checkoutData = await checkoutRes.json();

      if (!plansRes.ok) {
        throw new Error(
          plansData.error || plansData.message || "Failed to load plans",
        );
      }
      if (!checkoutRes.ok) {
        throw new Error(
          checkoutData.error ||
            checkoutData.message ||
            "Failed to load subscription data",
        );
      }

      const resolvedPlans = (plansData.data || plansData || []) as Plan[];
      const resolvedCheckouts = (checkoutData.checkouts ||
        checkoutData.data?.checkouts ||
        []) as Checkout[];
      const resolvedTenant = (checkoutData.tenant ||
        checkoutData.data?.tenant ||
        null) as TenantBilling | null;

      setPlans(resolvedPlans);
      setCheckouts(resolvedCheckouts);
      setTenantBilling(resolvedTenant);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load subscription data";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleSubscribe(plan: Plan, phoneNumber?: string) {
    setSubscribingPlanId(plan._id);
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan._id,
          billingCycle,
          phoneNumber: (phoneNumber || "").trim() || undefined,
          paymentMethod,
        }),
      });
      const payload = await res.json();

      if (!res.ok) {
        const backendCode = String(payload.code || "");
        const backendMessage = getReadableCheckoutError(
          payload.error || payload.message || "Failed to start checkout",
        );

        if (
          backendCode === "PLAN_CONTACT_SALES_REQUIRED" ||
          backendCode === "SILICON_PAY_LIMIT" ||
          backendMessage.toLowerCase().includes("amount exceeds") ||
          backendMessage.toLowerCase().includes("amount_exceeds_default_limit")
        ) {
          toast.error(backendMessage);
          openContactSales(plan);
          return;
        }

        if (backendCode === "PLAN_ALREADY_ACTIVE") {
          toast(backendMessage);
          return;
        }

        throw new Error(backendMessage);
      }

      const checkout: Checkout =
        payload.checkout || payload.data?.checkout || payload.data || payload;
      const checkoutUrl: string | undefined =
        payload.checkoutUrl ||
        payload.data?.checkoutUrl ||
        checkout.checkoutUrl;
      const phoneSavedForFutureCheckouts = Boolean(
        payload.phoneSavedForFutureCheckouts ||
        payload.data?.phoneSavedForFutureCheckouts,
      );
      const autoFallbackApplied = Boolean(
        payload.autoFallbackApplied || payload.data?.autoFallbackApplied,
      );

      setCheckouts((current) => [
        checkout,
        ...current.filter((item) => item._id !== checkout._id),
      ]);
      toast.success(
        payload.message ||
          (checkoutUrl
            ? "Checkout page created. Complete payment to activate the plan."
            : "Mobile payment prompt sent. Approve it on your phone to activate the plan."),
      );
      if (autoFallbackApplied) {
        toast(
          "Hosted Silicon Pay checkout was unavailable, so we switched to mobile money prompt.",
          { icon: "ℹ️" },
        );
      }
      if (phoneSavedForFutureCheckouts) {
        toast.success("Phone saved for future checkouts");
      }

      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
      }
    } catch (error) {
      const message = getReadableCheckoutError(
        error instanceof Error ? error.message : "Failed to start checkout",
      );
      if (
        message.includes("SILICON_PAY_LIMIT") ||
        message.toLowerCase().includes("amount exceeds") ||
        message.toLowerCase().includes("amount_exceeds_default_limit")
      ) {
        toast.error(
          "This plan amount exceeds your Silicon Pay limit. Use Contact Sales while limit upgrade is processed.",
        );
        openContactSales(plan);
        return;
      }
      toast.error(message);
    } finally {
      setSubscribingPlanId(null);
    }
  }

  function startCheckoutWithPhone(plan: Plan) {
    setSelectedCheckoutPlan(plan);
    setCheckoutPhone(
      String(tenant?.settings?.phoneNumber || checkoutPhone || "").trim(),
    );
    setShowCheckoutPhoneModal(true);
  }

  function closeCheckoutPhoneModal() {
    if (
      selectedCheckoutPlan &&
      subscribingPlanId === selectedCheckoutPlan._id
    ) {
      return;
    }
    setShowCheckoutPhoneModal(false);
    setSelectedCheckoutPlan(null);
  }

  async function submitCheckoutWithPhone() {
    if (!selectedCheckoutPlan) return;

    const enteredPhone = checkoutPhone.trim();
    if (!enteredPhone && paymentMethod === "mobile_money") {
      toast.error("Mobile number is required for Mobile Money prompts.");
      return;
    }

    setShowCheckoutPhoneModal(false);
    const planToCheckout = selectedCheckoutPlan;
    setSelectedCheckoutPlan(null);
    await handleSubscribe(planToCheckout, enteredPhone);
  }

  const handleRecheck = useCallback(
    async (reference: string, options?: RecheckOptions) => {
      setRecheckingRef(reference);
      try {
        const existing = checkouts.find((item) => item.reference === reference);
        const res = await fetch("/api/subscription/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "recheck", reference }),
        });
        const payload = await res.json();

        if (!res.ok) {
          throw new Error(
            payload.error || payload.message || "Failed to recheck payment",
          );
        }

        const checkout: Checkout =
          payload.checkout || payload.data?.checkout || payload.data || payload;

        setCheckouts((current) =>
          current.map((item) =>
            item.reference === reference ? checkout : item,
          ),
        );

        const nowStatus = checkout.status;
        const prevStatus = existing?.status;

        if (!options?.silent || (prevStatus && prevStatus !== nowStatus)) {
          if (payload.completed) {
            toast.success(
              payload.message || "Payment verified and plan activated.",
            );
          } else if (
            String(payload.statusCode || "")
              .toUpperCase()
              .includes("FAIL")
          ) {
            toast.error(payload.message || "Payment failed.");
          } else if (!options?.silent) {
            toast(payload.message || "Payment is still pending.");
          }
        }

        await loadData();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to recheck payment";
        if (!options?.silent) {
          toast.error(message);
        }
      } finally {
        setRecheckingRef(null);
      }
    },
    [checkouts, loadData],
  );

  function openContactSales(plan: Plan) {
    setSelectedCustomPlan(plan);
    setContactSalesForm((current) => ({
      ...current,
      companyName: current.companyName || tenant?.name || "",
      message:
        current.message ||
        `We need custom pricing details for the ${plan.name} plan.`,
    }));
    setShowContactSales(true);
  }

  async function submitContactSales() {
    if (!selectedCustomPlan) return;

    const contactName = contactSalesForm.contactName.trim();
    const contactEmail = contactSalesForm.contactEmail.trim();
    if (!contactName || !contactEmail) {
      toast.error("Contact name and email are required.");
      return;
    }

    setSendingContactSales(true);
    try {
      const res = await fetch("/api/subscription/contact-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedCustomPlan._id,
          planName: selectedCustomPlan.name,
          contactName,
          contactEmail,
          contactPhone: contactSalesForm.contactPhone,
          companyName: contactSalesForm.companyName,
          message: contactSalesForm.message,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(
          payload.error || payload.message || "Failed to submit request",
        );
      }

      toast.success(
        payload.message || "Request sent. Sales team will contact you.",
      );
      setShowContactSales(false);
      setContactSalesForm((current) => ({
        ...current,
        message: "",
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to submit request";
      toast.error(message);
    } finally {
      setSendingContactSales(false);
    }
  }

  useEffect(() => {
    if (autoPollRef.current) {
      window.clearInterval(autoPollRef.current);
      autoPollRef.current = null;
    }

    if (!activePendingCheckout || recheckingRef) {
      return;
    }

    autoPollRef.current = window.setInterval(() => {
      void handleRecheck(activePendingCheckout.reference, { silent: true });
    }, 20000);

    return () => {
      if (autoPollRef.current) {
        window.clearInterval(autoPollRef.current);
        autoPollRef.current = null;
      }
    };
  }, [activePendingCheckout, recheckingRef, handleRecheck]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                <Sparkles className="h-3.5 w-3.5" />
                Subscription
              </div>
              <h1 className="mt-3 text-2xl font-black text-gray-900 md:text-3xl">
                Upgrade Your Plan
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Buy a plan, complete secure checkout, and verify payment status
                from one screen.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Current Plan
              </p>
              <p className="mt-1 text-base font-black text-gray-900 capitalize">
                {tenantBilling?.plan || tenant?.plan || "basic"}
              </p>
              {tenantBilling?.planExpiry && (
                <p className="text-xs text-gray-500">
                  Expires{" "}
                  {new Date(tenantBilling.planExpiry).toLocaleDateString(
                    "en-UG",
                  )}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Billing Cycle
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
            {(Object.keys(BILLING_CYCLE_META) as BillingCycle[]).map(
              (cycle) => {
                const active = billingCycle === cycle;
                return (
                  <button
                    key={cycle}
                    type="button"
                    onClick={() => setBillingCycle(cycle)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? "border-blue-500 bg-white ring-2 ring-blue-500/20"
                        : "border-blue-100 bg-white/80 hover:border-blue-300"
                    }`}
                  >
                    <p className="text-sm font-bold text-gray-900">
                      {BILLING_CYCLE_META[cycle].label}
                    </p>
                    <p className="text-xs text-gray-500">
                      {BILLING_CYCLE_META[cycle].discountRate > 0
                        ? `Save ${Math.round(BILLING_CYCLE_META[cycle].discountRate * 100)}% vs monthly total`
                        : "No discount applied"}
                    </p>
                  </button>
                );
              },
            )}
          </div>
        </div>

        {activePendingCheckout && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Payment Pending
                </p>
                <p className="mt-1 text-sm font-semibold text-amber-900">
                  {activePendingCheckout.planName} •{" "}
                  {activePendingCheckout.reference}
                </p>
                <p className="text-xs text-amber-700">
                  Complete the Silicon Pay prompt and recheck status to activate
                  this plan.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {activePendingCheckout.checkoutUrl && (
                  <button
                    onClick={() =>
                      window.open(
                        activePendingCheckout.checkoutUrl,
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Checkout
                  </button>
                )}
                <button
                  onClick={() => handleRecheck(activePendingCheckout.reference)}
                  disabled={recheckingRef === activePendingCheckout.reference}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      recheckingRef === activePendingCheckout.reference
                        ? "animate-spin"
                        : ""
                    }`}
                  />
                  {recheckingRef === activePendingCheckout.reference
                    ? "Rechecking..."
                    : "Recheck Status"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {loading && (
            <div className="col-span-full rounded-2xl border border-gray-200 bg-white p-10 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-500" />
              <p className="mt-3 text-sm text-gray-500">Loading plans...</p>
            </div>
          )}

          {!loading &&
            plans.map((plan) => {
              const isCurrent =
                (tenantBilling?.plan || tenant?.plan || "").toLowerCase() ===
                plan.name.toLowerCase();
              const subscribing = subscribingPlanId === plan._id;
              const isCustom = plan.price == null;
              const cyclePricing =
                plan.price == null
                  ? null
                  : getCyclePricing(Number(plan.price), billingCycle);

              return (
                <article
                  key={plan._id}
                  className={`relative overflow-hidden rounded-3xl border p-6 shadow-sm transition-all ${
                    plan.isPopular
                      ? "border-orange-300 bg-linear-to-b from-orange-50 to-white"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  {plan.isPopular && (
                    <span className="absolute right-4 top-4 rounded-full bg-orange-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                      Most Popular
                    </span>
                  )}

                  <h2 className="text-xl font-black text-gray-900">
                    {plan.name}
                  </h2>
                  <p className="mt-1 min-h-10 text-sm text-gray-500">
                    {plan.description}
                  </p>

                  <div className="mt-5 flex items-end gap-2">
                    <p className="text-3xl font-black text-gray-900">
                      {cyclePricing == null
                        ? "Custom"
                        : formatCurrency(
                            cyclePricing.total,
                            plan.currency || "UGX",
                          )}
                    </p>
                    <p className="mb-1 text-sm text-gray-400">
                      {cyclePricing == null
                        ? ""
                        : cyclePricing.months === 1
                          ? "per month"
                          : `for ${cyclePricing.months} months`}
                    </p>
                  </div>

                  {cyclePricing && cyclePricing.discountRate > 0 && (
                    <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                      <p className="font-semibold">
                        You save{" "}
                        {formatCurrency(
                          cyclePricing.savings,
                          plan.currency || "UGX",
                        )}
                      </p>
                      <p>
                        Effective monthly:{" "}
                        {formatCurrency(
                          cyclePricing.effectiveMonthly,
                          plan.currency || "UGX",
                        )}
                      </p>
                    </div>
                  )}

                  <ul className="mt-5 space-y-2">
                    {plan.features.slice(0, 8).map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm text-gray-600"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 space-y-2">
                    <button
                      onClick={() => {
                        if (isCurrent) {
                          toast("You are already on this plan.");
                          return;
                        }
                        if (
                          isCustom ||
                          plan.checkoutWorkflow === "contact_sales"
                        ) {
                          if (plan.workflowMessage) {
                            toast(plan.workflowMessage);
                          }
                          openContactSales(plan);
                          return;
                        }
                        if (plan.checkoutWorkflow === "unavailable") {
                          toast.error(
                            plan.workflowMessage ||
                              "This plan is not available right now.",
                          );
                          return;
                        }
                        startCheckoutWithPhone(plan);
                      }}
                      disabled={subscribing}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors disabled:opacity-60 ${
                        isCurrent
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {subscribing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isCurrent ? (
                        <BadgeCheck className="h-4 w-4" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                      {isCurrent
                        ? "Current Plan"
                        : isCustom || plan.checkoutWorkflow === "contact_sales"
                          ? "Contact Sales"
                          : "Buy Plan"}
                    </button>

                    {!isCurrent && !isCustom && (
                      <p className="text-[11px] text-gray-400">
                        {plan.checkoutWorkflow === "gateway"
                          ? `Secure checkout powered by Silicon Pay. ${billingCycle === "monthly" ? "Monthly billing selected." : `Auto-bill ${billingCycle === "annual" ? "annual" : "every 2 years"} selected.`}`
                          : plan.workflowMessage ||
                            "Secure checkout powered by Silicon Pay."}
                      </p>
                    )}
                    {!isCurrent && isCustom && (
                      <p className="text-[11px] text-gray-400">
                        Contact Sales to get onboarding and negotiated pricing
                        for this plan.
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">
              Recent Payment Attempts
            </h2>
          </div>
          {checkouts.length === 0 ? (
            <p className="text-sm text-gray-500">
              No subscription checkouts yet.
            </p>
          ) : (
            <div className="space-y-3">
              {checkouts.slice(0, 6).map((item) => (
                <div
                  key={item._id}
                  className="flex flex-col gap-3 rounded-2xl border border-gray-100 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-bold text-gray-800">
                      {item.planName} • {item.reference}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatCurrency(item.amount, item.currency)} •{" "}
                      {item.billingCycle && (
                        <span className="capitalize">
                          {item.billingCycle} •{" "}
                        </span>
                      )}
                      {new Date(item.createdAt).toLocaleString("en-UG")}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${item.paymentFlow === "hosted_web" ? "bg-orange-50 text-orange-700 ring-1 ring-orange-600/10" : "bg-blue-50 text-blue-700 ring-1 ring-blue-600/10"}`}>
                        {item.paymentFlow === "hosted_web" ? (
                          <ExternalLink className="h-2.5 w-2.5" />
                        ) : (
                          <Smartphone className="h-2.5 w-2.5" />
                        )}
                        {item.paymentFlow === "hosted_web" ? "Hosted Web Payment" : "Direct Mobile Prompt"}
                      </span>
                      {item.errorMessage && (
                        <p className="text-[10px] font-semibold text-rose-600">
                          Error: {item.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${statusTone[item.status]}`}
                    >
                      {item.status}
                    </span>
                    {item.status === "initiated" && (
                      <button
                        onClick={() => handleRecheck(item.reference)}
                        disabled={recheckingRef === item.reference}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${recheckingRef === item.reference ? "animate-spin" : ""}`}
                        />
                        Recheck
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showContactSales && selectedCustomPlan && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/45 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowContactSales(false);
            }
          }}
        >
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Contact Sales
                </p>
                <h3 className="mt-1 text-xl font-black text-gray-900">
                  {selectedCustomPlan.name} Plan Request
                </h3>
                <p className="text-sm text-gray-500">
                  Share your details and our team will contact you with custom
                  pricing.
                </p>
              </div>
              <button
                onClick={() => setShowContactSales(false)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close"
              >
                <CircleX className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                value={contactSalesForm.contactName}
                onChange={(event) =>
                  setContactSalesForm((current) => ({
                    ...current,
                    contactName: event.target.value,
                  }))
                }
                placeholder="Contact name"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              />
              <input
                value={contactSalesForm.contactEmail}
                onChange={(event) =>
                  setContactSalesForm((current) => ({
                    ...current,
                    contactEmail: event.target.value,
                  }))
                }
                placeholder="Contact email"
                type="email"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              />
              <input
                value={contactSalesForm.contactPhone}
                onChange={(event) =>
                  setContactSalesForm((current) => ({
                    ...current,
                    contactPhone: event.target.value,
                  }))
                }
                placeholder="Contact phone (optional)"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              />
              <input
                value={contactSalesForm.companyName}
                onChange={(event) =>
                  setContactSalesForm((current) => ({
                    ...current,
                    companyName: event.target.value,
                  }))
                }
                placeholder="Company name"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              />
              <textarea
                value={contactSalesForm.message}
                onChange={(event) =>
                  setContactSalesForm((current) => ({
                    ...current,
                    message: event.target.value,
                  }))
                }
                placeholder="Tell us your expected users, branches, and support needs"
                rows={4}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
              />
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setShowContactSales(false)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitContactSales}
                disabled={sendingContactSales}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {sendingContactSales ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {sendingContactSales ? "Sending..." : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCheckoutPhoneModal && selectedCheckoutPlan && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/45 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeCheckoutPhoneModal();
            }
          }}
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Payment Details
                </p>
                <h3 className="mt-1 text-xl font-black text-gray-900">
                  Buy {selectedCheckoutPlan.name}
                </h3>
                <p className="text-sm text-gray-500">
                  Enter your mobile money number before we send the Silicon Pay
                  request.
                </p>
              </div>
              <button
                onClick={closeCheckoutPhoneModal}
                disabled={subscribingPlanId === selectedCheckoutPlan._id}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                aria-label="Close"
              >
                <CircleX className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("mobile_money")}
                    className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all ${
                      paymentMethod === "mobile_money"
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/10"
                        : "border-gray-100 bg-white hover:border-gray-300"
                    }`}
                  >
                    <Smartphone className={`h-6 w-6 ${paymentMethod === "mobile_money" ? "text-blue-600" : "text-gray-400"}`} />
                    <span className={`text-[11px] font-bold ${paymentMethod === "mobile_money" ? "text-blue-700" : "text-gray-600"}`}>
                      Direct Mobile Prompt
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all ${
                      paymentMethod === "card"
                        ? "border-orange-500 bg-orange-50 ring-2 ring-orange-500/10"
                        : "border-gray-100 bg-white hover:border-gray-300"
                    }`}
                  >
                    <ExternalLink className={`h-6 w-6 ${paymentMethod === "card" ? "text-orange-600" : "text-gray-400"}`} />
                    <span className={`text-[11px] font-bold ${paymentMethod === "card" ? "text-orange-700" : "text-gray-600"}`}>
                      Hosted Web Payment
                    </span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="subscriptionCheckoutPhone"
                  className="text-[11px] font-bold uppercase tracking-wider text-gray-500"
                >
                  {paymentMethod === "mobile_money" ? "Mobile Number" : "Contact Phone (Optional)"}
                </label>
                <input
                  id="subscriptionCheckoutPhone"
                  value={checkoutPhone}
                  onChange={(event) => setCheckoutPhone(event.target.value)}
                  placeholder={paymentMethod === "mobile_money" ? "e.g. 0772123456" : "Your contact number"}
                  inputMode="tel"
                  autoComplete="tel"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                />
                <p className="text-[10px] text-gray-400">
                  {paymentMethod === "mobile_money" 
                    ? "Enter your Airtel or MTN number to receive a secure payment prompt on your phone."
                    : "Redirects you to a secure hosted page to pay via Visa, Mastercard, or Mobile Money."}
                </p>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={closeCheckoutPhoneModal}
                disabled={subscribingPlanId === selectedCheckoutPlan._id}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitCheckoutWithPhone}
                disabled={subscribingPlanId === selectedCheckoutPlan._id}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {subscribingPlanId === selectedCheckoutPlan._id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : paymentMethod === "mobile_money" ? (
                  <Smartphone className="h-4 w-4" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                {subscribingPlanId === selectedCheckoutPlan._id
                  ? "Starting..."
                  : paymentMethod === "mobile_money" ? "Send Prompt" : "Proceed to Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
