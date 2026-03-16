"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Boxes,
  Brain,
  CalendarDays,
  CheckCircle2,
  FileText,
  History,
  Loader2,
  RefreshCw,
  Send,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Users,
  WifiOff,
} from "lucide-react";
import { getAiQuickPrompts } from "@/lib/ai";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useSession } from "../layout";

type AiTab =
  | "assistant"
  | "sales-intelligence"
  | "inventory-forecasting"
  | "customer-behaviour"
  | "daily-summary"
  | "weekly-review"
  | "custom-report"
  | "ai-settings";

interface InsightPoint {
  label: string;
  revenue: number;
}

interface PeakHourPoint {
  hour: string;
  revenue: number;
  orders: number;
}

interface PaymentBreakdownItem {
  method: string;
  amount: number;
  orders: number;
  share: number;
}

interface ProductInsight {
  name: string;
  quantity: number;
  revenue: number;
}

interface ReorderPrediction {
  productId: string;
  productName: string;
  currentQuantity: number;
  reorderLevel: number;
  daysLeft: number | null;
  suggestedOrderQty: number;
  avgDailyUnits: number;
}

interface DeadStockAlert {
  productName: string;
  quantity: number;
  suggestedAction: string;
}

interface SeasonalPattern {
  productName: string;
  changePct: number;
  recommendation: string;
}

interface WastageTrackingItem {
  productName: string;
  returnedQty: number;
  returnValue: number;
  recommendation: string;
}

interface SegmentSummary {
  label: string;
  count: number;
  averageBasketSize: number;
}

interface ChurnPredictionItem {
  customerName: string;
  totalSpent: number;
  totalPurchases: number;
  suggestedAction: string;
}

interface CreditRiskHighlight {
  customerName: string;
  outstandingBalance: number;
  risk: "Low" | "Medium" | "High";
}

interface LoyaltyInsight {
  customerName: string;
  visits: number;
  totalSpent: number;
}

