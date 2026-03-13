"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  TrendingUp,
  Boxes,
  Users,
  FileText,
  CalendarDays,
  SlidersHorizontal,
  Loader2,
  ArrowRight,
  RefreshCw,
  Send,
} from "lucide-react";

type AiTab =
  | "assistant"
  | "sales-intelligence"
  | "inventory-forecasting"
  | "customer-behaviour"
  | "daily-summary"
  | "weekly-review"
  | "custom-report"
  | "ai-settings";

interface InsightsResponse {
  generatedAt: string;
  smartInsights: {
    salesIntelligence: {
      revenue30d: number;
      orders30d: number;
      averageOrderValue: number;
      revenue7d: number;
      projectedWeeklyRevenue: number;
      topProducts: { name: string; quantity: number; revenue: number }[];
    };
    inventoryForecasting: {
      lowStockItems: number;
      totalTrackedItems: number;
      reorderUrgency: number;
      projectedDemandGap: number;
      activeProducts: number;
    };
    customerBehaviour: {
      activeCustomers30d: number;
      totalCustomers: number;
      overdueCustomers: number;
      overdueInvoices: number;
      engagementRate: number;
    };
  };
  automatedReports: {
    dailySummary: {
      salesTodayEstimate: number;
      ordersTodayEstimate: number;
      inventoryAlerts: number;
    };
    weeklyBusinessReview: {
      weeklyRevenue: number;
      weeklyOrders: number;
      expense30d: number;
      marginSignal: number;
    };
  };
  narratives: string[];
}

interface AiSettingsState {
  aiLanguage: "en" | "lg" | "sw";
  aiTone: "professional" | "friendly" | "concise" | "brief";
  aiAssistantEnabled: boolean;
  aiSmartInsightsEnabled: boolean;
  aiDailySummaryEmailEnabled: boolean;
  aiDailySummaryEmailTime: string;
  aiWeeklyReviewEmailEnabled: boolean;
  aiWeeklyReviewEmailDay:
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday";
  aiLowStockNotificationEnabled: boolean;
  aiCreditAlertNotificationEnabled: boolean;
  aiCreditAlertThreshold: number;
  aiDataUsageAccepted: boolean;
  aiNotificationsEnabled: boolean;
  aiModelPreference: "standard" | "advanced" | "balanced" | "fast" | "accurate";
  aiDataPreference: "strict" | "assisted";
}

const tabs: {
  id: AiTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "assistant", label: "AI Assistant", icon: Sparkles },
  { id: "sales-intelligence", label: "Sales Intelligence", icon: TrendingUp },
  { id: "inventory-forecasting", label: "Inventory Forecasting", icon: Boxes },
  { id: "customer-behaviour", label: "Customer Behaviour", icon: Users },
  { id: "daily-summary", label: "Daily Summary", icon: FileText },
  { id: "weekly-review", label: "Weekly Business Review", icon: CalendarDays },
  { id: "custom-report", label: "Custom AI Report", icon: RefreshCw },
  { id: "ai-settings", label: "AI Settings", icon: SlidersHorizontal },
];

