"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  TrendingUp,
  Eye,
  Calendar,
  X,
  Banknote,
  CreditCard,
  Smartphone,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  Filter,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Save,
  Trash2,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useSession } from "../layout";

interface SaleItem {
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
}

interface Sale {
  _id: string;
  orderNumber: string;
  customerId?: { name: string; phone: string };
  cashierId?: { name: string };
  items: SaleItem[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

export default function SalesPage() {
  const { tenant } = useSession();
  const currency = tenant?.settings?.currency || "UGX";
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [viewSale, setViewSale] = useState<Sale | null>(null);
  const [selectedStatus, setSelectedStatus] = useState("completed");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [pageError, setPageError] = useState("");

  const fetchSales = useCallback(async () => {
    setLoading(true);
    setPageError("");
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "20",
      ...(statusFilter && { status: statusFilter }),
      ...(fromDate && { from: fromDate }),
      ...(toDate && { to: toDate }),
    });
    try {
      const res = await fetch(`/api/sales?${params}`);
      if (res.ok) {
        const d = await res.json();
        setSales(d.sales || []);
        setTotal(d.total || 0);
      } else {
        const payload = await res.json();
        setPageError(payload.error || "Failed to load sales");
      }
    } catch (err) {
      console.error(err);
      setPageError("Failed to load sales");
    }
    setLoading(false);
  }, [page, statusFilter, fromDate, toDate]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  useEffect(() => {
    if (!viewSale) return;
    setSelectedStatus(viewSale.status);
    setActionError("");
  }, [viewSale]);

  async function updateSaleStatus() {
    if (!viewSale || actionLoading || selectedStatus === viewSale.status)
      return;

    setActionLoading(true);
    setActionError("");

    try {
      const res = await fetch(`/api/sales/${viewSale._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selectedStatus }),
      });
      const payload = await res.json();

      if (!res.ok) {
        setActionError(payload.error || "Failed to update sale");
        return;
      }

      setViewSale((current) =>
        current
          ? { ...current, status: payload.sale?.status || selectedStatus }
          : current,
      );
      await fetchSales();
    } catch {
      setActionError("Failed to update sale");
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteSale() {
    if (!viewSale || actionLoading) return;

    setActionLoading(true);
    setActionError("");

    try {
      const res = await fetch(`/api/sales/${viewSale._id}`, {
        method: "DELETE",
      });
      const payload = await res.json();

      if (!res.ok) {
        setActionError(payload.error || "Failed to delete sale");
        return;
      }

      setViewSale(null);
      await fetchSales();
    } catch {
      setActionError("Failed to delete sale");
    } finally {
      setActionLoading(false);
    }
  }

  const totalPages = Math.ceil(total / 20);

  // Stats derived from loaded sales
  const stats = useMemo(() => {
    const completed = sales.filter((s) => s.status === "completed");
    const totalRevenue = completed.reduce((a, s) => a + s.total, 0);
    const avgOrder = completed.length > 0 ? totalRevenue / completed.length : 0;
    return {
      totalRevenue,
      completedCount: completed.length,
      avgOrder,
      totalCount: total,
    };
  }, [sales, total]);

  const statusColor: Record<string, string> = {
    completed: "bg-emerald-50 text-emerald-700 ring-1 ring-amber-600/20",
    pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
    refunded: "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20",
    voided: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
  };

  const paymentIcon: Record<string, React.ReactNode> = {
    cash: <Banknote className="h-3.5 w-3.5" />,
    card: <CreditCard className="h-3.5 w-3.5" />,
    mobile_money: <Smartphone className="h-3.5 w-3.5" />,
    split: <Receipt className="h-3.5 w-3.5" />,
  };

  const paymentLabel: Record<string, string> = {
    cash: "Cash",
    card: "Card",
    mobile_money: "Mobile Money",
    split: "Split",
  };

  const summaryCards = [
    {
      label: "Total Sales",
      value: formatCurrency(stats.totalRevenue, currency),
      icon: TrendingUp,
      gradient: "from-orange-500 to-amber-600",
      shadow: "shadow-orange-500/20",
    },
    {
      label: "Orders",
      value: stats.totalCount.toString(),
      icon: ShoppingCart,
      gradient: "from-blue-500 to-indigo-600",
      shadow: "shadow-blue-500/20",
    },
    {
      label: "Completed",
      value: stats.completedCount.toString(),
      icon: ArrowUpRight,
      gradient: "from-amber-500 to-green-600",
      shadow: "shadow-amber-500/20",
    },
    {
      label: "Avg. Order",
      value: formatCurrency(stats.avgOrder, currency),
      icon: Banknote,
      gradient: "from-violet-500 to-purple-600",
      shadow: "shadow-violet-500/20",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/20">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
            <p className="text-[13px] text-gray-500">
              Track and manage all sales transactions
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 transition-all hover:shadow-lg hover:shadow-gray-200/50"
          >
            <div
              className="absolute -right-3 -top-3 h-20 w-20 rounded-full bg-gradient-to-br opacity-[0.07] group-hover:opacity-[0.12] transition-opacity"
              style={{
                backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))`,
              }}
            />
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} shadow-md ${card.shadow}`}
              >
                <card.icon className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-[13px] text-gray-500">{card.label}</p>
                <p className="text-lg font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      {pageError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex items-center gap-2 text-gray-400">
          <Filter className="h-4 w-4" />
          <span className="text-[13px] font-medium">Filters</span>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        >
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="refunded">Refunded</option>
          <option value="voided">Voided</option>
        </select>
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-1.5">
          <Calendar className="h-4 w-4 text-gray-400" />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="bg-transparent text-sm outline-none"
          />
          <span className="text-xs text-gray-300">—</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="bg-transparent text-sm outline-none"
          />
        </div>
        {(statusFilter || fromDate || toDate) && (
          <button
            onClick={() => {
              setStatusFilter("");
              setFromDate("");
              setToDate("");
              setPage(1);
            }}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Sales Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="px-5 py-3.5 text-left text-[13px] font-semibold text-gray-600">
                Order #
              </th>
              <th className="px-5 py-3.5 text-left text-[13px] font-semibold text-gray-600">
                Date & Time
              </th>
              <th className="px-5 py-3.5 text-left text-[13px] font-semibold text-gray-600">
                Customer
              </th>
              <th className="px-5 py-3.5 text-left text-[13px] font-semibold text-gray-600">
                Cashier
              </th>
              <th className="px-5 py-3.5 text-left text-[13px] font-semibold text-gray-600">
                Payment
              </th>
              <th className="px-5 py-3.5 text-right text-[13px] font-semibold text-gray-600">
                Total
              </th>
              <th className="px-5 py-3.5 text-center text-[13px] font-semibold text-gray-600">
                Status
              </th>
              <th className="px-5 py-3.5 text-right text-[13px] font-semibold text-gray-600"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-orange-500" />
                    <span className="text-sm text-gray-400">
                      Loading sales...
                    </span>
                  </div>
                </td>
              </tr>
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                      <TrendingUp className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="font-medium text-gray-500">No sales found</p>
                    <p className="text-[13px] text-gray-400">
                      Try adjusting your filters
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              sales.map((s) => (
                <tr
                  key={s._id}
                  className="group transition-colors hover:bg-gray-50/80"
                >
                  <td className="px-5 py-3.5">
                    <span className="rounded-lg bg-gray-100 px-2 py-1 font-mono text-xs font-semibold text-gray-700">
                      {s.orderNumber}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {formatDateTime(s.createdAt)}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200 text-[10px] font-bold text-gray-500">
                        {(s.customerId?.name || "W")[0]}
                      </div>
                      <span className="text-gray-700">
                        {s.customerId?.name || "Walk-in"}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {s.cashierId?.name || "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      {paymentIcon[s.paymentMethod]}
                      <span className="text-[13px]">
                        {paymentLabel[s.paymentMethod] || s.paymentMethod}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-gray-900">
                    {formatCurrency(s.total, currency)}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusColor[s.status] || ""}`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => setViewSale(s)}
                      className="rounded-lg p-1.5 text-gray-400 opacity-0 transition-all hover:bg-orange-50 hover:text-orange-600 group-hover:opacity-100"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3.5">
            <span className="text-[13px] text-gray-500">
              Page <span className="font-medium text-gray-700">{page}</span> of{" "}
              <span className="font-medium text-gray-700">{totalPages}</span>
              <span className="ml-2 text-gray-300">·</span>
              <span className="ml-2">{total} results</span>
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sale Detail Modal */}
      {viewSale && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setViewSale(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-0 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-md shadow-orange-500/20">
                  <Receipt className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">
                    Sale #{viewSale.orderNumber}
                  </h2>
                  <p className="text-[13px] text-gray-500">
                    {formatDateTime(viewSale.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewSale(null)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4">
              {actionError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {actionError}
                </div>
              )}

              <div className="mb-5 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                    Customer
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-gray-700">
                    {viewSale.customerId?.name || "Walk-in"}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                    Payment
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                    {paymentIcon[viewSale.paymentMethod]}
                    {paymentLabel[viewSale.paymentMethod]}
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                    Status
                  </p>
                  <span
                    className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusColor[viewSale.status]}`}
                  >
                    {viewSale.status}
                  </span>
                </div>
              </div>

              <table className="mb-4 w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Item
                    </th>
                    <th className="pb-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Qty
                    </th>
                    <th className="pb-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Price
                    </th>
                    <th className="pb-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {viewSale.items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-2.5 font-medium text-gray-700">
                        {item.productName}
                      </td>
                      <td className="py-2.5 text-right text-gray-500">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 text-right text-gray-500">
                        {formatCurrency(item.unitPrice, currency)}
                      </td>
                      <td className="py-2.5 text-right font-medium text-gray-700">
                        {formatCurrency(item.total, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="space-y-2 rounded-xl bg-gray-50 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-700">
                    {formatCurrency(viewSale.subtotal, currency)}
                  </span>
                </div>
                {viewSale.totalDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Discount</span>
                    <span className="text-red-500">
                      -{formatCurrency(viewSale.totalDiscount, currency)}
                    </span>
                  </div>
                )}
                {viewSale.totalTax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tax</span>
                    <span className="text-gray-700">
                      {formatCurrency(viewSale.totalTax, currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold">
                  <span className="text-gray-900">Total</span>
                  <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                    {formatCurrency(viewSale.total, currency)}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-4 md:flex-row md:items-end md:justify-between">
                <div className="w-full md:max-w-[220px]">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Update Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  >
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="refunded">Refunded</option>
                    <option value="voided">Voided</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={deleteSale}
                    disabled={actionLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                  <button
                    onClick={updateSaleStatus}
                    disabled={
                      actionLoading || selectedStatus === viewSale.status
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {actionLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
