export type AiContextKey =
  | "dashboard"
  | "sales"
  | "inventory"
  | "customers"
  | "purchases"
  | "finance"
  | "reports"
  | "settings"
  | "ai"
  | "general";

const AI_CONTEXT_LABELS: Record<AiContextKey, string> = {
  dashboard: "Dashboard overview",
  sales: "Sales workspace",
  inventory: "Inventory workspace",
  customers: "Customers workspace",
  purchases: "Purchases workspace",
  finance: "Finance workspace",
  reports: "Reports workspace",
  settings: "AI settings workspace",
  ai: "AI Assistant workspace",
  general: "Business workspace",
};

const AI_CONTEXT_PROMPTS: Record<AiContextKey, string[]> = {
  dashboard: [
    "Today summary",
    "Low stock?",
    "Pending payments",
    "Top products this week",
  ],
  sales: [
    "How much did we make this week?",
    "Which product is selling most this month?",
    "Show peak sales hours",
    "Show discount impact",
  ],
  inventory: [
    "What stock is running low?",
    "What should I restock this week?",
    "Which items may run out in 3 days?",
    "Show dead stock alerts",
  ],
  customers: [
    "Who are our top 5 customers by spend?",
    "Show overdue credit customers",
    "Who is at risk of churn?",
    "Show customer segments",
  ],
  purchases: [
    "Which purchase orders are still open?",
    "What should we reorder next?",
    "Show supplier payment pressure",
    "Compare purchases vs sales",
  ],
  finance: [
    "Show me all credit sales that are overdue.",
    "How is cash vs credit trending?",
    "Summarize this week's expenses",
    "What margin are we protecting?",
  ],
  reports: [
    "Generate last month's sales report",
    "Build a weekly business review",
    "Show low stock alert recipients",
    "Create a custom AI report",
  ],
  settings: [
    "What does Smart Insights use?",
    "How do I change assistant language?",
    "Review AI notification settings",
    "Explain model preference options",
  ],
  ai: [
    "How much did we make this week?",
    "What stock is running low?",
    "Who are our top customers by spend?",
    "Generate a weekly business review",
  ],
  general: [
    "Give me a business summary",
    "What should I focus on today?",
    "Where is stock risk highest?",
    "Show overdue collections",
  ],
};

export function getAiContextKey(contextPath?: string): AiContextKey {
  const path = (contextPath || "").toLowerCase();

  if (path.includes("/dashboard/ai")) return "ai";
  if (path.includes("/dashboard/inventory")) return "inventory";
  if (path.includes("/dashboard/stock")) return "inventory";
  if (path.includes("/dashboard/sales")) return "sales";
  if (path.includes("/dashboard/customers")) return "customers";
  if (path.includes("/dashboard/purchases")) return "purchases";
  if (
    path.includes("/dashboard/finance") ||
    path.includes("/dashboard/cashflow") ||
    path.includes("/dashboard/invoices") ||
    path.includes("/dashboard/expenses") ||
    path.includes("/dashboard/taxes")
  ) {
    return "finance";
  }
  if (path.includes("/dashboard/reports")) return "reports";
  if (path.includes("/dashboard/settings")) return "settings";
  if (path.includes("/dashboard")) return "dashboard";

  return "general";
}

export function getAiContextLabel(contextPath?: string) {
  return AI_CONTEXT_LABELS[getAiContextKey(contextPath)];
}

export function getAiQuickPrompts(contextPath?: string) {
  return AI_CONTEXT_PROMPTS[getAiContextKey(contextPath)];
}