interface InsightsResponse {
  generatedAt: string;
  source: "live" | "cache";
  cacheNotice?: string;
  smartInsights: {
    salesIntelligence: {
      revenue30d: number;
      orders30d: number;
      averageOrderValue: number;
      revenue7d: number;
      salesToday: number;
      ordersToday: number;
      projectedWeeklyRevenue: number;
      topProducts: ProductInsight[];
      revenueTrend: InsightPoint[];
      peakHours: PeakHourPoint[];
      paymentBreakdown: PaymentBreakdownItem[];
      discountImpact: {
        grossSales: number;
        discountValue: number;
        netSales: number;
        discountedOrders: number;
      };
    };
    inventoryForecasting: {
      lowStockItems: number;
      totalTrackedItems: number;
      reorderUrgency: number;
      projectedDemandGap: number;
      activeProducts: number;
      reorderPredictions: ReorderPrediction[];
      deadStockAlerts: DeadStockAlert[];
      seasonalPatterns: SeasonalPattern[];
      wastageTracking: WastageTrackingItem[];
    };
    customerBehaviour: {
      activeCustomers30d: number;
      totalCustomers: number;
      overdueCustomers: number;
      overdueInvoices: number;
      engagementRate: number;
      segments: SegmentSummary[];
      churnPrediction: ChurnPredictionItem[];
      averageBasketBySegment: SegmentSummary[];
      creditRiskScoring: {
        low: number;
        medium: number;
        high: number;
        highlights: CreditRiskHighlight[];
      };
      loyaltyInsights: LoyaltyInsight[];
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

interface AssistantHighlight {
  label: string;
  value: string;
}

interface AssistantTable {
  title: string;
  columns: string[];
  rows: string[][];
}

interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  highlights?: AssistantHighlight[];
  table?: AssistantTable;
}

interface AssistantHistoryItem {
  id: string;
  createdAt: string;
  contextLabel: string;
  prompt: string;
  reply: string;
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

interface AiProviderStatus {
  configured: boolean;
  reachable: boolean;
  checkedAt?: string;
  providerName?: string | null;
  model?: string | null;
  baseUrl?: string;
  message?: string;
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
  { id: "weekly-review", label: "Weekly Review", icon: CalendarDays },
  { id: "custom-report", label: "Custom AI Report", icon: RefreshCw },
  { id: "ai-settings", label: "AI Settings", icon: SlidersHorizontal },
];

const tabContextPathMap: Record<AiTab, string> = {
  assistant: "/dashboard/ai",
  "sales-intelligence": "/dashboard/sales",
  "inventory-forecasting": "/dashboard/inventory",
  "customer-behaviour": "/dashboard/customers",
  "daily-summary": "/dashboard/reports",
  "weekly-review": "/dashboard/reports",
  "custom-report": "/dashboard/reports",
  "ai-settings": "/dashboard/settings",
};

const historyStorageKey = "meka-ai-assistant-session-history";

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-3xl border border-orange-100 bg-white p-4 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)]">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InsightTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="w-full min-w-130 text-sm">
        <thead className="bg-orange-500 text-left text-white">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-3 py-2.5 font-semibold">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={`${row.join("-")}-${rowIndex}`}
              className="border-t border-slate-100"
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={`${cell}-${cellIndex}`}
                  className="px-3 py-2.5 text-slate-600"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MiniBarTrend({ points }: { points: InsightPoint[] }) {
  const max = Math.max(...points.map((point) => point.revenue), 1);
  return (
    <div className="space-y-3">
      <div className="flex h-44 items-end gap-2 rounded-2xl bg-slate-950 px-3 pb-3 pt-6">
        {points.map((point) => (
          <div
            key={point.label}
            className="flex flex-1 flex-col items-center gap-2"
          >
            <div
              className="w-full rounded-t-xl bg-linear-to-t from-orange-500 to-amber-300"
              style={{ height: `${Math.max((point.revenue / max) * 100, 8)}%` }}
            />
            <span className="text-[10px] text-slate-300">{point.label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>14-day revenue trend</span>
        <span>Peak: {formatCurrency(max)}</span>
      </div>
    </div>
  );
}

function HeatStrip({ points }: { points: PeakHourPoint[] }) {
  const max = Math.max(...points.map((point) => point.orders), 1);
  return (
    <div className="grid grid-cols-3 gap-3 md:grid-cols-6 xl:grid-cols-12">
      {points.map((point) => {
        const intensity = Math.max(point.orders / max, 0.18);
        return (
          <div
            key={point.hour}
            className="rounded-2xl border border-orange-100 p-3"
            style={{
              backgroundColor: `rgba(249, 115, 22, ${Math.min(intensity, 0.95)})`,
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-900">
              {point.hour}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-950">
              {point.orders} orders
            </p>
            <p className="mt-1 text-xs text-slate-800/80">
              {formatCurrency(point.revenue)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function HistoryList({
  history,
  onReuse,
}: {
  history: AssistantHistoryItem[];
  onReuse: (prompt: string) => void;
}) {
  if (history.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
        No previous chats in this session yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((item) => (
        <button
          key={item.id}
          onClick={() => onReuse(item.prompt)}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:border-orange-200 hover:bg-orange-50"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              {item.contextLabel}
            </span>
            <span className="text-xs text-slate-400">
              {formatDateTime(item.createdAt)}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-800">
            {item.prompt}
          </p>
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">
            {item.reply}
          </p>
        </button>
      ))}
    </div>
  );
}

export default function AiPage() {
  const router = useRouter();
  const { user } = useSession();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") || "assistant") as AiTab;
  const settingsSection = searchParams.get("section") || "all";
  const promptSeed = searchParams.get("prompt") || "";
  const autostartPrompt = searchParams.get("autostart") === "1";
  const activeTab = useMemo(
    () => (tabs.some((item) => item.id === tab) ? tab : "assistant"),
    [tab],
  );

  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [insightsError, setInsightsError] = useState("");
  const [offlineMode, setOfflineMode] = useState(false);

  const [assistantInput, setAssistantInput] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<
    AssistantMessage[]
  >([
    {
      id: "welcome",
      role: "assistant",
      content:
        "[AI-generated] Ask anything about your business. I can explain revenue, stock risk, overdue credit, and customer behaviour in plain English or Luganda.",
    },
  ]);
  const [assistantHistory, setAssistantHistory] = useState<
    AssistantHistoryItem[]
  >([]);
  const [showHistory, setShowHistory] = useState(false);

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
    aiCreditAlertThreshold: 50000,
    aiDataUsageAccepted: true,
    aiNotificationsEnabled: true,
    aiModelPreference: "standard",
    aiDataPreference: "assisted",
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState("");
  const [providerStatusLoading, setProviderStatusLoading] = useState(false);
  const [providerStatus, setProviderStatus] = useState<AiProviderStatus | null>(
    null,
  );
  const promptSeedHandledRef = useRef("");

  const assistantContextPath = tabContextPathMap[activeTab];
  const quickPrompts = useMemo(
    () => getAiQuickPrompts(assistantContextPath),
    [assistantContextPath],
  );

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
    const storedHistory = window.sessionStorage.getItem(historyStorageKey);
    if (!storedHistory) return;

    try {
      const parsed = JSON.parse(storedHistory) as AssistantHistoryItem[];
      if (Array.isArray(parsed)) {
        setAssistantHistory(parsed);
      }
    } catch {
      // ignore invalid session history
    }
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem(
      historyStorageKey,
      JSON.stringify(assistantHistory),
    );
  }, [assistantHistory]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setInsightsError("");
      try {
        const [insightsRes, settingsRes] = await Promise.all([
          fetch("/api/ai/insights", { cache: "no-store" }),
          fetch("/api/settings", { cache: "no-store" }),
        ]);

        if (!insightsRes.ok) {
          throw new Error("Failed to load AI insights");
        }

        const insightsData = (await insightsRes.json()) as InsightsResponse;
        setInsights(insightsData);

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
        setInsightsError(
          "AI data could not be loaded right now. Refresh or try again later.",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (activeTab !== "assistant" || !promptSeed) return;
    const seedKey = `${promptSeed}:${autostartPrompt ? "auto" : "prefill"}`;
    if (promptSeedHandledRef.current === seedKey) return;
    promptSeedHandledRef.current = seedKey;
    setAssistantInput(promptSeed);
    if (autostartPrompt) {
      void sendAssistantMessage(promptSeed);
    }
  }, [activeTab, autostartPrompt, promptSeed]);

  const loadProviderStatus = useCallback(async () => {
    if (user?.role !== "admin") return;

    setProviderStatusLoading(true);
    try {
      const res = await fetch("/api/ai/provider-status", { cache: "no-store" });
      const payload = (await res.json()) as AiProviderStatus & {
        error?: string;
      };

      if (!res.ok) {
        setProviderStatus({
          configured: false,
          reachable: false,
          checkedAt: new Date().toISOString(),
          message: payload.error || "Unable to check provider status.",
        });
        return;
      }

      setProviderStatus(payload);
    } catch {
      setProviderStatus({
        configured: false,
        reachable: false,
        checkedAt: new Date().toISOString(),
        message: "Unable to check provider status.",
      });
    } finally {
      setProviderStatusLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    if (activeTab === "ai-settings" && user?.role === "admin") {
      void loadProviderStatus();
    }
  }, [activeTab, user?.role, loadProviderStatus]);

  async function sendAssistantMessage(seed?: string) {
    const message = (seed ?? assistantInput).trim();
    if (!message || assistantLoading) return;

    setAssistantMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
      },
    ]);
    setAssistantInput("");
    setAssistantLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          contextPath: assistantContextPath,
        }),
      });

      if (!res.ok) {
        throw new Error("Assistant request failed");
      }

      const data = (await res.json()) as {
        reply?: string;
        highlights?: AssistantHighlight[];
        table?: AssistantTable;
      };
      const reply = data.reply || "I could not generate a response right now.";
      setAssistantMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: reply,
          highlights: data.highlights,
          table: data.table,
        },
      ]);
      setAssistantHistory((prev) =>
        [
          {
            id: `history-${Date.now()}`,
            createdAt: new Date().toISOString(),
            contextLabel:
              tabs.find((item) => item.id === activeTab)?.label ||
              "AI Assistant",
            prompt: message,
            reply,
          },
          ...prev,
        ].slice(0, 10),
      );
    } catch {
      setAssistantMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content:
            "[AI-generated] I could not respond right now. If you are offline, cached smart insights are still available below.",
        },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  }

  async function generateReport(type: "daily" | "weekly" | "custom") {
    setReportLoading(true);
    setReportOutput("");
    try {
      const res = await fetch("/api/ai/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, prompt: customPrompt }),
      });
      if (!res.ok) {
        throw new Error("Report request failed");
      }
      const data = (await res.json()) as { report?: string };
      setReportOutput(data.report || "No report output available.");
    } catch {
      setReportOutput("Could not generate report. Please retry.");
    } finally {
      setReportLoading(false);
    }
  }

  async function saveSettings() {
    setSavingSettings(true);
    setSettingsStatus("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        throw new Error("Save failed");
      }
      setSettingsStatus("AI settings saved successfully.");
    } catch {
      setSettingsStatus("Failed to save AI settings.");
    } finally {
      setSavingSettings(false);
    }
  }

