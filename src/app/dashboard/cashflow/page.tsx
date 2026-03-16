"use client";
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BarChart2,
  Calendar,
  Clock,
  DollarSign,
  Landmark,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSession } from "../layout";

type PeriodKey = "today" | "week" | "month" | "year" | "custom";

type CashflowResponse = {
  period: PeriodKey;
  startDate: string;
  endDate: string;
  includeDetails: boolean;
  openingBalance: number;
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  closingBalance: number;
  transactions: Array<{
    id: string;
    date: string;
    description: string;
    type: string;
    direction: "inflow" | "outflow";
    amount: number;
  }>;
};

const periodOptions: Array<{ key: PeriodKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
  { key: "custom", label: "Custom" },
];

function getDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function deriveDatesFromPeriod(period: Exclude<PeriodKey, "custom">) {
  const now = new Date();
  const end = getDateInputValue(now);
  const startDate = new Date(now);
  if (period === "today") return { start: getDateInputValue(startDate), end };
  if (period === "week") {
    startDate.setDate(startDate.getDate() - 6);
    return { start: getDateInputValue(startDate), end };
  }
  if (period === "month") {
    startDate.setDate(1);
    return { start: getDateInputValue(startDate), end };
  }
  startDate.setMonth(0, 1);
  return { start: getDateInputValue(startDate), end };
}

