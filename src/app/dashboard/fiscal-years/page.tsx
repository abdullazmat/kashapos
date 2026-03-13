"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  BarChart3,
  RefreshCw,
  Archive,
  CheckCircle2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSession } from "../layout";

type FiscalYearStatus = "active" | "closed" | "archived";

type FiscalYearItem = {
  _id: string;
  label: string;
  startDate: string;
  endDate: string;
  cycle: "ura_jul_jun" | "calendar_jan_dec" | "custom";
  status: FiscalYearStatus;
  createdAt: string;
};

type FiscalSummary = {
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  vatCollected: number;
  outstandingInvoices: { count: number; total: number };
  monthlyRevenueVsExpenses: {
    month: string;
    revenue: number;
    expenses: number;
  }[];
};

type Branch = {
  _id: string;
  name: string;
};

export default function FiscalYearsPage() {
  const { tenant } = useSession();
  const currency = tenant?.settings?.currency || "UGX";

  const [tab, setTab] = useState<"calculate" | "summaries">("calculate");
  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [busyAction, setBusyAction] = useState<string>("");

  const [fiscalYears, setFiscalYears] = useState<FiscalYearItem[]>([]);
  const [summary, setSummary] = useState<FiscalSummary | null>(null);
  const [selectedFiscalYearId, setSelectedFiscalYearId] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [msg, setMsg] = useState("");

  const fetchFiscalSummary = useCallback(
    async (yearId?: string, selectedBranchId?: string) => {
      setLoadingSummary(true);
      setMsg("");
      try {
        const params = new URLSearchParams();
        const targetYearId = yearId || selectedFiscalYearId;
        const targetBranchId = selectedBranchId ?? branchId;
        if (targetYearId) params.set("fiscalYearId", targetYearId);
        if (targetBranchId) params.set("branchId", targetBranchId);

        const res = await fetch(`/api/fiscal-years?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          setMsg(data.error || "Failed to load fiscal summary");
          return;
        }

        setFiscalYears(data.fiscalYears || []);
        setSummary(data.summary || null);
        if (data.selectedFiscalYearId) {
          setSelectedFiscalYearId(data.selectedFiscalYearId);
        }
      } catch {
        setMsg("Failed to load fiscal summary");
      } finally {
        setLoadingSummary(false);
      }
    },
    [selectedFiscalYearId, branchId],
  );

  const fetchInitial = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, branchesRes] = await Promise.all([
        fetch("/api/fiscal-years"),
        fetch("/api/branches"),
      ]);

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setFiscalYears(data.fiscalYears || []);
        setSummary(data.summary || null);
        if (data.selectedFiscalYearId) {
          setSelectedFiscalYearId(data.selectedFiscalYearId);
        }
      }

      if (branchesRes.ok) {
        const branchData = await branchesRes.json();
        setBranches(Array.isArray(branchData) ? branchData : []);
      }
    } catch {
      setMsg("Failed to load fiscal management data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  const runFiscalAction = async (
    fiscalYearId: string,
    action: "set-active" | "close" | "archive",
  ) => {
    setBusyAction(`${fiscalYearId}:${action}`);
    setMsg("");
    try {
      const res = await fetch(`/api/fiscal-years/${fiscalYearId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Fiscal action failed");
        return;
      }
      await fetchFiscalSummary(selectedFiscalYearId || fiscalYearId, branchId);
      setMsg("Fiscal year updated successfully");
    } catch {
      setMsg("Fiscal action failed");
    } finally {
      setBusyAction("");
    }
  };

  const cards = useMemo(
    () => [
      {
        label: "Revenue",
        value: summary?.totalRevenue || 0,
        color: "text-emerald-700",
      },
      {
        label: "Expenses",
        value: summary?.totalExpenses || 0,
        color: "text-orange-700",
      },
      {
        label: "Gross Profit",
        value: summary?.grossProfit || 0,
        color: "text-blue-700",
      },
      {
        label: "Net Profit",
        value: summary?.netProfit || 0,
        color: "text-violet-700",
      },
    ],
    [summary],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Branch Financials
            </h1>
            <p className="text-[13px] text-gray-500">
              Calculate and view branch-level financial summaries for fiscal
              years
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchFiscalSummary()}
          disabled={loadingSummary}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <span className="inline-flex items-center gap-2">
            <RefreshCw
              className={`h-4 w-4 ${loadingSummary ? "animate-spin" : ""}`}
            />
            Refresh
          </span>
        </button>
      </div>

      <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 w-fit">
        {[
          { key: "calculate", label: "Calculate Summary", icon: BarChart3 },
          { key: "summaries", label: "View Summaries", icon: Calendar },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key as "calculate" | "summaries")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${tab === item.key ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-50"}`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </div>

      {msg && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {msg}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-sm text-gray-500">
          Loading fiscal management...
        </div>
      ) : (
        <>
          {tab === "calculate" && (
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="rounded-2xl border border-gray-100 bg-white p-5 lg:col-span-1">
                <h2 className="text-lg font-bold text-gray-900">
                  Calculate Branch Financial Summary
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Trigger financial calculations for a specific fiscal year and
                  optional branch.
                </p>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Fiscal Year
                    </label>
                    <select
                      value={selectedFiscalYearId}
                      onChange={(e) => setSelectedFiscalYearId(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm"
                    >
                      <option value="">Select fiscal year</option>
                      {fiscalYears.map((year) => (
                        <option key={year._id} value={year._id}>
                          {year.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Branch (Optional)
                    </label>
                    <select
                      value={branchId}
                      onChange={(e) => setBranchId(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm"
                    >
                      <option value="">Use Active Branch</option>
                      {branches.map((branch) => (
                        <option key={branch._id} value={branch._id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() =>
                      fetchFiscalSummary(selectedFiscalYearId, branchId)
                    }
                    disabled={loadingSummary || !selectedFiscalYearId}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 disabled:opacity-50"
                  >
                    {loadingSummary ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <BarChart3 className="h-4 w-4" />
                    )}
                    Calculate Summary
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5 lg:col-span-2">
                <h3 className="text-sm font-semibold text-gray-700">
                  Summary Snapshot
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {cards.map((card) => (
                    <div
                      key={card.label}
                      className="rounded-xl border border-gray-100 bg-gray-50/60 p-3"
                    >
                      <p className="text-[11px] uppercase tracking-wider text-gray-500">
                        {card.label}
                      </p>
                      <p className={`mt-2 text-base font-bold ${card.color}`}>
                        {formatCurrency(card.value, currency)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-xl border border-gray-100 p-4">
                  <p className="text-sm font-semibold text-gray-700">
                    Outstanding Invoices
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Count: {summary?.outstandingInvoices.count || 0}
                  </p>
                  <p className="text-lg font-bold text-amber-700">
                    {formatCurrency(
                      summary?.outstandingInvoices.total || 0,
                      currency,
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {tab === "summaries" && (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-blue-100 bg-blue-50/60">
                      <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                        Fiscal Year
                      </th>
                      <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                        Period
                      </th>
                      <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                        Status
                      </th>
                      <th className="px-5 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                        Created
                      </th>
                      <th className="px-5 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {fiscalYears.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-10 text-center text-gray-400"
                        >
                          No fiscal years found
                        </td>
                      </tr>
                    ) : (
                      fiscalYears.map((year) => (
                        <tr key={year._id} className="hover:bg-gray-50/50">
                          <td className="px-5 py-3.5 font-medium text-gray-800">
                            {year.label}
                          </td>
                          <td className="px-5 py-3.5 text-gray-600">
                            {formatDate(year.startDate)} -{" "}
                            {formatDate(year.endDate)}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${year.status === "active" ? "bg-emerald-50 text-emerald-700" : year.status === "closed" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-700"}`}
                            >
                              {year.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-gray-500">
                            {formatDate(year.createdAt)}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="inline-flex gap-2">
                              {year.status !== "active" && (
                                <button
                                  onClick={() =>
                                    runFiscalAction(year._id, "set-active")
                                  }
                                  disabled={
                                    busyAction === `${year._id}:set-active`
                                  }
                                  className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                                >
                                  <span className="inline-flex items-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Set
                                    Active
                                  </span>
                                </button>
                              )}
                              {year.status === "active" && (
                                <button
                                  onClick={() =>
                                    runFiscalAction(year._id, "close")
                                  }
                                  disabled={busyAction === `${year._id}:close`}
                                  className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                                >
                                  Close
                                </button>
                              )}
                              {year.status !== "archived" && (
                                <button
                                  onClick={() =>
                                    runFiscalAction(year._id, "archive")
                                  }
                                  disabled={
                                    busyAction === `${year._id}:archive`
                                  }
                                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                  <span className="inline-flex items-center gap-1">
                                    <Archive className="h-3.5 w-3.5" /> Archive
                                  </span>
                                </button>
                              )}
                            </div>
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

      <div className="rounded-xl border border-gray-100 bg-white p-4">
        <p className="text-sm font-semibold text-gray-700">
          Monthly Revenue vs Expenses
        </p>
        <div className="mt-3 space-y-2">
          {(summary?.monthlyRevenueVsExpenses || []).map((row) => {
            const max = Math.max(row.revenue, row.expenses, 1);
            return (
              <div key={row.month} className="space-y-1">
                <p className="text-xs text-gray-500">{row.month}</p>
                <div className="h-2 rounded bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${(row.revenue / max) * 100}%` }}
                  />
                </div>
                <div className="h-2 rounded bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-orange-400"
                    style={{ width: `${(row.expenses / max) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
          {(summary?.monthlyRevenueVsExpenses || []).length === 0 && (
            <p className="text-sm text-gray-400">
              No monthly data yet for the selected fiscal period.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
        Branch filter applies to sales and expenses. Invoice balances remain
        tenant-level because invoices are not branch-scoped in current data
        model.
      </div>
    </div>
  );
}