export default function AiPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") || "assistant") as AiTab;
  const settingsSection = searchParams.get("section") || "all";

  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [insightsError, setInsightsError] = useState<string>("");
  const [offlineMode, setOfflineMode] = useState(false);
  const [usingCachedInsights, setUsingCachedInsights] = useState(false);

  const [assistantInput, setAssistantInput] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([
    {
      role: "assistant",
      content:
        "Welcome to AI Assistant. Ask me about sales trends, inventory risk, or overdue collections.",
    },
  ]);

  const [reportLoading, setReportLoading] = useState(false);
  const [reportOutput, setReportOutput] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");

  const [settings, setSettings] = useState<AiSettingsState>({
    aiLanguage: "en",
    aiTone: "professional",
    aiAssistantEnabled: true,
    aiSmartInsightsEnabled: true,
    aiDailySummaryEmailEnabled: false,
    aiDailySummaryEmailTime: "18:00",
    aiWeeklyReviewEmailEnabled: false,
    aiWeeklyReviewEmailDay: "monday",
    aiLowStockNotificationEnabled: true,
    aiCreditAlertNotificationEnabled: false,
    aiCreditAlertThreshold: 250000,
    aiDataUsageAccepted: true,
    aiNotificationsEnabled: true,
    aiModelPreference: "standard",
    aiDataPreference: "assisted",
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState("");

  const activeTab = useMemo(
    () => (tabs.some((t) => t.id === tab) ? tab : "assistant"),
    [tab],
  );

  useEffect(() => {
    const saved = window.localStorage.getItem("meka-ai-chat-history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as {
          role: "user" | "assistant";
          content: string;
        }[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAssistantMessages(parsed);
        }
      } catch {
        // ignore corrupted local history
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "meka-ai-chat-history",
      JSON.stringify(assistantMessages.slice(-20)),
    );
  }, [assistantMessages]);

  useEffect(() => {
    const updateOnlineState = () => setOfflineMode(!navigator.onLine);
    updateOnlineState();
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setInsightsError("");
      setUsingCachedInsights(false);
      try {
        const [insightsRes, settingsRes] = await Promise.all([
          fetch("/api/ai/insights", { cache: "no-store" }),
          fetch("/api/settings", { cache: "no-store" }),
        ]);

        if (!insightsRes.ok) throw new Error("Failed to load AI insights");
        const insightsData = (await insightsRes.json()) as InsightsResponse;
        setInsights(insightsData);
        window.localStorage.setItem(
          "meka-ai-insights-cache",
          JSON.stringify(insightsData),
        );

        if (settingsRes.ok) {
          const settingsData = (await settingsRes.json()) as {
            settings?: Partial<AiSettingsState>;
          };
          setSettings((prev) => ({
            ...prev,
            ...(settingsData.settings || {}),
          }));
        }
      } catch {
        const cached = window.localStorage.getItem("meka-ai-insights-cache");
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as InsightsResponse;
            setInsights(parsed);
            setUsingCachedInsights(true);
            setInsightsError(
              "Offline mode: showing cached smart insights from your last successful sync.",
            );
          } catch {
            setInsightsError("Failed to load AI data. Please refresh.");
          }
        } else {
          setInsightsError("Failed to load AI data. Please refresh.");
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const sendAssistantMessage = async () => {
    const message = assistantInput.trim();
    if (!message || assistantLoading) return;

    const nextMessages = [
      ...assistantMessages,
      { role: "user" as const, content: message },
    ];
    setAssistantMessages(nextMessages);
    setAssistantInput("");
    setAssistantLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          contextPath: `/dashboard/ai?tab=${activeTab}`,
        }),
      });

      if (!res.ok) throw new Error("Assistant failed");
      const data = (await res.json()) as { reply?: string };
      setAssistantMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "I could not generate a response.",
        },
      ]);
    } catch {
      setAssistantMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I could not respond right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  };

  const generateReport = async (type: "daily" | "weekly" | "custom") => {
    setReportLoading(true);
    setReportOutput("");
    try {
      const res = await fetch("/api/ai/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, prompt: customPrompt }),
      });
      if (!res.ok) throw new Error("Report failed");
      const data = (await res.json()) as { report?: string };
      setReportOutput(data.report || "No report output available.");
    } catch {
      setReportOutput("Could not generate report. Please retry.");
    } finally {
      setReportLoading(false);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    setSettingsStatus("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Save failed");
      setSettingsStatus("AI settings saved successfully.");
    } catch {
      setSettingsStatus("Failed to save AI settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const tabClass = (isActive: boolean) =>
    `inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? "bg-orange-500 text-white shadow-sm shadow-orange-500/30"
        : "bg-white text-gray-600 border border-gray-200 hover:border-orange-200 hover:text-orange-600"
    }`;

  const settingsSectionClass = (section: string) =>
    `rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
      settingsSection === section
        ? "bg-orange-100 text-orange-700"
        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
    }`;

  if (loading) {
    return (
      <div className="flex min-h-105 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            AI Integration Hub
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Assistant, smart insights, automated reports, and tenant-level AI
            preferences.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:border-orange-200 hover:text-orange-600"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {insightsError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {insightsError}
        </div>
      )}

      {offlineMode && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Offline mode enabled. Assistant requests require internet; insights
          use last cached analysis when available.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => router.push(`/dashboard/ai?tab=${item.id}`)}
              className={tabClass(isActive)}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {activeTab === "assistant" && (
        <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="space-y-3 max-h-105 overflow-y-auto pr-1">
              {assistantMessages.map((msg, idx) => (
                <div
                  key={`${msg.role}-${idx}`}
                  className={`rounded-xl px-3 py-2 text-sm ${
                    msg.role === "assistant"
                      ? "bg-orange-50 text-orange-900"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <p className="whitespace-pre-wrap wrap-break-word leading-6">
                    {msg.content}
                  </p>
                </div>
              ))}
              {assistantLoading && (
                <div className="inline-flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-sm text-orange-800">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <input
                value={assistantInput}
                onChange={(e) => setAssistantInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void sendAssistantMessage();
                  }
                }}
                placeholder="Ask AI Assistant..."
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-300 focus:outline-none"
              />
              <button
                onClick={() => void sendAssistantMessage()}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
              >
                <Send className="h-4 w-4" />
                Send
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-800">
              Quick prompts
            </h3>
            <div className="mt-3 space-y-2">
              {[
                "How are sales performing today?",
                "What should I restock this week?",
                "Which invoices are at risk?",
                "Give me a weekly executive summary.",
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setAssistantInput(prompt)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:border-orange-200 hover:text-orange-700"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "sales-intelligence" && insights && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Revenue (30d)",
              value:
                insights.smartInsights.salesIntelligence.revenue30d.toLocaleString(),
            },
            {
              label: "Orders (30d)",
              value:
                insights.smartInsights.salesIntelligence.orders30d.toLocaleString(),
            },
            {
              label: "Avg Order Value",
              value:
                insights.smartInsights.salesIntelligence.averageOrderValue.toLocaleString(),
            },
            {
              label: "Projected Weekly Revenue",
              value:
                insights.smartInsights.salesIntelligence.projectedWeeklyRevenue.toLocaleString(),
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-gray-200 bg-white p-4"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {card.label}
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {card.value}
              </p>
            </div>
          ))}
          <div className="md:col-span-2 xl:col-span-4 rounded-2xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-800">
              Top products by revenue
            </h3>
            <div className="mt-3 space-y-2">
              {insights.smartInsights.salesIntelligence.topProducts.map(
                (product, idx) => (
                  <div
                    key={`${product.name}-${idx}`}
                    className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2"
                  >
                    <div className="text-sm text-gray-700">{product.name}</div>
                    <div className="text-sm font-medium text-gray-900">
                      {Math.round(product.revenue).toLocaleString()} (
                      {product.quantity})
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "inventory-forecasting" && insights && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Low Stock Items",
              value: insights.smartInsights.inventoryForecasting.lowStockItems,
            },
            {
              label: "Tracked Stock Records",
              value:
                insights.smartInsights.inventoryForecasting.totalTrackedItems,
            },
            {
              label: "Reorder Urgency %",
              value: insights.smartInsights.inventoryForecasting.reorderUrgency,
            },
            {
              label: "Projected Demand Gap",
              value:
                insights.smartInsights.inventoryForecasting.projectedDemandGap,
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-gray-200 bg-white p-4"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {card.label}
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {card.value.toLocaleString()}
              </p>
            </div>
          ))}
          <div className="md:col-span-2 xl:col-span-4 rounded-2xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-800">
              AI recommendation
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Prioritize replenishment for products with both high movement and
              low available quantity. Consider auto-generating purchase
              suggestions for the next 7 days.
            </p>
            <button
              onClick={() => router.push("/dashboard/purchases")}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
            >
              Open Purchases
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {activeTab === "customer-behaviour" && insights && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Active Customers (30d)",
              value:
                insights.smartInsights.customerBehaviour.activeCustomers30d,
            },
            {
              label: "Total Customers",
              value: insights.smartInsights.customerBehaviour.totalCustomers,
            },
            {
              label: "Engagement Rate %",
              value: insights.smartInsights.customerBehaviour.engagementRate,
            },
            {
              label: "Overdue Invoices",
              value: insights.smartInsights.customerBehaviour.overdueInvoices,
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-gray-200 bg-white p-4"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {card.label}
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {card.value.toLocaleString()}
              </p>
            </div>
          ))}
          <div className="md:col-span-2 xl:col-span-4 rounded-2xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-800">
              Behaviour narrative
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              {insights.narratives.map((line, idx) => (
                <li key={idx}>• {line}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {(activeTab === "daily-summary" ||
        activeTab === "weekly-review" ||
        activeTab === "custom-report") && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-800">
            Automated Reports
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Generate AI-produced summaries for daily and weekly operations, or
            run a custom report prompt.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-orange-500 text-white">
                <tr>
                  <th className="px-3 py-2 text-left">Report</th>
                  <th className="px-3 py-2 text-left">Frequency</th>
                  <th className="px-3 py-2 text-left">Recipients</th>
                  <th className="px-3 py-2 text-left">Content</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    report: "Daily Summary",
                    frequency: "Every day at close of business",
                    recipients: "Store Manager, Owner",
                    content:
                      "Total revenue, total transactions, top product, cash vs credit split, stock alerts",
                  },
                  {
                    report: "Weekly Business Review",
                    frequency: "Every Monday morning",
                    recipients: "Owner, Accountant",
                    content:
                      "Week-over-week revenue, top 5 products, expenses, outstanding credit balances, low stock list",
                  },
                  {
                    report: "Custom AI Report",
                    frequency: "On demand or scheduled",
                    recipients: "User-defined",
                    content:
                      "User prompt in plain language, AI generated business report",
                  },
                  {
                    report: "Low Stock Alert",
                    frequency: "Real-time trigger",
                    recipients: "Warehouse Manager, Store Manager",
                    content:
                      "Triggered when product stock falls below minimum stock level",
                  },
                  {
                    report: "Overdue Credit Alert",
                    frequency: "Daily",
                    recipients: "Accountant, Store Manager",
                    content:
                      "List of customers with overdue credit balances sorted by amount owed",
                  },
                ].map((row) => (
                  <tr key={row.report} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-800">
                      {row.report}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{row.frequency}</td>
                    <td className="px-3 py-2 text-gray-600">
                      {row.recipients}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{row.content}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {activeTab === "custom-report" && (
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={4}
              placeholder="Example: Focus on margin leakage in beverages and overdue invoices older than 30 days."
              className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-300 focus:outline-none"
            />
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => void generateReport("daily")}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:border-orange-200 hover:text-orange-700"
            >
              Generate Daily Summary
            </button>
            <button
              onClick={() => void generateReport("weekly")}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:border-orange-200 hover:text-orange-700"
            >
              Generate Weekly Review
            </button>
            <button
              onClick={() => void generateReport("custom")}
              className="rounded-xl bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
            >
              Generate Custom AI Report
            </button>
          </div>
          <div className="mt-4 rounded-xl bg-gray-50 p-3">
            {reportLoading ? (
              <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating report...
              </div>
            ) : (
              <div>
                <span className="inline-flex rounded-full bg-orange-100 px-2 py-1 text-[11px] font-semibold text-orange-700">
                  AI-generated
                </span>
                <pre className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                  {reportOutput || "No generated report yet."}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "ai-settings" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-800">AI Settings</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() =>
                router.push("/dashboard/ai?tab=ai-settings&section=all")
              }
              className={settingsSectionClass("all")}
            >
              All
            </button>
            <button
              onClick={() =>
                router.push(
                  "/dashboard/ai?tab=ai-settings&section=language-tone",
                )
              }
              className={settingsSectionClass("language-tone")}
            >
              Language & Tone
            </button>
            <button
              onClick={() =>
                router.push(
                  "/dashboard/ai?tab=ai-settings&section=notifications",
                )
              }
              className={settingsSectionClass("notifications")}
            >
              Notification Preferences
            </button>
            <button
              onClick={() =>
                router.push("/dashboard/ai?tab=ai-settings&section=model-data")
              }
              className={settingsSectionClass("model-data")}
            >
              Model & Data
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {(settingsSection === "all" ||
              settingsSection === "language-tone") && (
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Language</span>
                <select
                  value={settings.aiLanguage}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      aiLanguage: e.target
                        .value as AiSettingsState["aiLanguage"],
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2"
                >
                  <option value="en">English</option>
                  <option value="lg">Luganda</option>
                  <option value="sw">Swahili</option>
                </select>
              </label>
            )}
            {(settingsSection === "all" ||
              settingsSection === "language-tone") && (
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">Tone</span>
                <select
                  value={settings.aiTone}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      aiTone: e.target.value as AiSettingsState["aiTone"],
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="concise">Concise</option>
                  <option value="brief">Brief</option>
                </select>
              </label>
            )}
            {(settingsSection === "all" ||
              settingsSection === "model-data") && (
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">
                  Model Preference
                </span>
                <select
                  value={settings.aiModelPreference}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      aiModelPreference: e.target
                        .value as AiSettingsState["aiModelPreference"],
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2"
                >
                  <option value="standard">Standard (faster)</option>
                  <option value="advanced">Advanced (more detailed)</option>
                  <option value="balanced">Balanced</option>
                  <option value="fast">Fast</option>
                  <option value="accurate">Accurate</option>
                </select>
              </label>
            )}
            {(settingsSection === "all" ||
              settingsSection === "model-data") && (
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">
                  Data Preference
                </span>
                <select
                  value={settings.aiDataPreference}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      aiDataPreference: e.target
                        .value as AiSettingsState["aiDataPreference"],
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2"
                >
                  <option value="assisted">AI Assisted</option>
                  <option value="strict">Strict Rule-based</option>
                </select>
              </label>
            )}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(settingsSection === "all" ||
              settingsSection === "notifications") && (
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={settings.aiAssistantEnabled}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      aiAssistantEnabled: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                Enable AI Assistant
              </label>
            )}
            {(settingsSection === "all" ||
              settingsSection === "notifications") && (
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={settings.aiSmartInsightsEnabled}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      aiSmartInsightsEnabled: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                Enable Smart Insights
              </label>
            )}
            {(settingsSection === "all" ||
              settingsSection === "notifications") && (
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={settings.aiDailySummaryEmailEnabled}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      aiDailySummaryEmailEnabled: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                Daily Summary Email
              </label>
            )}
            {(settingsSection === "all" ||
              settingsSection === "notifications") && (
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">
                  Daily Summary Time
                </span>
                <input
                  type="time"
                  value={settings.aiDailySummaryEmailTime}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      aiDailySummaryEmailTime: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2"
                />
              </label>
            )}
            {(settingsSection === "all" ||
              settingsSection === "notifications") && (
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={settings.aiWeeklyReviewEmailEnabled}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      aiWeeklyReviewEmailEnabled: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                Weekly Review Email
              </label>
            )}
            {(settingsSection === "all" ||
              settingsSection === "notifications") && (
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">
                  Weekly Review Day
                </span>
                <select
                  value={settings.aiWeeklyReviewEmailDay}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      aiWeeklyReviewEmailDay: e.target
                        .value as AiSettingsState["aiWeeklyReviewEmailDay"],
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2"
                >
                  <option value="monday">Monday</option>
                  <option value="tuesday">Tuesday</option>
                  <option value="wednesday">Wednesday</option>
                  <option value="thursday">Thursday</option>
                  <option value="friday">Friday</option>
                  <option value="saturday">Saturday</option>
                  <option value="sunday">Sunday</option>
                </select>
              </label>
            )}
            {(settingsSection === "all" ||
              settingsSection === "notifications") && (
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={settings.aiLowStockNotificationEnabled}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      aiLowStockNotificationEnabled: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                Low Stock Notification
              </label>
            )}
            {(settingsSection === "all" ||
              settingsSection === "notifications") && (
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={settings.aiCreditAlertNotificationEnabled}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      aiCreditAlertNotificationEnabled: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                Credit Alert Notification
              </label>
            )}
            {(settingsSection === "all" ||
              settingsSection === "notifications") && (
              <label className="text-sm">
                <span className="mb-1 block text-gray-600">
                  Credit Alert Threshold
                </span>
                <input
                  type="number"
                  min={0}
                  value={settings.aiCreditAlertThreshold}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      aiCreditAlertThreshold: Math.max(
                        0,
                        Number(e.target.value) || 0,
                      ),
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2"
                />
              </label>
            )}
          </div>

          <label className="mt-4 inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.aiNotificationsEnabled}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  aiNotificationsEnabled: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-gray-300"
            />
            Enable AI notification suggestions
          </label>
          <label className="mt-3 inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.aiDataUsageAccepted}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  aiDataUsageAccepted: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-gray-300"
            />
            AI data usage consent (required for Smart Insights)
          </label>

          <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-gray-500">
            <li>AI Assistant responses are labeled as AI-generated.</li>
            <li>No raw customer PII is sent to external AI providers.</li>
            <li>
              Luganda prompts are auto-detected and responded to accordingly.
            </li>
            <li>
              Smart insights can be served from cached analysis in offline mode.
            </li>
          </ul>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => void saveSettings()}
              disabled={savingSettings}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-70"
            >
              {savingSettings && <Loader2 className="h-4 w-4 animate-spin" />}
              Save AI Settings
            </button>
            {settingsStatus && (
              <p className="text-sm text-gray-600">{settingsStatus}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