  const tabClass = (isActive: boolean) =>
    `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
      isActive
        ? "bg-slate-950 text-white"
        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-orange-600 hover:ring-orange-200"
    }`;

  const settingsSectionClass = (section: string) =>
    `rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
      settingsSection === section
        ? "bg-orange-100 text-orange-700"
        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
    }`;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    );
  }

  const sales = insights?.smartInsights.salesIntelligence;
  const inventory = insights?.smartInsights.inventoryForecasting;
  const customers = insights?.smartInsights.customerBehaviour;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-4xl bg-linear-to-br from-slate-950 via-slate-900 to-orange-950 px-6 py-6 text-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.9)]">
        <div className="grid gap-6 lg:grid-cols-[1.35fr,0.85fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-200">
              <Brain className="h-3.5 w-3.5" />
              AI Integration
            </span>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight">
              Built-in intelligence for sales, stock, customer behaviour, and
              faster decisions.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              The AI module sits as a first-class area in the dashboard, with an
              always-available assistant, background smart insights, automated
              reports, and tenant-level controls.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-200">
                Assistant in English, Luganda, and Swahili
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-200">
                Cached insights for offline viewing
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-200">
                AI-generated content clearly labeled
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-200">
              Module Structure
            </p>
            <div className="mt-4 space-y-2 font-mono text-sm text-slate-200">
              <p>AI</p>
              <p className="pl-4">├─ AI Assistant</p>
              <p className="pl-4">├─ Smart Insights</p>
              <p className="pl-8">├─ Sales Intelligence</p>
              <p className="pl-8">├─ Inventory Forecasting</p>
              <p className="pl-8">└─ Customer Behaviour</p>
              <p className="pl-4">├─ Automated Reports</p>
              <p className="pl-8">├─ Daily Summary</p>
              <p className="pl-8">├─ Weekly Business Review</p>
              <p className="pl-8">└─ Custom AI Report</p>
              <p className="pl-4">└─ AI Settings</p>
            </div>
          </div>
        </div>
      </section>

      {insightsError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {insightsError}
        </div>
      )}

      {offlineMode && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <WifiOff className="h-4 w-4" />
          Assistant actions need internet access. Smart Insights can still show
          the last cached analysis.
        </div>
      )}

      {insights?.cacheNotice && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {insights.cacheNotice}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Sales Today"
          value={formatCurrency(sales?.salesToday || 0)}
          hint={`${sales?.ordersToday || 0} orders today`}
        />
        <MetricCard
          label="Low Stock Risk"
          value={`${inventory?.lowStockItems || 0}`}
          hint={`${inventory?.reorderUrgency || 0}% of tracked stock at or below reorder level`}
        />
        <MetricCard
          label="Active Customers"
          value={`${customers?.activeCustomers30d || 0}`}
          hint={`${customers?.engagementRate || 0}% engagement in the last 30 days`}
        />
        <MetricCard
          label="Insight Refresh"
          value={
            insights ? formatDateTime(insights.generatedAt) : "Unavailable"
          }
          hint={
            insights?.source === "cache" ? "Cached analysis" : "Live analysis"
          }
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => router.push(`/dashboard/ai?tab=${item.id}`)}
              className={tabClass(activeTab === item.id)}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {activeTab === "assistant" && (
        <div className="grid gap-6 xl:grid-cols-[1.5fr,0.9fr]">
          <Shell
            title="AI Assistant"
            subtitle="Chat-style assistant with page-aware prompts and inline business summaries."
          >
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div>
                Context-aware prompt set:{" "}
                <span className="font-semibold text-slate-900">
                  {tabs.find((item) => item.id === activeTab)?.label}
                </span>
              </div>
              <button
                onClick={() => setShowHistory((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:border-orange-200 hover:text-orange-600"
              >
                <History className="h-4 w-4" />
                Previous Chats
              </button>
            </div>

            {showHistory && (
              <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
                <HistoryList
                  history={assistantHistory}
                  onReuse={(prompt) => {
                    setAssistantInput(prompt);
                    setShowHistory(false);
                  }}
                />
              </div>
            )}

            <div className="mt-4 flex max-h-136 flex-col gap-3 overflow-y-auto rounded-[28px] bg-slate-100/80 p-4">
              {assistantMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm shadow-sm ${
                      message.role === "user"
                        ? "bg-orange-500 text-white"
                        : "bg-slate-200 text-slate-900"
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-6">
                      {message.content}
                    </p>
                    {message.highlights && message.highlights.length > 0 && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {message.highlights.map((highlight) => (
                          <div
                            key={`${message.id}-${highlight.label}`}
                            className="rounded-2xl bg-white/85 px-3 py-2 text-slate-900"
                          >
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-600">
                              {highlight.label}
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                              {highlight.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    {message.table && message.table.rows.length > 0 && (
                      <div className="mt-3 rounded-2xl bg-white p-3 text-slate-800">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
                          {message.table.title}
                        </p>
                        <InsightTable
                          columns={message.table.columns}
                          rows={message.table.rows}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {assistantLoading && (
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-200 px-3 py-2 text-sm text-slate-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              )}
            </div>

            <div className="mt-4 rounded-[28px] border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setAssistantInput(prompt)}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-orange-200 hover:text-orange-600"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex gap-3">
                <input
                  value={assistantInput}
                  onChange={(event) => setAssistantInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void sendAssistantMessage();
                    }
                  }}
                  placeholder="Ask anything about your business..."
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-orange-300"
                />
                <button
                  onClick={() => void sendAssistantMessage()}
                  disabled={assistantLoading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-70"
                >
                  <Send className="h-4 w-4" />
                  Send
                </button>
              </div>
            </div>
          </Shell>

          <div className="space-y-6">
            <Shell
              title="What It Can Do"
              subtitle="Business owners can ask questions or trigger guided follow-up actions."
            >
              <div className="space-y-4 text-sm text-slate-600">
                <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3">
                  <p className="font-semibold text-orange-700">
                    Ask in plain English or Luganda
                  </p>
                  <ul className="mt-2 space-y-1 leading-6 text-slate-700">
                    <li>How much did we make this week?</li>
                    <li>Which product is selling the most this month?</li>
                    <li>Show me all credit sales that are overdue.</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="font-semibold text-slate-800">
                    Guide next actions
                  </p>
                  <ul className="mt-2 space-y-1 leading-6 text-slate-600">
                    <li>Prioritize low-stock items before they hit zero.</li>
                    <li>
                      Surface overdue credit balances with a daily follow-up
                      focus.
                    </li>
                    <li>Generate daily and weekly executive summaries.</li>
                  </ul>
                </div>
              </div>
            </Shell>

            <Shell
              title="Technical Notes"
              subtitle="Aligned with the AI module guidance."
            >
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  All AI responses are labeled as AI-generated.
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  Cached analysis supports offline viewing of Smart Insights.
                </li>
                <li className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
                  External provider integration should only use aggregated
                  business context, never raw customer PII.
                </li>
              </ul>
            </Shell>
          </div>
        </div>
      )}

      {activeTab === "sales-intelligence" && sales && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Revenue 30d"
              value={formatCurrency(sales.revenue30d)}
            />
            <MetricCard
              label="Orders 30d"
              value={sales.orders30d.toLocaleString()}
            />
            <MetricCard
              label="Average Basket"
              value={formatCurrency(sales.averageOrderValue)}
            />
            <MetricCard
              label="Projected Weekly Revenue"
              value={formatCurrency(sales.projectedWeeklyRevenue)}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
            <Shell
              title="Revenue Trends"
              subtitle="Day-by-day revenue with a quick visual trend line."
            >
              <MiniBarTrend points={sales.revenueTrend} />
            </Shell>
            <Shell
              title="Discount Impact"
              subtitle="How pricing pressure is affecting net sales."
            >
              <div className="grid gap-3">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Gross Sales
                  </p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">
                    {formatCurrency(sales.discountImpact.grossSales)}
                  </p>
                </div>
                <div className="rounded-2xl bg-orange-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
                    Discounts Given
                  </p>
                  <p className="mt-1 text-xl font-semibold text-orange-700">
                    {formatCurrency(sales.discountImpact.discountValue)}
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    Net Sales
                  </p>
                  <p className="mt-1 text-xl font-semibold text-emerald-700">
                    {formatCurrency(sales.discountImpact.netSales)}
                  </p>
                  <p className="mt-1 text-xs text-emerald-600">
                    {sales.discountImpact.discountedOrders} discounted orders
                    this period
                  </p>
                </div>
              </div>
            </Shell>
          </div>

          <Shell
            title="Peak Hours"
            subtitle="Hourly sales heatmap for busiest and quietest times."
          >
            <HeatStrip points={sales.peakHours} />
          </Shell>

          <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
            <Shell
              title="Top Products"
              subtitle="Best-performing items by revenue and volume."
            >
              <InsightTable
                columns={["Product", "Revenue", "Qty"]}
                rows={sales.topProducts.map((item) => [
                  item.name,
                  formatCurrency(item.revenue),
                  item.quantity.toLocaleString(),
                ])}
              />
            </Shell>
            <Shell
              title="Payment Method Breakdown"
              subtitle="Cash, credit, card, and mobile money mix over time."
            >
              <InsightTable
                columns={["Method", "Amount", "Orders", "Share"]}
                rows={sales.paymentBreakdown.map((item) => [
                  item.method,
                  formatCurrency(item.amount),
                  item.orders.toLocaleString(),
                  `${item.share}%`,
                ])}
              />
            </Shell>
          </div>
        </div>
      )}

      {activeTab === "inventory-forecasting" && inventory && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Low Stock Items"
              value={inventory.lowStockItems.toLocaleString()}
            />
            <MetricCard
              label="Tracked Items"
              value={inventory.totalTrackedItems.toLocaleString()}
            />
            <MetricCard
              label="Reorder Urgency"
              value={`${inventory.reorderUrgency}%`}
            />
            <MetricCard
              label="Projected Demand Gap"
              value={inventory.projectedDemandGap.toLocaleString()}
            />
          </div>

          <Shell
            title="Reorder Predictions"
            subtitle="Sales velocity translated into days-left and suggested buy quantities."
          >
            <InsightTable
              columns={[
                "Product",
                "Qty",
                "Reorder",
                "Days Left",
                "Suggested Order",
                "Daily Units",
              ]}
              rows={inventory.reorderPredictions.map((item) => [
                item.productName,
                item.currentQuantity.toLocaleString(),
                item.reorderLevel.toLocaleString(),
                item.daysLeft === null
                  ? "No recent sales"
                  : `${item.daysLeft} days`,
                item.suggestedOrderQty.toLocaleString(),
                item.avgDailyUnits.toLocaleString(),
              ])}
            />
          </Shell>

          <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
            <Shell
              title="Dead Stock Alerts"
              subtitle="Products with quantity on hand but no recent movement."
            >
              <div className="space-y-3">
                {inventory.deadStockAlerts.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No dead stock alerts in the current snapshot.
                  </p>
                ) : (
                  inventory.deadStockAlerts.map((item) => (
                    <div
                      key={item.productName}
                      className="rounded-2xl border border-slate-200 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-slate-900">
                          {item.productName}
                        </p>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {item.quantity} units
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        Suggested action: {item.suggestedAction}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </Shell>

            <Shell
              title="Seasonal Patterns"
              subtitle="Emerging product momentum compared with the previous cycle."
            >
              <div className="grid gap-3 md:grid-cols-2">
                {inventory.seasonalPatterns.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No strong seasonal signal detected yet.
                  </p>
                ) : (
                  inventory.seasonalPatterns.map((item) => (
                    <div
                      key={item.productName}
                      className="rounded-2xl bg-orange-50 px-4 py-3"
                    >
                      <p className="font-medium text-slate-900">
                        {item.productName}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-orange-700">
                        {item.changePct}% growth
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        {item.recommendation}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </Shell>
          </div>

          <Shell
            title="Wastage Tracking"
            subtitle="Return or write-off pressure that suggests smaller, smarter batches."
          >
            {inventory.wastageTracking.length === 0 ? (
              <p className="text-sm text-slate-500">
                No wastage signals detected in the current period.
              </p>
            ) : (
              <InsightTable
                columns={[
                  "Product",
                  "Returned Qty",
                  "Return Value",
                  "Recommendation",
                ]}
                rows={inventory.wastageTracking.map((item) => [
                  item.productName,
                  item.returnedQty.toLocaleString(),
                  formatCurrency(item.returnValue),
                  item.recommendation,
                ])}
              />
            )}
          </Shell>
        </div>
      )}

      {activeTab === "customer-behaviour" && customers && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Active Customers 30d"
              value={customers.activeCustomers30d.toLocaleString()}
            />
            <MetricCard
              label="Total Customers"
              value={customers.totalCustomers.toLocaleString()}
            />
            <MetricCard
              label="Overdue Customers"
              value={customers.overdueCustomers.toLocaleString()}
            />
            <MetricCard
              label="Engagement Rate"
              value={`${customers.engagementRate}%`}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
            <Shell
              title="Customer Segments"
              subtitle="Automatic grouping for retention and upsell decisions."
            >
              <div className="space-y-3">
                {customers.segments.map((segment) => (
                  <div key={segment.label}>
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>{segment.label}</span>
                      <span>{segment.count} customers</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-orange-500 to-amber-300"
                        style={{
                          width: `${Math.min((segment.count / Math.max(customers.totalCustomers, 1)) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Avg basket: {formatCurrency(segment.averageBasketSize)}
                    </p>
                  </div>
                ))}
              </div>
            </Shell>

            <Shell
              title="Churn Prediction"
              subtitle="Accounts that used to buy but have gone quiet."
            >
              {customers.churnPrediction.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No churn candidates were flagged in the current snapshot.
                </p>
              ) : (
                <InsightTable
                  columns={["Customer", "Spend", "Visits", "Suggested Action"]}
                  rows={customers.churnPrediction.map((item) => [
                    item.customerName,
                    formatCurrency(item.totalSpent),
                    item.totalPurchases.toLocaleString(),
                    item.suggestedAction,
                  ])}
                />
              )}
            </Shell>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
            <Shell
              title="Credit Risk Scoring"
              subtitle="Low, medium, and high-risk credit positions."
            >
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    Low
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-700">
                    {customers.creditRiskScoring.low}
                  </p>
                </div>
                <div className="rounded-2xl bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                    Medium
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-amber-700">
                    {customers.creditRiskScoring.medium}
                  </p>
                </div>
                <div className="rounded-2xl bg-red-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                    High
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-red-700">
                    {customers.creditRiskScoring.high}
                  </p>
                </div>
              </div>
            </Shell>

            <Shell
              title="High-Risk Accounts"
              subtitle="Largest balances that need follow-up attention."
            >
              <InsightTable
                columns={["Customer", "Outstanding", "Risk"]}
                rows={customers.creditRiskScoring.highlights.map((item) => [
                  item.customerName,
                  formatCurrency(item.outstandingBalance),
                  item.risk,
                ])}
              />
            </Shell>
          </div>

          <Shell
            title="Loyalty Insights"
            subtitle="Most active repeat customers by visits and spend."
          >
            <InsightTable
              columns={["Customer", "Visits", "Total Spent"]}
              rows={customers.loyaltyInsights.map((item) => [
                item.customerName,
                item.visits.toLocaleString(),
                formatCurrency(item.totalSpent),
              ])}
            />
          </Shell>
        </div>
      )}

      {(activeTab === "daily-summary" ||
        activeTab === "weekly-review" ||
        activeTab === "custom-report") && (
        <div className="space-y-6">
          <Shell
            title="Automated Reports"
            subtitle="Scheduled summaries and plain-language custom reporting."
          >
            <InsightTable
              columns={["Report", "Frequency", "Recipients", "Content"]}
              rows={[
                [
                  "Daily Summary",
                  "Every day at close of business",
                  "Store Manager, Owner",
                  "Total revenue, transactions, top product, cash vs credit split, stock alerts",
                ],
                [
                  "Weekly Business Review",
                  "Every Monday morning",
                  "Owner, Accountant",
                  "Week-over-week revenue, top 5 products, expenses, outstanding credit balances, low stock list",
                ],
                [
                  "Custom AI Report",
                  "On demand or scheduled",
                  "User-defined",
                  "Business report generated from a plain-language prompt",
                ],
                [
                  "Low Stock Alert",
                  "Real-time trigger",
                  "Warehouse Manager, Store Manager",
                  "Triggered when any product falls below minimum stock level",
                ],
                [
                  "Overdue Credit Alert",
                  "Daily",
                  "Accountant, Store Manager",
                  "Customers with overdue credit balances sorted by amount owed",
                ],
              ]}
            />
          </Shell>

          <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
            <Shell
              title="Scheduled Summary Signals"
              subtitle="Live metrics feeding the daily and weekly report schedules."
            >
              <div className="grid gap-3 md:grid-cols-2">
                <MetricCard
                  label="Daily Summary"
                  value={formatCurrency(
                    insights?.automatedReports.dailySummary
                      .salesTodayEstimate || 0,
                  )}
                  hint={`${insights?.automatedReports.dailySummary.ordersTodayEstimate || 0} orders today`}
                />
                <MetricCard
                  label="Inventory Alerts"
                  value={`${insights?.automatedReports.dailySummary.inventoryAlerts || 0}`}
                  hint="Items below threshold"
                />
                <MetricCard
                  label="Weekly Revenue"
                  value={formatCurrency(
                    insights?.automatedReports.weeklyBusinessReview
                      .weeklyRevenue || 0,
                  )}
                  hint={`${insights?.automatedReports.weeklyBusinessReview.weeklyOrders || 0} weekly orders`}
                />
                <MetricCard
                  label="Margin Signal"
                  value={`${insights?.automatedReports.weeklyBusinessReview.marginSignal || 0}%`}
                  hint="Revenue less expense pressure"
                />
              </div>
            </Shell>

            <Shell
              title="Generate Report"
              subtitle="Plain-language reporting for managers, owners, and accountants."
            >
              {activeTab === "custom-report" && (
                <textarea
                  value={customPrompt}
                  onChange={(event) => setCustomPrompt(event.target.value)}
                  rows={5}
                  placeholder="Example: Show me all sales by cashier for last month and highlight weak shifts."
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-orange-300"
                />
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => void generateReport("daily")}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-orange-200 hover:text-orange-600"
                >
                  Generate Daily Summary
                </button>
                <button
                  onClick={() => void generateReport("weekly")}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-orange-200 hover:text-orange-600"
                >
                  Generate Weekly Review
                </button>
                <button
                  onClick={() => void generateReport("custom")}
                  className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
                >
                  Generate Custom AI Report
                </button>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-slate-100">
                <div className="inline-flex rounded-full bg-orange-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-200">
                  AI-generated
                </div>
                {reportLoading ? (
                  <div className="mt-3 inline-flex items-center gap-2 text-sm text-slate-300">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating report...
                  </div>
                ) : (
                  <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                    {reportOutput || "No generated report yet."}
                  </pre>
                )}
              </div>
            </Shell>
          </div>
        </div>
      )}

      {activeTab === "ai-settings" && (
        <Shell
          title="AI Settings"
          subtitle="Language, tone, notifications, model choice, and data usage controls."
        >
          {user?.role === "admin" && (
            <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    External Provider Status
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Shows whether external AI generation is configured and
                    currently reachable.
                  </p>
                </div>
                <button
                  onClick={() => void loadProviderStatus()}
                  disabled={providerStatusLoading}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-orange-200 hover:text-orange-600 disabled:opacity-60"
                >
                  {providerStatusLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Refresh
                </button>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Configured
                  </p>
                  <p
                    className={`mt-1 text-sm font-semibold ${providerStatus?.configured ? "text-emerald-700" : "text-red-700"}`}
                  >
                    {providerStatus?.configured ? "Yes" : "No"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Reachable
                  </p>
                  <p
                    className={`mt-1 text-sm font-semibold ${providerStatus?.reachable ? "text-emerald-700" : "text-amber-700"}`}
                  >
                    {providerStatus?.reachable ? "Yes" : "No"}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-xs text-slate-500 md:grid-cols-2">
                <p>
                  Provider:{" "}
                  <span className="font-semibold text-slate-700">
                    {providerStatus?.providerName || "-"}
                  </span>
                </p>
                <p>
                  Model:{" "}
                  <span className="font-semibold text-slate-700">
                    {providerStatus?.model || "-"}
                  </span>
                </p>
                <p className="md:col-span-2">
                  Last checked:{" "}
                  {providerStatus?.checkedAt
                    ? formatDateTime(providerStatus.checkedAt)
                    : "Not checked yet"}
                </p>
              </div>

              {providerStatus?.message && (
                <p
                  className={`mt-3 rounded-xl px-3 py-2 text-xs ${providerStatus.reachable ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}
                >
                  {providerStatus.message}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
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
              Model & Data Preferences
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {(settingsSection === "all" ||
              settingsSection === "language-tone") && (
              <label className="text-sm text-slate-600">
                <span className="mb-1 block font-medium text-slate-700">
                  AI Assistant Language
                </span>
                <select
                  value={settings.aiLanguage}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aiLanguage: event.target
                        .value as AiSettingsState["aiLanguage"],
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                >
                  <option value="en">English</option>
                  <option value="lg">Luganda</option>
                  <option value="sw">Swahili</option>
                </select>
              </label>
            )}

            {(settingsSection === "all" ||
              settingsSection === "language-tone") && (
              <label className="text-sm text-slate-600">
                <span className="mb-1 block font-medium text-slate-700">
                  Response Tone
                </span>
                <select
                  value={settings.aiTone}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aiTone: event.target.value as AiSettingsState["aiTone"],
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="concise">Concise</option>
                  <option value="brief">Brief</option>
                </select>
              </label>
            )}

            {(settingsSection === "all" ||
              settingsSection === "notifications") && (
              <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.aiAssistantEnabled}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aiAssistantEnabled: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                Enable AI Assistant
              </label>
            )}

            {(settingsSection === "all" ||
              settingsSection === "notifications") && (
              <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.aiSmartInsightsEnabled}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aiSmartInsightsEnabled: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                Enable Smart Insights
              </label>
            )}

            {(settingsSection === "all" ||
              settingsSection === "notifications") && (
              <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.aiDailySummaryEmailEnabled}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aiDailySummaryEmailEnabled: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                Daily Summary Email
              </label>
            )}

            {(settingsSection === "all" ||
              settingsSection === "notifications") && (
              <label className="text-sm text-slate-600">
                <span className="mb-1 block font-medium text-slate-700">
                  Daily Summary Time
                </span>
                <input
                  type="time"
                  value={settings.aiDailySummaryEmailTime}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aiDailySummaryEmailTime: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                />
              </label>
            )}

            {(settingsSection === "all" ||
              settingsSection === "notifications") && (
              <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.aiWeeklyReviewEmailEnabled}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aiWeeklyReviewEmailEnabled: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                Weekly Review Email
              </label>
            )}

            {(settingsSection === "all" ||
              settingsSection === "notifications") && (
              <label className="text-sm text-slate-600">
                <span className="mb-1 block font-medium text-slate-700">
                  Weekly Review Day
                </span>
                <select
                  value={settings.aiWeeklyReviewEmailDay}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aiWeeklyReviewEmailDay: event.target
                        .value as AiSettingsState["aiWeeklyReviewEmailDay"],
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
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
              <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.aiLowStockNotificationEnabled}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aiLowStockNotificationEnabled: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                Low Stock Notification
              </label>
            )}

            {(settingsSection === "all" ||
              settingsSection === "notifications") && (
              <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.aiCreditAlertNotificationEnabled}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aiCreditAlertNotificationEnabled: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                Credit Alert Notification
              </label>
            )}

            {(settingsSection === "all" ||
              settingsSection === "notifications") && (
              <label className="text-sm text-slate-600">
                <span className="mb-1 block font-medium text-slate-700">
                  Credit Alert Threshold
                </span>
                <input
                  type="number"
                  min={0}
                  value={settings.aiCreditAlertThreshold}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aiCreditAlertThreshold: Math.max(
                        0,
                        Number(event.target.value) || 0,
                      ),
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                />
              </label>
            )}

            {(settingsSection === "all" ||
              settingsSection === "model-data") && (
              <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.aiDataUsageAccepted}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aiDataUsageAccepted: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                AI data usage consent
              </label>
            )}

            {(settingsSection === "all" ||
              settingsSection === "model-data") && (
              <label className="text-sm text-slate-600">
                <span className="mb-1 block font-medium text-slate-700">
                  Model Preference
                </span>
                <select
                  value={settings.aiModelPreference}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      aiModelPreference: event.target
                        .value as AiSettingsState["aiModelPreference"],
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                >
                  <option value="standard">Standard (faster)</option>
                  <option value="advanced">Advanced (more detailed)</option>
                  <option value="balanced">Balanced</option>
                  <option value="fast">Fast</option>
                  <option value="accurate">Accurate</option>
                </select>
              </label>
            )}
          </div>

          <ul className="mt-5 space-y-2 text-sm text-slate-500">
            <li>
              Responses remain labeled as AI-generated so staff understand the
              source.
            </li>
            <li>
              Luganda prompts should receive Luganda responses automatically
              when detected.
            </li>
            <li>
              Smart Insights can fall back to cached analysis when live refresh
              is unavailable.
            </li>
          </ul>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => void saveSettings()}
              disabled={savingSettings}
              className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
            >
              {savingSettings && <Loader2 className="h-4 w-4 animate-spin" />}
              Save AI Settings
            </button>
            {settingsStatus && (
              <p className="text-sm text-slate-600">{settingsStatus}</p>
            )}
          </div>
        </Shell>
      )}

      {insights?.narratives &&
        insights.narratives.length > 0 &&
        activeTab !== "assistant" && (
          <Shell
            title="AI Narrative Summary"
            subtitle="Short business takeaways produced from the latest insight run."
          >
            <div className="grid gap-3 md:grid-cols-3">
              {insights.narratives.map((line) => (
                <div
                  key={line}
                  className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600"
                >
                  {line}
                </div>
              ))}
            </div>
          </Shell>
        )}
    </div>
  );
}
