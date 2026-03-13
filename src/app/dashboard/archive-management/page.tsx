"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  RefreshCw,
  RotateCcw,
  Shield,
  CalendarClock,
  Database,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

type FiscalYear = {
  _id: string;
  label: string;
  startDate: string;
  endDate: string;
  status: "active" | "closed" | "archived";
};

type Branch = {
  _id: string;
  name: string;
};

export default function ArchiveManagementPage() {
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchScope, setBranchScope] = useState("");
  const [archiveEnabled, setArchiveEnabled] = useState(false);
  const [autoArchiveAfterDays, setAutoArchiveAfterDays] = useState(365);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [msg, setMsg] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const [fyRes, settingsRes, branchRes] = await Promise.all([
        fetch("/api/fiscal-years"),
        fetch("/api/settings"),
        fetch("/api/branches"),
      ]);

      if (fyRes.ok) {
        const fy = await fyRes.json();
        setFiscalYears(fy.fiscalYears || []);
      }

      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setArchiveEnabled(Boolean(settings.settings?.archiveEnabled));
        setAutoArchiveAfterDays(
          Number(settings.settings?.autoArchiveAfterDays || 365),
        );
      }

      if (branchRes.ok) {
        const branchData = await branchRes.json();
        setBranches(Array.isArray(branchData) ? branchData : []);
      }
    } catch {
      setMsg("Failed to load archive settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveArchiveSettings = async () => {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archiveEnabled, autoArchiveAfterDays }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Failed to save archive settings");
        return;
      }
      setMsg("Archive settings saved");
    } catch {
      setMsg("Failed to save archive settings");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (
    fiscalYearId: string,
    action: "archive" | "set-active",
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
        setMsg(data.error || "Action failed");
        return;
      }
      setMsg(
        action === "archive"
          ? "Fiscal year archived"
          : "Archive restored and set active",
      );
      await fetchData();
    } catch {
      setMsg("Action failed");
    } finally {
      setBusyAction("");
    }
  };

  const visibleFiscalYears = useMemo(() => {
    if (!branchScope) return fiscalYears;
    return fiscalYears;
  }, [fiscalYears, branchScope]);

  const stats = useMemo(() => {
    return {
      total: fiscalYears.length,
      archived: fiscalYears.filter((y) => y.status === "archived").length,
      closed: fiscalYears.filter((y) => y.status === "closed").length,
      active: fiscalYears.filter((y) => y.status === "active").length,
    };
  }, [fiscalYears]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Archive Management
          </h1>
          <p className="mt-1 max-w-2xl text-[14px] text-gray-500">
            Efficiently manage your business data archives with fiscal-year
            level controls for archiving, restoring, and retention automation.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" /> Refresh Data
        </button>
      </div>

      {msg && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {msg}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-sm text-gray-500">
          Loading archive management...
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Database}
              label="Total Fiscal Years"
              value={stats.total.toString()}
            />
            <StatCard
              icon={Archive}
              label="Archived"
              value={stats.archived.toString()}
            />
            <StatCard
              icon={CalendarClock}
              label="Closed"
              value={stats.closed.toString()}
            />
            <StatCard
              icon={Shield}
              label="Active"
              value={stats.active.toString()}
            />
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <h2 className="text-base font-bold text-gray-900">
              Archive Policy
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={archiveEnabled}
                  onChange={(e) => setArchiveEnabled(e.target.checked)}
                />
                Enable automatic archiving
              </label>
              <input
                type="number"
                min={30}
                max={3650}
                value={autoArchiveAfterDays}
                onChange={(e) =>
                  setAutoArchiveAfterDays(Number(e.target.value) || 365)
                }
                className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm"
                placeholder="Retention days"
              />
              <button
                onClick={saveArchiveSettings}
                disabled={saving}
                className="rounded-xl bg-linear-to-r from-blue-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Policy"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <div className="mb-4 grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Branch Scope
                </label>
                <select
                  value={branchScope}
                  onChange={(e) => setBranchScope(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm"
                >
                  <option value="">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                Archiving currently works at fiscal-year level (tenant-wide).
                Branch scope is shown for planning and future branch-level
                archive jobs.
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-blue-100 bg-blue-50/60">
                    <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Fiscal Year
                    </th>
                    <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                      Period
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
                  {visibleFiscalYears.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-gray-400"
                      >
                        No fiscal years found
                      </td>
                    </tr>
                  ) : (
                    visibleFiscalYears.map((year) => (
                      <tr key={year._id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3.5 font-medium text-gray-800">
                          {year.label}
                        </td>
                        <td className="px-4 py-3.5 text-gray-600">
                          {formatDate(year.startDate)} -{" "}
                          {formatDate(year.endDate)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${year.status === "active" ? "bg-emerald-50 text-emerald-700" : year.status === "closed" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-700"}`}
                          >
                            {year.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="inline-flex gap-2">
                            {year.status !== "archived" && (
                              <button
                                onClick={() => runAction(year._id, "archive")}
                                disabled={busyAction === `${year._id}:archive`}
                                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              >
                                <span className="inline-flex items-center gap-1">
                                  <Archive className="h-3.5 w-3.5" /> Archive
                                </span>
                              </button>
                            )}
                            {year.status === "archived" && (
                              <button
                                onClick={() =>
                                  runAction(year._id, "set-active")
                                }
                                disabled={
                                  busyAction === `${year._id}:set-active`
                                }
                                className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                              >
                                <span className="inline-flex items-center gap-1">
                                  <RotateCcw className="h-3.5 w-3.5" /> Restore
                                  Archive
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
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-blue-50 to-indigo-100 text-blue-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[12px] uppercase tracking-wider text-gray-400">
            {label}
          </p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
