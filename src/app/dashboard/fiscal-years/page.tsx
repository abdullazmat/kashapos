"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  Calendar,
  Download,
  FileText,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSession } from "../layout";

type FiscalYearStatus = "active" | "closed" | "archived";
type FiscalYearCycle = "ura_jul_jun" | "calendar_jan_dec" | "custom";
type FiscalTab = "config" | "summary" | "archive";

type FiscalYearItem = {
  _id: string;
  label: string;
  startDate: string;
  endDate: string;
  cycle: FiscalYearCycle;
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
  topProductCategories?: {
    category: string;
    revenue: number;
  }[];
};

type FiscalApiResponse = {
  fiscalYears: FiscalYearItem[];
  selectedFiscalYearId: string | null;
  summary: FiscalSummary | null;
};

function toDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function defaultStartDateForCycle(cycle: FiscalYearCycle) {
  const now = new Date();
  if (cycle === "calendar_jan_dec") {
    return `${now.getFullYear()}-01-01`;
  }

  const startYear =
    now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}-07-01`;
}

function calculateEndDate(startDateInput: string, cycle: FiscalYearCycle) {
  const start = new Date(startDateInput);
  if (Number.isNaN(start.getTime())) return "";

  if (cycle === "calendar_jan_dec") {
    return `${start.getFullYear()}-12-31`;
  }

  if (cycle === "ura_jul_jun") {
    return `${start.getFullYear() + 1}-06-30`;
  }

  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  end.setDate(end.getDate() - 1);
  return toDateInput(end);
}

function suggestLabel(startDateInput: string, cycle: FiscalYearCycle) {
  const start = new Date(startDateInput);
  if (Number.isNaN(start.getTime())) return "";

  const startYear = start.getFullYear();
  if (cycle === "calendar_jan_dec") {
    return `FY ${startYear}`;
  }

  return `FY ${startYear}/${startYear + 1}`;
}

function downloadFile(filename: string, content: BlobPart, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function buildSummaryCsv(label: string, summary: FiscalSummary) {
  const lines = [
    ["Metric", "Value"],
    ["Fiscal Year", label],
    ["Total Revenue", String(summary.totalRevenue || 0)],
    ["Total Expenses", String(summary.totalExpenses || 0)],
    ["Gross Profit", String(summary.grossProfit || 0)],
    ["Net Profit", String(summary.netProfit || 0)],
    ["VAT/Tax Collected", String(summary.vatCollected || 0)],
    [
      "Outstanding Invoice Count",
      String(summary.outstandingInvoices?.count || 0),
    ],
    [
      "Outstanding Invoice Total",
      String(summary.outstandingInvoices?.total || 0),
    ],
    [],
    ["Monthly Revenue vs Expenses"],
    ["Month", "Revenue", "Expenses"],
    ...(summary.monthlyRevenueVsExpenses || []).map((row) => [
      row.month,
      String(row.revenue),
      String(row.expenses),
    ]),
    [],
    ["Top Product Categories"],
    ["Category", "Revenue"],
    ...(summary.topProductCategories || []).map((row) => [
      row.category,
      String(row.revenue),
    ]),
  ];

  return lines.map((row) => row.join(",")).join("\n");
}

export default function FiscalYearsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tenant } = useSession();
  const currency = tenant?.settings?.currency || "UGX";

  const queryTab = searchParams.get("tab");
  const [tab, setTab] = useState<FiscalTab>(
    queryTab === "summary" || queryTab === "archive" ? queryTab : "config",
  );

  const [fiscalYears, setFiscalYears] = useState<FiscalYearItem[]>([]);
  const [selectedFiscalYearId, setSelectedFiscalYearId] = useState("");
  const [summary, setSummary] = useState<FiscalSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [exporting, setExporting] = useState("");
  const [msg, setMsg] = useState("");

  const [cycle, setCycle] = useState<FiscalYearCycle>("ura_jul_jun");
  const [startDate, setStartDate] = useState(
    defaultStartDateForCycle("ura_jul_jun"),
  );
  const [label, setLabel] = useState(
    suggestLabel(defaultStartDateForCycle("ura_jul_jun"), "ura_jul_jun"),
  );
  const [setActive, setSetActive] = useState(true);
  const [archiveCandidate, setArchiveCandidate] =
    useState<FiscalYearItem | null>(null);

  const endDate = useMemo(
    () => calculateEndDate(startDate, cycle),
    [startDate, cycle],
  );

  const setTabInUrl = useCallback(
    (nextTab: FiscalTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", nextTab);
      router.replace(`/dashboard/fiscal-years?${params.toString()}`);
      setTab(nextTab);
    },
    [router, searchParams],
  );

  const loadFiscalData = useCallback(
    async (targetFiscalYearId?: string) => {
      setMsg("");
      setLoadingSummary(true);
      try {
        const params = new URLSearchParams();
        if (targetFiscalYearId || selectedFiscalYearId) {
          params.set(
            "fiscalYearId",
            targetFiscalYearId || selectedFiscalYearId,
          );
        }

        const suffix = params.toString() ? `?${params.toString()}` : "";
        const res = await fetch(`/api/fiscal-years${suffix}`);
        const data = (await res.json()) as FiscalApiResponse & {
          error?: string;
        };

        if (!res.ok) {
          setMsg(data.error || "Failed to load fiscal-year data");
          return;
        }

        setFiscalYears(data.fiscalYears || []);
        setSummary(data.summary || null);
        if (data.selectedFiscalYearId) {
          setSelectedFiscalYearId(data.selectedFiscalYearId);
        }
      } catch {
        setMsg("Failed to load fiscal-year data");
      } finally {
        setLoading(false);
        setLoadingSummary(false);
      }
    },
    [selectedFiscalYearId],
  );

  useEffect(() => {
    void loadFiscalData();
  }, [loadFiscalData]);

  useEffect(() => {
    if (
      queryTab === "summary" ||
      queryTab === "archive" ||
      queryTab === "config"
    ) {
      setTab(queryTab);
    }
  }, [queryTab]);

  const currentYear = useMemo(
    () =>
      fiscalYears.find((row) => row._id === selectedFiscalYearId) ||
      fiscalYears[0],
    [fiscalYears, selectedFiscalYearId],
  );

  const archivedFiscalYears = useMemo(
    () => fiscalYears.filter((row) => row.status === "archived"),
    [fiscalYears],
  );

  const archiveCandidates = useMemo(
    () => fiscalYears.filter((row) => row.status !== "archived"),
    [fiscalYears],
  );

  const saveConfiguration = async () => {
    if (!label.trim() || !startDate || !endDate) {
      setMsg("Fiscal year label and dates are required");
      return;
    }

    setSavingConfig(true);
    setMsg("");
    try {
      const res = await fetch("/api/fiscal-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          startDate,
          endDate,
          cycle,
          setActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Failed to save fiscal year");
        return;
      }

      setMsg("Fiscal year configuration saved");
      setLabel(suggestLabel(startDate, cycle));
      await loadFiscalData();
    } catch {
      setMsg("Failed to save fiscal year");
    } finally {
      setSavingConfig(false);
    }
  };

  const runArchiveAction = async (fiscalYearId: string) => {
    setBusyAction(`${fiscalYearId}:archive`);
    setMsg("");
    try {
      const res = await fetch(`/api/fiscal-years/${fiscalYearId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Failed to archive fiscal year");
        return;
      }
      setMsg("Fiscal year archived. Records are now locked permanently.");
      setArchiveCandidate(null);
      await loadFiscalData();
    } catch {
      setMsg("Failed to archive fiscal year");
    } finally {
      setBusyAction("");
    }
  };

  const fetchSummaryForFiscalYear = async (fiscalYearId: string) => {
    const res = await fetch(
      `/api/fiscal-years?fiscalYearId=${encodeURIComponent(fiscalYearId)}`,
    );
    const data = (await res.json()) as FiscalApiResponse & { error?: string };
    if (!res.ok || !data.summary) {
      throw new Error(data.error || "Failed to load summary");
    }
    return data.summary;
  };

  const exportSummaryCsv = async (
    targetFiscalYearId: string,
    targetLabel: string,
  ) => {
    setExporting(`${targetFiscalYearId}:csv`);
    try {
      const data = await fetchSummaryForFiscalYear(targetFiscalYearId);
      const csv = buildSummaryCsv(targetLabel, data);
      downloadFile(
        `${targetLabel.replace(/\s+/g, "_")}_summary.csv`,
        csv,
        "text/csv;charset=utf-8;",
      );
    } catch {
      setMsg("Unable to export CSV summary");
    } finally {
      setExporting("");
    }
  };

  const exportSummaryPdf = async (
    targetFiscalYearId: string,
    targetLabel: string,
  ) => {
    setExporting(`${targetFiscalYearId}:pdf`);
    try {
      const response = await fetch(
        `/api/fiscal-years/${encodeURIComponent(targetFiscalYearId)}/export?currency=${encodeURIComponent(currency)}`,
      );
      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const pdfBlob = await response.blob();
      downloadFile(
        `${targetLabel.replace(/\s+/g, "_")}_summary.pdf`,
        pdfBlob,
        "application/pdf",
      );
    } catch {
      setMsg("Unable to export PDF summary");
    } finally {
      setExporting("");
    }
  };

  const kpiCards = [
    {
      label: "Total Revenue",
      value: summary?.totalRevenue || 0,
      boxClass: "border-emerald-100",
      valueClass: "text-emerald-700",
    },
    {
      label: "Total Expenses",
      value: summary?.totalExpenses || 0,
      boxClass: "border-orange-100",
      valueClass: "text-orange-700",
    },
    {
      label: "Gross Profit",
      value: summary?.grossProfit || 0,
      boxClass: "border-blue-100",
      valueClass: "text-blue-700",
    },
    {
      label: "Net Profit",
      value: summary?.netProfit || 0,
      boxClass: "border-violet-100",
      valueClass: "text-violet-700",
    },
  ];

  const monthlyMax = useMemo(() => {
    const rows = summary?.monthlyRevenueVsExpenses || [];
    return rows.reduce(
      (max, row) => Math.max(max, row.revenue, row.expenses),
      1,
    );
  }, [summary]);

  const categoryMax = useMemo(() => {
    const rows = summary?.topProductCategories || [];
    return rows.reduce((max, row) => Math.max(max, row.revenue), 1);
  }, [summary]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Fiscal Year Management
            </h1>
            <p className="text-[13px] text-gray-500">
              URA-compliant fiscal-year configuration, financial summaries, and
              archival controls.
            </p>
          </div>
        </div>

        <button
          onClick={() => void loadFiscalData()}
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
          { key: "config", label: "Configuration" },
          { key: "summary", label: "Financial Summary" },
          { key: "archive", label: "Archive" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTabInUrl(item.key as FiscalTab)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              tab === item.key
                ? "bg-gray-100 text-gray-900"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
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
          Loading fiscal-year management...
        </div>
      ) : (
        <>
          {tab === "config" && (
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <h2 className="text-lg font-bold text-gray-900">
                  Fiscal Year Configuration
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Define the fiscal period and cycle. End date is calculated
                  automatically.
                </p>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Fiscal Year Label
                    </label>
                    <input
                      type="text"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder="FY 2025/2026"
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          if (!label.trim()) {
                            setLabel(suggestLabel(e.target.value, cycle));
                          }
                        }}
                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        End Date (Auto)
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        readOnly
                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Fiscal Cycle
                    </label>
                    <select
                      value={cycle}
                      onChange={(e) => {
                        const nextCycle = e.target.value as FiscalYearCycle;
                        const nextStart = defaultStartDateForCycle(nextCycle);
                        setCycle(nextCycle);
                        if (nextCycle !== "custom") {
                          setStartDate(nextStart);
                        }
                        if (!label.trim()) {
                          setLabel(suggestLabel(nextStart, nextCycle));
                        }
                      }}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm"
                    >
                      <option value="ura_jul_jun">URA Cycle (Jul-Jun)</option>
                      <option value="calendar_jan_dec">
                        Calendar Year (Jan-Dec)
                      </option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2.5">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={setActive}
                        onChange={(e) => setSetActive(e.target.checked)}
                      />
                      Set as active fiscal year
                    </label>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        setActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {setActive ? "Active" : "Closed"}
                    </span>
                  </div>

                  <button
                    onClick={saveConfiguration}
                    disabled={savingConfig}
                    className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 disabled:opacity-50"
                  >
                    {savingConfig ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Calendar className="h-4 w-4" />
                    )}
                    Save Configuration
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <h3 className="text-base font-bold text-gray-900">
                  Existing Fiscal Years
                </h3>
                <div className="mt-3 space-y-2">
                  {fiscalYears.length === 0 ? (
                    <p className="text-sm text-gray-400">
                      No fiscal years configured yet.
                    </p>
                  ) : (
                    fiscalYears.map((year) => (
                      <div
                        key={year._id}
                        className="rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2.5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-gray-800">
                            {year.label}
                          </p>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              year.status === "active"
                                ? "bg-emerald-50 text-emerald-700"
                                : year.status === "closed"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            {year.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatDate(year.startDate)} -{" "}
                          {formatDate(year.endDate)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === "summary" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Fiscal Year Selector
                    </label>
                    <select
                      value={selectedFiscalYearId}
                      onChange={(e) => {
                        setSelectedFiscalYearId(e.target.value);
                        void loadFiscalData(e.target.value);
                      }}
                      className="mt-1.5 min-w-55 rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm"
                    >
                      {fiscalYears.map((year) => (
                        <option key={year._id} value={year._id}>
                          {year.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        currentYear &&
                        void exportSummaryCsv(
                          currentYear._id,
                          currentYear.label,
                        )
                      }
                      disabled={
                        !currentYear || exporting === `${currentYear?._id}:csv`
                      }
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <span className="inline-flex items-center gap-1">
                        <Download className="h-4 w-4" /> Export CSV
                      </span>
                    </button>
                    <button
                      onClick={() =>
                        currentYear &&
                        void exportSummaryPdf(
                          currentYear._id,
                          currentYear.label,
                        )
                      }
                      disabled={
                        !currentYear || exporting === `${currentYear?._id}:pdf`
                      }
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <span className="inline-flex items-center gap-1">
                        <FileText className="h-4 w-4" /> Export PDF
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {kpiCards.map((card) => (
                  <div
                    key={card.label}
                    className={`rounded-2xl border ${card.boxClass} bg-white p-5 shadow-sm`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      {card.label}
                    </p>
                    <p className={`mt-2 text-2xl font-bold ${card.valueClass}`}>
                      {formatCurrency(card.value, currency)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                <div className="rounded-2xl border border-gray-100 bg-white p-5 lg:col-span-2">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Monthly Revenue vs Expenses
                  </h3>
                  <div className="mt-4 space-y-3">
                    {(summary?.monthlyRevenueVsExpenses || []).length === 0 && (
                      <p className="text-sm text-gray-400">
                        No monthly data for selected fiscal year.
                      </p>
                    )}
                    {(summary?.monthlyRevenueVsExpenses || []).map((row) => (
                      <div key={row.month} className="space-y-1">
                        <p className="text-xs text-gray-500">{row.month}</p>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-full rounded bg-gray-100 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500"
                              style={{
                                width: `${(row.revenue / monthlyMax) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="min-w-22.5 text-right text-xs text-emerald-700">
                            {formatCurrency(row.revenue, currency)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-full rounded bg-gray-100 overflow-hidden">
                            <div
                              className="h-full bg-orange-400"
                              style={{
                                width: `${(row.expenses / monthlyMax) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="min-w-22.5 text-right text-xs text-orange-700">
                            {formatCurrency(row.expenses, currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Detailed Stats
                  </h3>
                  <div className="mt-3 space-y-3">
                    <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                      <p className="text-xs uppercase tracking-wider text-blue-700">
                        VAT/Tax Collected
                      </p>
                      <p className="mt-1 text-lg font-bold text-blue-900">
                        {formatCurrency(summary?.vatCollected || 0, currency)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                      <p className="text-xs uppercase tracking-wider text-amber-700">
                        Outstanding Invoices
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        Count: {summary?.outstandingInvoices?.count || 0}
                      </p>
                      <p className="text-lg font-bold text-amber-800">
                        {formatCurrency(
                          summary?.outstandingInvoices?.total || 0,
                          currency,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <h3 className="text-sm font-semibold text-gray-700">
                  Top Product Categories
                </h3>
                <div className="mt-4 space-y-2">
                  {(summary?.topProductCategories || []).length === 0 && (
                    <p className="text-sm text-gray-400">
                      No category data available.
                    </p>
                  )}
                  {(summary?.topProductCategories || []).map((row) => (
                    <div key={row.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{row.category}</span>
                        <span>{formatCurrency(row.revenue, currency)}</span>
                      </div>
                      <div className="h-2 rounded bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500"
                          style={{
                            width: `${(row.revenue / categoryMax) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "archive" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Archived records are read-only. Archiving permanently locks
                records for the selected fiscal period.
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <h3 className="text-base font-bold text-gray-900">
                  Archive Fiscal Year
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Archive only when period close-out is complete.
                </p>

                <div className="mt-3 space-y-2">
                  {archiveCandidates.length === 0 && (
                    <p className="text-sm text-gray-400">
                      No eligible fiscal year available for archiving.
                    </p>
                  )}
                  {archiveCandidates.map((year) => (
                    <div
                      key={year._id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {year.label}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(year.startDate)} -{" "}
                          {formatDate(year.endDate)}
                        </p>
                      </div>
                      <button
                        onClick={() => setArchiveCandidate(year)}
                        disabled={busyAction === `${year._id}:archive`}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <span className="inline-flex items-center gap-1">
                          <Archive className="h-3.5 w-3.5" /> Archive
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-blue-100 bg-blue-50/60">
                        <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                          Fiscal Year
                        </th>
                        <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                          Start
                        </th>
                        <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                          End
                        </th>
                        <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {archivedFiscalYears.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center text-gray-400"
                          >
                            No archived fiscal years found
                          </td>
                        </tr>
                      ) : (
                        archivedFiscalYears.map((year) => (
                          <tr key={year._id} className="hover:bg-gray-50/40">
                            <td className="px-4 py-3.5 font-medium text-gray-800">
                              {year.label}
                            </td>
                            <td className="px-4 py-3.5 text-gray-600">
                              {formatDate(year.startDate)}
                            </td>
                            <td className="px-4 py-3.5 text-gray-600">
                              {formatDate(year.endDate)}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700">
                                Archived
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedFiscalYearId(year._id);
                                    setTabInUrl("summary");
                                    void loadFiscalData(year._id);
                                  }}
                                  className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() =>
                                    void exportSummaryPdf(year._id, year.label)
                                  }
                                  disabled={exporting === `${year._id}:pdf`}
                                  className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                  Export PDF
                                </button>
                                <button
                                  onClick={() =>
                                    void exportSummaryCsv(year._id, year.label)
                                  }
                                  disabled={exporting === `${year._id}:csv`}
                                  className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                  Export CSV
                                </button>
                              </div>
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
        </>
      )}

      {archiveCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-amber-100 p-2 text-amber-700">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Confirm Fiscal Year Archive
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  You are archiving <strong>{archiveCandidate.label}</strong>.
                  This will permanently lock all records for this period.
                </p>
                <p className="mt-2 text-xs text-amber-700">
                  This action cannot be undone from this screen.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setArchiveCandidate(null)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void runArchiveAction(archiveCandidate._id)}
                disabled={busyAction === `${archiveCandidate._id}:archive`}
                className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {busyAction === `${archiveCandidate._id}:archive`
                  ? "Archiving..."
                  : "Confirm Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
