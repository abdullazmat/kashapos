"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Calendar,
  Clock,
  ArrowRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useSession } from "../layout";
import { useSearchParams } from "next/navigation";

type CashFlowTab = "report" | "summary" | "periods";

interface PeriodSummary {
  label: string;
  income: number;
  expenses: number;
  netIncome: number;
  salesCount: number;
  expensesCount: number;
  topCategories: { name: string; amount: number }[];
  color: string;
}

export default function CashFlowPage() {
  const { tenant } = useSession();
  const currency = tenant?.settings?.currency || "UGX";
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as CashFlowTab) || "periods";
  const [activeTab, setActiveTab] = useState<CashFlowTab>(initialTab);

  // Sync tab when URL search params change (e.g. sidebar sub-link clicks)
  useEffect(() => {
    const tab = searchParams.get("tab") as CashFlowTab;
    if (tab && ["report", "summary", "periods"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<PeriodSummary[]>([]);
  const [reportData, setReportData] = useState<{
    inflows: {
      date: string;
      description: string;
      amount: number;
      type: string;
    }[];
    outflows: {
      date: string;
      description: string;
      amount: number;
      type: string;
    }[];
    totalInflow: number;
    totalOutflow: number;
  }>({ inflows: [], outflows: [], totalInflow: 0, totalOutflow: 0 });

  const fetchCashFlow = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);

      const monthStart = new Date(now);
      monthStart.setDate(1);

      const yearStart = new Date(now);
      yearStart.setMonth(0, 1);

      const [salesRes, expensesRes] = await Promise.all([
        fetch("/api/sales?limit=500"),
        fetch("/api/expenses"),
      ]);

      const salesData = salesRes.ok ? await salesRes.json() : { sales: [] };
      const expensesData = expensesRes.ok ? await expensesRes.json() : [];
      const allSales = salesData.sales || [];
      const allExpenses = Array.isArray(expensesData)
        ? expensesData
        : expensesData.data || [];

      const calcPeriod = (
        label: string,
        start: Date,
        end: Date,
        color: string,
      ): PeriodSummary => {
        const periodSales = allSales.filter(
          (s: { createdAt: string; status: string }) => {
            const d = new Date(s.createdAt);
            return d >= start && d <= end && s.status === "completed";
          },
        );
        const periodExpenses = allExpenses.filter(
          (e: { date?: string; createdAt?: string }) => {
            const d = new Date(e.date || e.createdAt || "");
            return d >= start && d <= end;
          },
        );

        const income = periodSales.reduce(
          (sum: number, s: { total: number }) => sum + (s.total || 0),
          0,
        );
        const expenses = periodExpenses.reduce(
          (sum: number, e: { amount: number }) => sum + (e.amount || 0),
          0,
        );

        const categoryMap = new Map<string, number>();
        periodExpenses.forEach((e: { category?: string; amount: number }) => {
          const cat = e.category || "Other";
          categoryMap.set(cat, (categoryMap.get(cat) || 0) + (e.amount || 0));
        });
        const topCategories = [...categoryMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, amount]) => ({ name, amount }));

        return {
          label,
          income,
          expenses,
          netIncome: income - expenses,
          salesCount: periodSales.length,
          expensesCount: periodExpenses.length,
          topCategories,
          color,
        };
      };

      setPeriods([
        calcPeriod("Today", todayStart, now, "from-orange-500 to-red-500"),
        calcPeriod(
          "This Week",
          weekStart,
          now,
          "from-green-500 to-emerald-600",
        ),
        calcPeriod(
          "This Month",
          monthStart,
          now,
          "from-blue-500 to-indigo-600",
        ),
        calcPeriod(
          "This Year",
          yearStart,
          now,
          "from-purple-500 to-violet-600",
        ),
      ]);

      // Report data
      const inflows = allSales
        .filter((s: { status: string }) => s.status === "completed")
        .slice(0, 20)
        .map(
          (s: {
            createdAt: string;
            orderNumber: string;
            total: number;
            paymentMethod: string;
          }) => ({
            date: s.createdAt,
            description: `Sale ${s.orderNumber}`,
            amount: s.total,
            type: s.paymentMethod,
          }),
        );
      const outflows = allExpenses
        .slice(0, 20)
        .map(
          (e: {
            date?: string;
            createdAt?: string;
            description?: string;
            category?: string;
            amount: number;
          }) => ({
            date: e.date || e.createdAt || "",
            description: e.description || e.category || "Expense",
            amount: e.amount,
            type: "expense",
          }),
        );
      const totalInflow = allSales
        .filter((s: { status: string }) => s.status === "completed")
        .reduce((sum: number, s: { total: number }) => sum + (s.total || 0), 0);
      const totalOutflow = allExpenses.reduce(
        (sum: number, e: { amount: number }) => sum + (e.amount || 0),
        0,
      );

      setReportData({ inflows, outflows, totalInflow, totalOutflow });
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCashFlow();
  }, [fetchCashFlow]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
            <DollarSign className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Cash Flow</h1>
            <p className="text-[13px] text-gray-400">
              Monitor your cash flow across different time periods
            </p>
          </div>
        </div>
        <button
          onClick={fetchCashFlow}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm transition-all hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {(
          [
            { key: "report", label: "Cash Flow Report" },
            { key: "summary", label: "Cash Flow Summary" },
            { key: "periods", label: "Quick Periods" },
          ] as { key: CashFlowTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-emerald-500" />
        </div>
      ) : activeTab === "periods" ? (
        /* Quick Period Summaries */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                Quick Period Summaries
              </h2>
              <p className="text-[13px] text-gray-400">
                Overview of cash flow across different time periods
              </p>
            </div>
            <button
              onClick={fetchCashFlow}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-md"
            >
              <RefreshCw className="h-4 w-4" /> Refresh Summaries
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {periods.map((p, i) => (
              <div
                key={i}
                className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
              >
                <div
                  className={`bg-gradient-to-r ${p.color} px-5 py-3 flex items-center justify-between`}
                >
                  <h3 className="text-base font-bold text-white">{p.label}</h3>
                  <Calendar className="h-5 w-5 text-white/70" />
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      <div>
                        <p className="text-[11px] text-gray-400 uppercase font-semibold">
                          Income
                        </p>
                        <p className="text-sm font-bold text-gray-800">
                          {formatCurrency(p.income, currency)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      <div>
                        <p className="text-[11px] text-gray-400 uppercase font-semibold">
                          Expenses
                        </p>
                        <p className="text-sm font-bold text-gray-800">
                          {formatCurrency(p.expenses, currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-[11px] text-gray-400 uppercase font-semibold">
                        Net Income
                      </p>
                      <p
                        className={`text-lg font-bold ${p.netIncome >= 0 ? "text-emerald-600" : "text-red-600"}`}
                      >
                        {formatCurrency(p.netIncome, currency)}
                      </p>
                    </div>
                  </div>
                  {p.topCategories.length > 0 && (
                    <div>
                      <p className="text-[11px] text-gray-400 uppercase font-semibold mb-2">
                        Top Categories
                      </p>
                      <div className="space-y-1">
                        {p.topCategories.map((c, ci) => (
                          <div
                            key={ci}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-gray-600">{c.name}</span>
                            <span className="font-medium text-gray-800">
                              {formatCurrency(c.amount, currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === "summary" ? (
        /* Cash Flow Summary */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/20">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[13px] text-gray-400">Total Inflow</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {formatCurrency(reportData.totalInflow, currency)}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/20">
                  <TrendingDown className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[13px] text-gray-400">Total Outflow</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(reportData.totalOutflow, currency)}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[13px] text-gray-400">Net Cash Flow</p>
                  <p
                    className={`text-xl font-bold ${reportData.totalInflow - reportData.totalOutflow >= 0 ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {formatCurrency(
                      reportData.totalInflow - reportData.totalOutflow,
                      currency,
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cash Flow Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {periods.map((p, i) => (
              <div
                key={i}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <h3 className="text-sm font-bold text-gray-800 mb-3">
                  {p.label}
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Income</span>
                    <span className="font-medium text-emerald-600">
                      {formatCurrency(p.income, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Expenses</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(p.expenses, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
                    <span className="text-gray-700 font-semibold">
                      Net Income
                    </span>
                    <span
                      className={`font-bold ${p.netIncome >= 0 ? "text-emerald-600" : "text-red-600"}`}
                    >
                      {formatCurrency(p.netIncome, currency)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Cash Flow Report */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">
                    Total Inflow
                  </h3>
                  <p className="text-lg font-bold text-emerald-600">
                    {formatCurrency(reportData.totalInflow, currency)}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">
                    Total Outflow
                  </h3>
                  <p className="text-lg font-bold text-red-600">
                    {formatCurrency(reportData.totalOutflow, currency)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Inflows */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">
                Recent Inflows (Sales)
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blue-100 bg-blue-50/60">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Date
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Description
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Type
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reportData.inflows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-8 text-center text-gray-400 text-sm"
                    >
                      No inflow records found
                    </td>
                  </tr>
                ) : (
                  reportData.inflows.map((item, i) => (
                    <tr
                      key={i}
                      className="hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="px-5 py-3 text-gray-500">
                        {new Date(item.date).toLocaleDateString("en-UG", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3 text-gray-700 font-medium">
                        {item.description}
                      </td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600">
                          {item.type}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-emerald-600">
                        +{formatCurrency(item.amount, currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Recent Outflows */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">
                Recent Outflows (Expenses)
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blue-100 bg-blue-50/60">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Date
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Description
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reportData.outflows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-5 py-8 text-center text-gray-400 text-sm"
                    >
                      No outflow records found
                    </td>
                  </tr>
                ) : (
                  reportData.outflows.map((item, i) => (
                    <tr
                      key={i}
                      className="hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="px-5 py-3 text-gray-500">
                        {new Date(item.date).toLocaleDateString("en-UG", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3 text-gray-700 font-medium">
                        {item.description}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-red-600">
                        -{formatCurrency(item.amount, currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