export default function CashFlowPage() {
  const { tenant } = useSession();
  const currency = tenant?.settings?.currency || "UGX";
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "report";

  const today = useMemo(() => getDateInputValue(new Date()), []);
  const [period, setPeriod] = useState<PeriodKey>("today");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [includeDetails, setIncludeDetails] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [report, setReport] = useState<CashflowResponse>({
    period: "today",
    startDate: today,
    endDate: today,
    includeDetails: true,
    openingBalance: 0,
    totalInflows: 0,
    totalOutflows: 0,
    netCashFlow: 0,
    closingBalance: 0,
    transactions: [],
  });

  useEffect(() => {
    if (period === "custom") return;
    const derived = deriveDatesFromPeriod(period);
    setStartDate(derived.start);
    setEndDate(derived.end);
  }, [period]);

  const fetchCashflow = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        period,
        startDate,
        endDate,
        includeDetails: includeDetails ? "true" : "false",
      });
      const res = await fetch(`/api/cashflow?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load cash flow report");
      } else {
        setReport(data as CashflowResponse);
      }
    } catch {
      setError("Failed to load cash flow report");
    }
    setLoading(false);
  }, [period, startDate, endDate, includeDetails]);

  useEffect(() => {
    void fetchCashflow();
  }, [fetchCashflow]);

  const inflowsByType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of report.transactions) {
      if (tx.direction === "inflow")
        map[tx.type] = (map[tx.type] ?? 0) + tx.amount;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [report.transactions]);

  const outflowsByType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of report.transactions) {
      if (tx.direction === "outflow")
        map[tx.type] = (map[tx.type] ?? 0) + tx.amount;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [report.transactions]);

  const noExpenseData = !loading && report.totalOutflows === 0;

  type DrilldownCard = {
    label: string;
    value: number;
    color: string;
    txDirection?: "inflow" | "outflow";
  };
  const [drilldownCard, setDrilldownCard] = useState<DrilldownCard | null>(
    null,
  );

  const drilldownTxList = useMemo(() => {
    if (!drilldownCard) return [];
    if (drilldownCard.txDirection) {
      return report.transactions.filter(
        (tx) => tx.direction === drilldownCard.txDirection,
      );
    }
    return report.transactions;
  }, [drilldownCard, report.transactions]);

  const tabMeta: Record<string, { title: string; subtitle: string }> = {
    report: {
      title: "Cash Flow Report",
      subtitle:
        "Analyze your financial performance with detailed cash flow insights",
    },
    summary: {
      title: "Cash Flow Summary",
      subtitle: "Overview of inflows and outflows grouped by transaction type",
    },
    periods: {
      title: "Quick Periods",
      subtitle: "Compare cash flow across common time periods at a glance",
    },
  };
  const { title, subtitle } = tabMeta[activeTab] ?? tabMeta.report;

  const val = (n: number) => (loading ? "—" : formatCurrency(n, currency));

  /* Shared parameters panel: period pills + date pickers */
  const ParametersPanel = ({
    showDetails = false,
  }: {
    showDetails?: boolean;
  }) => (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
        <h2 className="text-sm font-bold text-gray-800">Report Parameters</h2>
        <span className="text-[11px] text-gray-400">
          {formatDate(startDate)} — {formatDate(endDate)}
        </span>
      </div>
      {/* Period quick-select pills */}
      <div className="flex flex-wrap gap-2 border-b border-gray-50 px-5 py-3">
        {periodOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setPeriod(opt.key)}
            className={`rounded-lg border px-4 py-1.5 text-[12px] font-semibold transition-all ${
              period === opt.key
                ? "border-teal-500 bg-teal-500 text-white shadow-sm shadow-teal-500/20"
                : "border-gray-200 bg-gray-50 text-gray-500 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {/* Date inputs */}
      <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPeriod("custom");
            }}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPeriod("custom");
            }}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
        {showDetails && (
          <div className="flex items-end sm:col-span-2 lg:col-span-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100">
              <input
                type="checkbox"
                checked={includeDetails}
                onChange={(e) => setIncludeDetails(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 accent-teal-600"
              />
              Include transaction details
            </label>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/20">
            {activeTab === "summary" ? (
              <BarChart2 className="h-5 w-5 text-white" />
            ) : activeTab === "periods" ? (
              <Clock className="h-5 w-5 text-white" />
            ) : (
              <Calendar className="h-5 w-5 text-white" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-[13px] text-gray-500">{subtitle}</p>
          </div>
        </div>
        <button
          onClick={() => void fetchCashflow()}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {noExpenseData && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>
            <strong>No expense data found for this period.</strong> Outflows are
            zero because no expenses have been recorded yet. Once expenses are
            entered, cash flow figures will reflect correctly.
          </span>
        </div>
      )}

      {/* ── REPORT tab ─────────────────────────────────────────────── */}
      {(activeTab === "report" || activeTab === "") && (
        <>
          <ParametersPanel showDetails />

          {/* Inflow / Outflow / Net row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Total Inflows
                </p>
                <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-emerald-600">
                {val(report.totalInflows)}
              </p>
            </div>
            <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Total Outflows
                </p>
                <div className="rounded-lg bg-red-100 p-2 text-red-700">
                  <TrendingDown className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-red-600">
                {val(report.totalOutflows)}
              </p>
            </div>
            <div
              className={`rounded-2xl border p-5 shadow-sm ${
                report.netCashFlow >= 0
                  ? "border-teal-100 bg-teal-50/40"
                  : "border-red-100 bg-red-50/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Net Cash Flow
                </p>
                <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <p
                className={`mt-2 text-2xl font-bold ${
                  report.netCashFlow >= 0 ? "text-teal-700" : "text-red-600"
                }`}
              >
                {loading
                  ? "—"
                  : (report.netCashFlow >= 0 ? "+" : "") +
                    formatCurrency(report.netCashFlow, currency)}
              </p>
            </div>
          </div>

          {/* Balance flow: Opening → Net → Closing */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-3.5">
              <h3 className="text-sm font-bold text-gray-800">Balance Flow</h3>
            </div>
            <div className="flex flex-wrap items-center justify-around gap-6 px-6 py-6">
              {/* Opening Balance */}
              <div className="flex flex-col items-center gap-1.5 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                  <Wallet className="h-5 w-5 text-gray-600" />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Opening Balance
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {val(report.openingBalance)}
                </p>
              </div>

              <ArrowRight className="h-5 w-5 shrink-0 text-gray-300" />

              {/* Net Cash Flow */}
              <div className="flex flex-col items-center gap-1.5 text-center">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    report.netCashFlow >= 0 ? "bg-teal-100" : "bg-red-100"
                  }`}
                >
                  <DollarSign
                    className={`h-5 w-5 ${
                      report.netCashFlow >= 0 ? "text-teal-700" : "text-red-700"
                    }`}
                  />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Net Cash Flow
                </p>
                <p
                  className={`text-xl font-bold ${
                    report.netCashFlow >= 0 ? "text-teal-700" : "text-red-600"
                  }`}
                >
                  {loading
                    ? "—"
                    : (report.netCashFlow >= 0 ? "+" : "") +
                      formatCurrency(report.netCashFlow, currency)}
                </p>
              </div>

              <ArrowRight className="h-5 w-5 shrink-0 text-gray-300" />

              {/* Closing Balance */}
              <div className="flex flex-col items-center gap-1.5 text-center">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    report.closingBalance >= 0 ? "bg-emerald-100" : "bg-red-100"
                  }`}
                >
                  <Landmark
                    className={`h-5 w-5 ${
                      report.closingBalance >= 0
                        ? "text-emerald-700"
                        : "text-red-700"
                    }`}
                  />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Closing Balance
                </p>
                <p
                  className={`text-xl font-bold ${
                    report.closingBalance >= 0
                      ? "text-gray-900"
                      : "text-red-600"
                  }`}
                >
                  {val(report.closingBalance)}
                </p>
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          {includeDetails && (
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
                <h3 className="text-sm font-bold text-gray-800">
                  Transaction Details
                </h3>
                <span className="text-xs text-gray-400">
                  {formatDate(report.startDate)} — {formatDate(report.endDate)}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-blue-100 bg-blue-50/60 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Description</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Direction</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-10 text-center text-gray-400"
                        >
                          Loading transactions…
                        </td>
                      </tr>
                    ) : report.transactions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-10 text-center text-gray-400"
                        >
                          No transactions found for selected period
                        </td>
                      </tr>
                    ) : (
                      report.transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-gray-50/60">
                          <td className="px-5 py-3 text-gray-500">
                            {formatDate(tx.date)}
                          </td>
                          <td className="px-5 py-3 font-medium text-gray-700">
                            {tx.description}
                          </td>
                          <td className="px-5 py-3 capitalize text-gray-500">
                            {tx.type}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                tx.direction === "inflow"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-red-50 text-red-600"
                              }`}
                            >
                              {tx.direction}
                            </span>
                          </td>
                          <td
                            className={`px-5 py-3 text-right font-semibold ${
                              tx.direction === "inflow"
                                ? "text-emerald-600"
                                : "text-red-600"
                            }`}
                          >
                            {tx.direction === "inflow" ? "+" : "−"}
                            {formatCurrency(tx.amount, currency)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── SUMMARY tab ────────────────────────────────────────────── */}
      {activeTab === "summary" && (
        <>
          <ParametersPanel />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Total Inflows
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-600">
                {val(report.totalInflows)}
              </p>
            </div>
            <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Total Outflows
              </p>
              <p className="mt-2 text-2xl font-bold text-red-600">
                {val(report.totalOutflows)}
              </p>
            </div>
            <div
              className={`rounded-2xl border p-5 shadow-sm ${
                report.netCashFlow >= 0
                  ? "border-teal-100 bg-teal-50/40"
                  : "border-red-100"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Net Cash Flow
              </p>
              <p
                className={`mt-2 text-2xl font-bold ${
                  report.netCashFlow >= 0 ? "text-teal-700" : "text-red-600"
                }`}
              >
                {loading
                  ? "—"
                  : (report.netCashFlow >= 0 ? "+" : "") +
                    formatCurrency(report.netCashFlow, currency)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-3.5">
                <h3 className="text-sm font-bold text-gray-800">
                  Inflows by Type
                </h3>
              </div>
              {loading ? (
                <p className="py-10 text-center text-sm text-gray-400">
                  Loading…
                </p>
              ) : inflowsByType.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-400">
                  No inflows for this period
                </p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {inflowsByType.map(([type, amount]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between px-5 py-3"
                    >
                      <span className="text-sm font-medium capitalize text-gray-700">
                        {type}
                      </span>
                      <span className="text-sm font-semibold text-emerald-600">
                        +{formatCurrency(amount, currency)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between bg-emerald-50/50 px-5 py-3">
                    <span className="text-sm font-bold text-gray-800">
                      Total
                    </span>
                    <span className="text-sm font-bold text-emerald-600">
                      +{formatCurrency(report.totalInflows, currency)}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-3.5">
                <h3 className="text-sm font-bold text-gray-800">
                  Outflows by Type
                </h3>
              </div>
              {loading ? (
                <p className="py-10 text-center text-sm text-gray-400">
                  Loading…
                </p>
              ) : outflowsByType.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-400">
                  No outflows for this period
                </p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {outflowsByType.map(([type, amount]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between px-5 py-3"
                    >
                      <span className="text-sm font-medium capitalize text-gray-700">
                        {type}
                      </span>
                      <span className="text-sm font-semibold text-red-600">
                        −{formatCurrency(amount, currency)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between bg-red-50/50 px-5 py-3">
                    <span className="text-sm font-bold text-gray-800">
                      Total
                    </span>
                    <span className="text-sm font-bold text-red-600">
                      −{formatCurrency(report.totalOutflows, currency)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── QUICK PERIODS tab ──────────────────────────────────────── */}
      {activeTab === "periods" && (
        <>
          <ParametersPanel />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {(
              [
                {
                  label: "Total Inflows",
                  value: report.totalInflows,
                  color: "text-emerald-600",
                  icon: <TrendingUp className="h-4 w-4" />,
                  bg: "bg-emerald-100 text-emerald-700",
                },
                {
                  label: "Total Outflows",
                  value: report.totalOutflows,
                  color: "text-red-600",
                  icon: <TrendingDown className="h-4 w-4" />,
                  bg: "bg-red-100 text-red-700",
                },
                {
                  label: "Net Cash Flow",
                  value: report.netCashFlow,
                  color:
                    report.netCashFlow >= 0 ? "text-teal-700" : "text-red-600",
                  icon: <DollarSign className="h-4 w-4" />,
                  bg: "bg-blue-100 text-blue-700",
                },
                {
                  label: "Opening Balance",
                  value: report.openingBalance,
                  color: "text-gray-900",
                  icon: <Wallet className="h-4 w-4" />,
                  bg: "bg-gray-100 text-gray-700",
                },
                {
                  label: "Closing Balance",
                  value: report.closingBalance,
                  color:
                    report.closingBalance >= 0
                      ? "text-gray-900"
                      : "text-red-600",
                  icon: <Landmark className="h-4 w-4" />,
                  bg: "bg-blue-100 text-blue-700",
                },
              ] as const
            ).map(({ label, value, color, icon, bg }) => {
              const txDir: "inflow" | "outflow" | undefined =
                label === "Total Inflows"
                  ? "inflow"
                  : label === "Total Outflows"
                    ? "outflow"
                    : undefined;
              const hasTransactions =
                txDir !== undefined ||
                label === "Net Cash Flow" ||
                label === "Closing Balance";
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    if (!hasTransactions) return;
                    setDrilldownCard({
                      label,
                      value,
                      color,
                      txDirection: txDir,
                    });
                  }}
                  className={`flex min-h-25 flex-col justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm text-left transition-all ${hasTransactions ? "cursor-pointer hover:border-teal-300 hover:shadow-md" : "cursor-default"}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-medium text-gray-500">
                      {label}
                    </p>
                    <div className={`rounded-lg p-2 ${bg}`}>{icon}</div>
                  </div>
                  <p className={`mt-2 text-2xl font-bold ${color}`}>
                    {val(value)}
                  </p>
                  {hasTransactions && (
                    <p className="mt-1 text-[10px] text-gray-400">
                      Tap for details →
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ── Drilldown Modal ─────────────────────────────────────────── */}
      {drilldownCard && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center"
          onClick={() => setDrilldownCard(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {drilldownCard.label}
                </h3>
                <p className={`text-xl font-bold ${drilldownCard.color}`}>
                  {val(drilldownCard.value)}
                </p>
              </div>
              <button
                onClick={() => setDrilldownCard(null)}
                className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "65vh" }}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Description</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {drilldownTxList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-10 text-center text-gray-400"
                      >
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    drilldownTxList.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50/60">
                        <td className="px-5 py-3 text-gray-500">
                          {formatDate(tx.date)}
                        </td>
                        <td className="px-5 py-3 font-medium text-gray-700">
                          {tx.description}
                        </td>
                        <td className="px-5 py-3 capitalize text-gray-500">
                          {tx.type}
                        </td>
                        <td
                          className={`px-5 py-3 text-right font-semibold ${
                            tx.direction === "inflow"
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {tx.direction === "inflow" ? "+" : "−"}
                          {formatCurrency(tx.amount, currency)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
