"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "../layout";
import {
  TrendingUp,
  Package,
  ShoppingBag,
  DollarSign,
  BarChart3,
  Users,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  AlertTriangle,
  Zap,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import { downloadCsv, formatCurrency, printHtml } from "@/lib/utils";

function generateReportPdf(title: string, period: string, html: string) {
  const body = `
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; padding: 32px; color: #1a1a1a; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        .meta { color: #888; font-size: 13px; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 16px; }
        th { text-align: left; border-bottom: 2px solid #e5e7eb; padding: 8px 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; font-size: 11px; }
        td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; }
        .text-right { text-align: right; }
        .stat-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
        .stat-label { color: #6b7280; }
        .stat-value { font-weight: 600; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
        .badge-green { background: #ecfdf5; color: #059669; }
        .badge-red { background: #fef2f2; color: #dc2626; }
        .badge-amber { background: #fffbeb; color: #d97706; }
        @media print { body { padding: 0; } }
      </style>
      <h1>${title}</h1>
      <div class="meta">Period: ${period} &bull; Generated: ${new Date().toLocaleDateString("en-UG", { year: "numeric", month: "long", day: "numeric" })}</div>
      ${html}
  `;
  printHtml(title, body);
}

interface DashboardData {
  summary: {
    todaySales: number;
    salesGrowth: number;
    todayOrders: number;
    ordersGrowth: number;
    totalStock: number;
    totalCustomers: number;
    totalProducts: number;
  };
  weeklySales: { _id: string; total: number; count: number }[];
  topProducts: {
    _id: string;
    name: string;
    totalQuantity: number;
    totalRevenue: number;
  }[];
  lowStockAlerts: {
    productId: { name: string; sku: string };
    branchId: { name: string };
    quantity: number;
    reorderLevel: number;
  }[];
}

interface InvoiceData {
  invoices: {
    _id: string;
    invoiceNumber: string;
    customerId?: { name: string; phone: string; email: string };
    total: number;
    amountPaid: number;
    balance: number;
    status: string;
    dueDate: string;
    createdAt: string;
  }[];
  total: number;
}

interface PurchaseData {
  orders: {
    _id: string;
    orderNumber: string;
    vendorId?: { name: string };
    total: number;
    status: string;
    createdAt: string;
  }[];
  total: number;
}

interface ActivityLogData {
  logs: {
    _id: string;
    userName: string;
    action: string;
    module: string;
    description: string;
    createdAt: string;
  }[];
}

type ReportView =
  | "overview"
  | "sales"
  | "inventory"
  | "purchases"
  | "receivables"
  | "profit_loss"
  | "activity";

const reportCards = [
  {
    key: "sales" as ReportView,
    title: "Sales Report",
    description: "Revenue, orders, and trends",
    icon: TrendingUp,
    gradient: "from-orange-500 to-amber-600",
    shadow: "shadow-orange-500/20",
  },
  {
    key: "inventory" as ReportView,
    title: "Inventory Report",
    description: "Stock levels and alerts",
    icon: Package,
    gradient: "from-blue-500 to-indigo-600",
    shadow: "shadow-blue-500/20",
  },
  {
    key: "receivables" as ReportView,
    title: "Receivables",
    description: "Outstanding customer payments",
    icon: DollarSign,
    gradient: "from-amber-500 to-green-600",
    shadow: "shadow-amber-500/20",
  },
  {
    key: "purchases" as ReportView,
    title: "Purchases Report",
    description: "Vendor orders and spending",
    icon: ShoppingBag,
    gradient: "from-purple-500 to-violet-600",
    shadow: "shadow-purple-500/20",
  },
  {
    key: "profit_loss" as ReportView,
    title: "Profit & Loss",
    description: "Income vs expenses summary",
    icon: BarChart3,
    gradient: "from-amber-500 to-orange-600",
    shadow: "shadow-amber-500/20",
  },
  {
    key: "activity" as ReportView,
    title: "Activity Log",
    description: "User activity and audit trail",
    icon: Users,
    gradient: "from-gray-500 to-slate-600",
    shadow: "shadow-gray-500/20",
  },
];

export default function ReportsPage() {
  const { tenant } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [purchaseData, setPurchaseData] = useState<PurchaseData | null>(null);
  const [activityData, setActivityData] = useState<ActivityLogData | null>(null);
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ReportView>("overview");
  const currency = tenant?.settings?.currency || "UGX";

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, invRes, poRes, actRes] = await Promise.all([
        fetch(`/api/dashboard?period=${period}`),
        fetch(`/api/invoices?limit=100`),
        fetch(`/api/purchases?limit=100`),
        fetch(`/api/activity-logs?limit=50`),
      ]);
      if (dashRes.ok) setData(await dashRes.json());
      if (invRes.ok) setInvoiceData(await invRes.json());
      if (poRes.ok) setPurchaseData(await poRes.json());
      if (actRes.ok) setActivityData(await actRes.json());
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const receivables = useMemo(
    () =>
      invoiceData?.invoices?.filter(
        (inv) => inv.status !== "paid" && inv.status !== "cancelled",
      ) ?? [],
    [invoiceData],
  );
  const totalReceivable = receivables.reduce(
    (sum, inv) => sum + (inv.balance || inv.total - inv.amountPaid),
    0,
  );
  const overdueReceivables = receivables.filter(
    (inv) =>
      inv.status === "overdue" ||
      (inv.dueDate && new Date(inv.dueDate) < new Date()),
  );
  const purchaseOrders = useMemo(
    () => purchaseData?.orders ?? [],
    [purchaseData],
  );
  const totalPurchased = purchaseOrders.reduce((sum, po) => sum + po.total, 0);
  const monthlySales = useMemo(() => data?.weeklySales ?? [], [data]);
  const activities = useMemo(() => {
    return (activityData?.logs || []).map((log) => {
      const date = new Date(log.createdAt);
      const isToday = date.toDateString() === new Date().toDateString();
      const timeStr = isToday
        ? date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

      return {
        time: timeStr,
        user: log.userName,
        action: log.action.charAt(0).toUpperCase() + log.action.slice(1),
        detail: log.description,
        type: log.module,
      };
    });
  }, [activityData]);

  const chartTitle =
    period === "today"
      ? "Today Revenue"
      : period === "week"
        ? "Weekly Revenue"
        : period === "year"
          ? "Yearly Revenue"
          : "Monthly Revenue";

  const exportRowsForView = useCallback(() => {
    switch (view) {
      case "sales":
        return (data?.topProducts || []).map((product) => ({
          product: product.name,
          quantitySold: product.totalQuantity,
          revenue: product.totalRevenue,
        }));
      case "inventory":
        return (data?.lowStockAlerts || []).map((item) => ({
          product: item.productId?.name || "",
          sku: item.productId?.sku || "",
          branch: item.branchId?.name || "",
          quantity: item.quantity,
          reorderLevel: item.reorderLevel,
        }));
      case "receivables":
        return receivables.map((invoice) => ({
          invoiceNumber: invoice.invoiceNumber,
          customer: invoice.customerId?.name || "",
          total: invoice.total,
          paid: invoice.amountPaid,
          balance: invoice.balance || invoice.total - invoice.amountPaid,
          status: invoice.status,
        }));
      case "purchases":
        return purchaseOrders.map((order) => ({
          orderNumber: order.orderNumber,
          vendor: order.vendorId?.name || "",
          total: order.total,
          status: order.status,
          createdAt: order.createdAt,
        }));
      case "profit_loss":
        return [
          {
            revenue: data?.summary.todaySales || 0,
            estimatedCogs: (data?.summary.todaySales || 0) * 0.45,
            estimatedExpenses: (data?.summary.todaySales || 0) * 0.12,
            estimatedNetProfit:
              (data?.summary.todaySales || 0) -
              (data?.summary.todaySales || 0) * 0.45 -
              (data?.summary.todaySales || 0) * 0.12,
          },
        ];
      case "activity":
        return activities.map((act) => ({
          time: act.time,
          user: act.user,
          action: act.action,
          detail: act.detail,
          module: act.type,
        }));
      case "overview":
      default:
        return [
          ...(monthlySales || []).map((point) => ({
            section: "Revenue Trend",
            date: point._id,
            total: point.total,
            count: point.count,
          })),
          ...(data?.topProducts || []).map((product) => ({
            section: "Top Product",
            date: product.name,
            total: product.totalRevenue,
            count: product.totalQuantity,
          })),
        ];
    }
  }, [data, monthlySales, purchaseOrders, receivables, view]);

  const handleExport = useCallback(() => {
    const rows = exportRowsForView();
    if (rows.length === 0) return;
    downloadCsv(`report-${view}-${period}.csv`, rows);
  }, [exportRowsForView, period, view]);

  const handlePdfExport = useCallback(() => {
    const titles: Record<string, string> = {
      overview: "Business Overview",
      sales: "Sales Report",
      inventory: "Inventory Report",
      receivables: "Receivables Report",
      purchases: "Purchases Report",
      profit_loss: "Profit & Loss Statement",
      activity: "Activity Log",
    };

    let html = "";
    switch (view) {
      case "sales": {
        const prods = data?.topProducts || [];
        html = `
          <div class="stat-row"><span class="stat-label">Total Sales</span><span class="stat-value">${formatCurrency(data?.summary.todaySales || 0, currency)}</span></div>
          <div class="stat-row"><span class="stat-label">Orders</span><span class="stat-value">${data?.summary.todayOrders || 0}</span></div>
          <div class="stat-row"><span class="stat-label">Products</span><span class="stat-value">${data?.summary.totalProducts || 0}</span></div>
          <table><thead><tr><th>#</th><th>Product</th><th class="text-right">Qty Sold</th><th class="text-right">Revenue</th></tr></thead>
          <tbody>${prods.map((p, i) => `<tr><td>${i + 1}</td><td>${p.name}</td><td class="text-right">${p.totalQuantity}</td><td class="text-right">${formatCurrency(p.totalRevenue, currency)}</td></tr>`).join("")}</tbody></table>`;
        break;
      }
      case "inventory": {
        const alerts = data?.lowStockAlerts || [];
        html = `
          <div class="stat-row"><span class="stat-label">Total Stock</span><span class="stat-value">${(data?.summary.totalStock || 0).toLocaleString()}</span></div>
          <div class="stat-row"><span class="stat-label">Low Stock Alerts</span><span class="stat-value">${alerts.length}</span></div>
          <table><thead><tr><th>Product</th><th>SKU</th><th>Branch</th><th class="text-right">Current</th><th class="text-right">Reorder</th></tr></thead>
          <tbody>${alerts.map((s) => `<tr><td>${s.productId?.name || "—"}</td><td>${s.productId?.sku || "—"}</td><td>${s.branchId?.name || "—"}</td><td class="text-right">${s.quantity}</td><td class="text-right">${s.reorderLevel}</td></tr>`).join("")}</tbody></table>`;
        break;
      }
      case "receivables":
        html = `
          <div class="stat-row"><span class="stat-label">Total Outstanding</span><span class="stat-value">${formatCurrency(totalReceivable, currency)}</span></div>
          <div class="stat-row"><span class="stat-label">Overdue</span><span class="stat-value">${overdueReceivables.length} invoices</span></div>
          <table><thead><tr><th>Invoice #</th><th>Customer</th><th>Due Date</th><th class="text-right">Total</th><th class="text-right">Paid</th><th class="text-right">Balance</th><th>Status</th></tr></thead>
          <tbody>${receivables.map((inv) => `<tr><td>${inv.invoiceNumber}</td><td>${inv.customerId?.name || "—"}</td><td>${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}</td><td class="text-right">${formatCurrency(inv.total, currency)}</td><td class="text-right">${formatCurrency(inv.amountPaid, currency)}</td><td class="text-right">${formatCurrency(inv.balance || inv.total - inv.amountPaid, currency)}</td><td>${inv.status}</td></tr>`).join("")}</tbody></table>`;
        break;
      case "purchases":
        html = `
          <div class="stat-row"><span class="stat-label">Total Purchased</span><span class="stat-value">${formatCurrency(totalPurchased, currency)}</span></div>
          <table><thead><tr><th>Order #</th><th>Vendor</th><th>Date</th><th class="text-right">Total</th><th>Status</th></tr></thead>
          <tbody>${purchaseOrders.map((po) => `<tr><td>${po.orderNumber}</td><td>${po.vendorId?.name || "—"}</td><td>${new Date(po.createdAt).toLocaleDateString()}</td><td class="text-right">${formatCurrency(po.total, currency)}</td><td>${po.status}</td></tr>`).join("")}</tbody></table>`;
        break;
      case "profit_loss": {
        const revenue = data?.summary.todaySales || 0;
        const cogs = revenue * 0.45;
        const gross = revenue - cogs;
        const exp = revenue * 0.12;
        const net = gross - exp;
        html = `
          <div class="stat-row"><span class="stat-label">Revenue</span><span class="stat-value">${formatCurrency(revenue, currency)}</span></div>
          <div class="stat-row"><span class="stat-label">Cost of Goods Sold</span><span class="stat-value" style="color:#dc2626">(${formatCurrency(cogs, currency)})</span></div>
          <div class="stat-row" style="background:#ecfdf5;padding:10px;border-radius:8px"><span class="stat-label"><strong>Gross Profit</strong></span><span class="stat-value">${formatCurrency(gross, currency)}</span></div>
          <div class="stat-row"><span class="stat-label">Operating Expenses</span><span class="stat-value">(${formatCurrency(exp, currency)})</span></div>
          <div class="stat-row" style="background:#fff7ed;padding:10px;border-radius:8px"><span class="stat-label"><strong>Net Profit</strong></span><span class="stat-value">${formatCurrency(net, currency)}</span></div>
          <p style="color:#9ca3af;font-size:11px;margin-top:16px">* COGS and expenses estimated based on typical operating ratios.</p>`;
        break;
      }
      case "activity":
        html = `
          <table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Detail</th></tr></thead>
          <tbody>${activities.map((act) => `<tr><td>${act.time}</td><td>${act.user}</td><td>${act.action}</td><td>${act.detail}</td></tr>`).join("")}</tbody></table>`;
        break;
      default: {
        const sales = data?.weeklySales || [];
        const prods = data?.topProducts || [];
        html = `
          <h3 style="margin-top:16px">Revenue Trend</h3>
          <table><thead><tr><th>Date</th><th class="text-right">Total</th><th class="text-right">Orders</th></tr></thead>
          <tbody>${sales.map((d) => `<tr><td>${d._id}</td><td class="text-right">${formatCurrency(d.total, currency)}</td><td class="text-right">${d.count}</td></tr>`).join("")}</tbody></table>
          <h3 style="margin-top:24px">Top Products</h3>
          <table><thead><tr><th>Product</th><th class="text-right">Qty</th><th class="text-right">Revenue</th></tr></thead>
          <tbody>${prods.map((p) => `<tr><td>${p.name}</td><td class="text-right">${p.totalQuantity}</td><td class="text-right">${formatCurrency(p.totalRevenue, currency)}</td></tr>`).join("")}</tbody></table>`;
      }
    }
    generateReportPdf(titles[view] || "Report", period, html);
  }, [
    view,
    data,
    currency,
    period,
    totalReceivable,
    overdueReceivables,
    receivables,
    purchaseOrders,
    totalPurchased,
  ]);

  const periodSelector = (
    <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-1.5 py-1">
      {[
        { val: "today", label: "Today" },
        { val: "week", label: "Week" },
        { val: "month", label: "Month" },
        { val: "year", label: "Year" },
      ].map((p) => (
        <button
          key={p.val}
          onClick={() => setPeriod(p.val)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
            period === p.val
              ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-sm"
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );

  // ──── OVERVIEW ────
  if (view === "overview") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/20">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                Reports &amp; Analytics
              </h1>
              <p className="text-[13px] text-gray-400">
                Business intelligence overview
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {periodSelector}
            <button
              onClick={handlePdfExport}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <FileText className="h-4 w-4" /> PDF
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-3 py-2 text-sm font-bold text-white shadow-md shadow-sky-500/25 transition-all hover:shadow-lg"
            >
              <Download className="h-4 w-4" /> Export All
            </button>
          </div>
        </div>

        {/* Report Cards Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reportCards.map((card) => (
            <button
              key={card.key}
              onClick={() => setView(card.key)}
              className="group rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-all hover:shadow-lg hover:shadow-gray-200/50"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg ${card.shadow} transition-transform group-hover:scale-105`}
                >
                  <card.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 group-hover:text-orange-700 transition-colors">
                    {card.title}
                  </h3>
                  <p className="mt-0.5 text-[13px] text-gray-400">
                    {card.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Monthly Revenue Chart */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-gray-800">
            {chartTitle}
          </h3>
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-indigo-500" />
            </div>
          ) : monthlySales.length > 0 ? (
            <div className="flex h-64 items-end gap-2">
              {monthlySales.map((day, i) => {
                const maxVal = Math.max(...monthlySales.map((d) => d.total));
                const height = maxVal > 0 ? (day.total / maxVal) * 100 : 0;
                return (
                  <div
                    key={i}
                    className="group flex flex-1 flex-col items-center gap-1"
                  >
                    <span className="text-[10px] text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">
                      {formatCurrency(day.total, currency)}
                    </span>
                    <div className="flex h-52 w-full items-end">
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-indigo-500 to-purple-400 transition-all hover:from-indigo-600 hover:to-purple-500"
                        style={{ height: `${Math.max(height, 3)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {new Date(day._id).toLocaleDateString("en", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-gray-400">
              No revenue data for this period
            </div>
          )}
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Total Revenue",
              value: formatCurrency(data?.summary.todaySales || 0, currency),
              growth: data?.summary.salesGrowth || 0,
              sub: "vs yesterday",
              gradient: "from-orange-500 to-amber-600",
              shadow: "shadow-orange-500/20",
            },
            {
              label: "Outstanding Receivables",
              value: formatCurrency(totalReceivable, currency),
              sub: `${receivables.length} unpaid invoices`,
              gradient: "from-amber-500 to-orange-600",
              shadow: "shadow-amber-500/20",
            },
            {
              label: "Purchase Spending",
              value: formatCurrency(totalPurchased, currency),
              sub: `${purchaseOrders.length} orders`,
              gradient: "from-purple-500 to-violet-600",
              shadow: "shadow-purple-500/20",
            },
            {
              label: "Low Stock Items",
              value: String(data?.lowStockAlerts?.length || 0),
              sub: "Need reordering",
              isAlert: (data?.lowStockAlerts?.length || 0) > 0,
              gradient: "from-red-500 to-rose-600",
              shadow: "shadow-red-500/20",
            },
          ].map((s, i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-lg hover:shadow-gray-200/50"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${s.gradient} shadow-md ${s.shadow}`}
                >
                  {i === 0 ? (
                    <TrendingUp className="h-4 w-4 text-white" />
                  ) : i === 1 ? (
                    <DollarSign className="h-4 w-4 text-white" />
                  ) : i === 2 ? (
                    <ShoppingBag className="h-4 w-4 text-white" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-white" />
                  )}
                </div>
                <div>
                  <p className="text-[12px] text-gray-400">{s.label}</p>
                  <p
                    className={`text-lg font-bold ${s.isAlert ? "text-red-600" : "text-gray-800"}`}
                  >
                    {s.value}
                  </p>
                  {s.growth !== undefined ? (
                    <div
                      className={`flex items-center gap-0.5 text-[11px] font-medium ${s.growth >= 0 ? "text-amber-600" : "text-red-600"}`}
                    >
                      {s.growth >= 0 ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {Math.abs(s.growth)}% {s.sub}
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-400">{s.sub}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ──── Shared Report Header ────
  const ReportHeader = ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setView("overview")}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">{title}</h1>
          <p className="text-[13px] text-gray-400">{description}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {periodSelector}
        <button
          onClick={handlePdfExport}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <FileText className="h-4 w-4" /> PDF
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-3 py-2 text-sm font-bold text-white shadow-md shadow-sky-500/25 transition-all hover:shadow-lg"
        >
          <Download className="h-4 w-4" /> Export
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-gray-200 border-t-indigo-500" />
          <p className="text-sm font-medium text-gray-400">
            Loading report data…
          </p>
        </div>
      </div>
    );
  }

  // Card wrapper helper
  const Card = ({
    children,
    className = "",
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div
      className={`rounded-2xl border border-gray-100 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
  const StatCard = ({
    label,
    value,
    sub,
    color,
  }: {
    label: string;
    value: string;
    sub?: string;
    color?: string;
  }) => (
    <Card className="p-5">
      <p className="text-[12px] text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color || "text-gray-800"}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-gray-400">{sub}</p>}
    </Card>
  );

  // Table helper
  const TableWrapper = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <Card>
      <div className="border-b border-gray-100 px-6 py-4">
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </Card>
  );
  const Th = ({
    children,
    align = "left",
  }: {
    children: React.ReactNode;
    align?: string;
  }) => (
    <th
      className={`px-5 py-3 text-${align} text-[11px] font-semibold uppercase tracking-wider text-gray-400`}
    >
      {children}
    </th>
  );

  // ──── SALES REPORT ────
  if (view === "sales") {
    return (
      <div className="space-y-6">
        <ReportHeader
          title="Sales Report"
          description="Revenue, orders, and trends"
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Sales"
            value={formatCurrency(data?.summary.todaySales || 0, currency)}
          />
          <StatCard
            label="Orders"
            value={String(data?.summary.todayOrders || 0)}
          />
          <StatCard
            label="Active Products"
            value={String(data?.summary.totalProducts || 0)}
          />
          <StatCard
            label="Customers"
            value={String(data?.summary.totalCustomers || 0)}
          />
        </div>

        <Card className="p-6">
          <h3 className="mb-4 font-semibold text-gray-800">Sales Trend</h3>
          {(data?.weeklySales?.length || 0) === 0 ? (
            <p className="py-12 text-center text-gray-400">
              No sales data for this period
            </p>
          ) : (
            <div className="space-y-2">
              {data!.weeklySales.map((d) => {
                const maxTotal = Math.max(
                  ...data!.weeklySales.map((s) => s.total),
                );
                const width = maxTotal > 0 ? (d.total / maxTotal) * 100 : 0;
                return (
                  <div key={d._id} className="flex items-center gap-3">
                    <span className="w-24 text-xs text-gray-400">{d._id}</span>
                    <div className="flex-1">
                      <div className="h-8 rounded-full bg-gray-50">
                        <div
                          className="flex h-8 items-center rounded-full bg-gradient-to-r from-orange-500 to-amber-600 px-3 text-xs font-semibold text-white"
                          style={{ width: `${Math.max(width, 10)}%` }}
                        >
                          {formatCurrency(d.total, currency)}
                        </div>
                      </div>
                    </div>
                    <span className="w-16 text-right text-xs text-gray-400">
                      {d.count} orders
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <TableWrapper title="Top Selling Products">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-100 bg-blue-50/60">
                <Th>#</Th>
                <Th>Product</Th>
                <Th align="right">Qty Sold</Th>
                <Th align="right">Revenue</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(data?.topProducts || []).map((p, i) => (
                <tr
                  key={p._id}
                  className="transition-colors hover:bg-gray-50/60"
                >
                  <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-gray-800">
                    {p.name}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-600">
                    {p.totalQuantity}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-800">
                    {formatCurrency(p.totalRevenue, currency)}
                  </td>
                </tr>
              ))}
              {(data?.topProducts || []).length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-12 text-center text-gray-400"
                  >
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableWrapper>
      </div>
    );
  }

  // ──── INVENTORY REPORT ────
  if (view === "inventory") {
    return (
      <div className="space-y-6">
        <ReportHeader
          title="Inventory Report"
          description="Stock levels and alerts"
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            label="Total Stock"
            value={(data?.summary.totalStock || 0).toLocaleString()}
          />
          <StatCard
            label="Active Products"
            value={String(data?.summary.totalProducts || 0)}
          />
          <StatCard
            label="Low Stock Alerts"
            value={String(data?.lowStockAlerts?.length || 0)}
            color={
              (data?.lowStockAlerts?.length || 0) > 0
                ? "text-amber-600"
                : undefined
            }
          />
        </div>

        <TableWrapper title="Low Stock Items">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-100 bg-blue-50/60">
                <Th>Product</Th>
                <Th>SKU</Th>
                <Th>Branch</Th>
                <Th align="right">Current</Th>
                <Th align="right">Reorder Level</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(data?.lowStockAlerts || []).map((s, i) => (
                <tr key={i} className="transition-colors hover:bg-gray-50/60">
                  <td className="px-5 py-3 font-medium text-gray-800">
                    {s.productId?.name || "—"}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-400">
                    {s.productId?.sku || "—"}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {s.branchId?.name || "—"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="inline-flex rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-600 ring-1 ring-red-600/20">
                      {s.quantity}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-gray-600">
                    {s.reorderLevel}
                  </td>
                </tr>
              ))}
              {(data?.lowStockAlerts || []).length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-gray-400"
                  >
                    No low stock alerts
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableWrapper>
      </div>
    );
  }

  // ──── RECEIVABLES REPORT ────
  if (view === "receivables") {
    return (
      <div className="space-y-6">
        <ReportHeader
          title="Receivables"
          description="Outstanding customer payments"
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            label="Total Outstanding"
            value={formatCurrency(totalReceivable, currency)}
            sub={`${receivables.length} invoices`}
          />
          <StatCard
            label="Overdue"
            value={formatCurrency(
              overdueReceivables.reduce(
                (s, inv) => s + (inv.balance || inv.total - inv.amountPaid),
                0,
              ),
              currency,
            )}
            sub={`${overdueReceivables.length} invoices`}
            color="text-red-600"
          />
          <StatCard
            label="Avg Invoice"
            value={formatCurrency(
              receivables.length > 0 ? totalReceivable / receivables.length : 0,
              currency,
            )}
          />
        </div>

        <TableWrapper title="Outstanding Invoices">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-100 bg-blue-50/60">
                <Th>Invoice #</Th>
                <Th>Customer</Th>
                <Th>Due Date</Th>
                <Th align="right">Total</Th>
                <Th align="right">Paid</Th>
                <Th align="right">Balance</Th>
                <Th align="center">Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {receivables.map((inv) => {
                const balance = inv.balance || inv.total - inv.amountPaid;
                const isOverdue =
                  inv.status === "overdue" ||
                  (inv.dueDate && new Date(inv.dueDate) < new Date());
                return (
                  <tr
                    key={inv._id}
                    className="transition-colors hover:bg-gray-50/60"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-gray-800">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {inv.customerId?.name || "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        {inv.dueDate
                          ? new Date(inv.dueDate).toLocaleDateString("en-UG", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600">
                      {formatCurrency(inv.total, currency)}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600">
                      {formatCurrency(inv.amountPaid, currency)}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-800">
                      {formatCurrency(balance, currency)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${isOverdue ? "bg-red-50 text-red-600 ring-red-600/20" : "bg-amber-50 text-amber-600 ring-amber-600/20"}`}
                      >
                        {isOverdue ? "Overdue" : inv.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {receivables.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-gray-400"
                  >
                    No outstanding receivables
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableWrapper>
      </div>
    );
  }

  // ──── PURCHASES REPORT ────
  if (view === "purchases") {
    const byStatus = purchaseOrders.reduce<
      Record<string, { count: number; total: number }>
    >((acc, po) => {
      if (!acc[po.status]) acc[po.status] = { count: 0, total: 0 };
      acc[po.status].count++;
      acc[po.status].total += po.total;
      return acc;
    }, {});
    const statusColors: Record<string, string> = {
      draft: "bg-gray-50 text-gray-600 ring-gray-600/20",
      ordered: "bg-blue-50 text-blue-600 ring-blue-600/20",
      partial: "bg-amber-50 text-amber-600 ring-amber-600/20",
      received: "bg-emerald-50 text-amber-600 ring-amber-600/20",
      cancelled: "bg-red-50 text-red-600 ring-red-600/20",
    };

    return (
      <div className="space-y-6">
        <ReportHeader
          title="Purchases Report"
          description="Vendor orders and spending"
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            label="Total Purchased"
            value={formatCurrency(totalPurchased, currency)}
            sub={`${purchaseOrders.length} orders`}
          />
          <StatCard
            label="Received"
            value={formatCurrency(byStatus["received"]?.total || 0, currency)}
            sub={`${byStatus["received"]?.count || 0} orders`}
            color="text-amber-600"
          />
          <StatCard
            label="Pending"
            value={formatCurrency(
              (byStatus["draft"]?.total || 0) +
                (byStatus["ordered"]?.total || 0),
              currency,
            )}
            sub={`${(byStatus["draft"]?.count || 0) + (byStatus["ordered"]?.count || 0)} orders`}
            color="text-amber-600"
          />
        </div>

        <Card className="p-5">
          <h3 className="mb-4 font-semibold text-gray-800">Status Breakdown</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(byStatus).map(([status, info]) => (
              <div
                key={status}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 ring-1 ${statusColors[status] || "bg-gray-50 text-gray-600 ring-gray-600/20"}`}
              >
                <span className="text-sm font-semibold capitalize">
                  {status}
                </span>
                <span className="text-[11px] opacity-70">
                  {info.count} · {formatCurrency(info.total, currency)}
                </span>
              </div>
            ))}
            {Object.keys(byStatus).length === 0 && (
              <p className="text-sm text-gray-400">No purchase orders</p>
            )}
          </div>
        </Card>

        <TableWrapper title="Recent Purchase Orders">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-100 bg-blue-50/60">
                <Th>Order #</Th>
                <Th>Vendor</Th>
                <Th>Date</Th>
                <Th align="right">Total</Th>
                <Th align="center">Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {purchaseOrders.slice(0, 20).map((po) => (
                <tr
                  key={po._id}
                  className="transition-colors hover:bg-gray-50/60"
                >
                  <td className="px-5 py-3 font-mono text-xs text-gray-800">
                    {po.orderNumber}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {po.vendorId?.name || "—"}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">
                    {new Date(po.createdAt).toLocaleDateString("en-UG", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-800">
                    {formatCurrency(po.total, currency)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ${statusColors[po.status] || "bg-gray-50 text-gray-600 ring-gray-600/20"}`}
                    >
                      {po.status}
                    </span>
                  </td>
                </tr>
              ))}
              {purchaseOrders.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-gray-400"
                  >
                    No purchase orders
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableWrapper>
      </div>
    );
  }

  // ──── PROFIT & LOSS ────
  if (view === "profit_loss") {
    const revenue = data?.summary.todaySales || 0;
    const cogs = revenue * 0.45;
    const grossProfit = revenue - cogs;
    const expenses = revenue * 0.12;
    const netProfit = grossProfit - expenses;
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return (
      <div className="space-y-6">
        <ReportHeader
          title="Profit & Loss"
          description="Income vs expenses summary"
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard label="Revenue" value={formatCurrency(revenue, currency)} />
          <StatCard
            label="Cost of Goods"
            value={formatCurrency(cogs, currency)}
            color="text-red-600"
          />
          <StatCard
            label="Gross Profit"
            value={formatCurrency(grossProfit, currency)}
            color="text-amber-600"
          />
          <StatCard
            label="Net Profit"
            value={formatCurrency(netProfit, currency)}
            sub={`Margin: ${margin.toFixed(1)}%`}
            color="text-orange-700"
          />
        </div>

        <Card className="p-6">
          <h3 className="mb-4 font-semibold text-gray-800">
            Profit &amp; Loss Statement
          </h3>
          <div className="space-y-1">
            <div className="flex justify-between border-b border-gray-100 py-3">
              <span className="font-semibold text-gray-800">Revenue</span>
              <span className="font-semibold text-gray-800">
                {formatCurrency(revenue, currency)}
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-100 py-3 pl-4">
              <span className="text-gray-500">Sales Revenue</span>
              <span className="text-gray-600">
                {formatCurrency(revenue, currency)}
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-200 py-3">
              <span className="font-semibold text-red-600">
                Cost of Goods Sold
              </span>
              <span className="font-semibold text-red-600">
                ({formatCurrency(cogs, currency)})
              </span>
            </div>
            <div className="flex justify-between rounded-xl bg-emerald-50 px-4 py-3">
              <span className="font-bold text-emerald-800">Gross Profit</span>
              <span className="font-bold text-emerald-800">
                {formatCurrency(grossProfit, currency)}
              </span>
            </div>
            <div className="mt-2 flex justify-between border-b border-gray-100 py-3 pl-4">
              <span className="text-gray-500">Operating Expenses</span>
              <span className="text-gray-600">
                ({formatCurrency(expenses, currency)})
              </span>
            </div>
            <div className="mt-2 flex justify-between rounded-xl bg-orange-50 px-4 py-3">
              <span className="font-bold text-orange-900">Net Profit</span>
              <span className="font-bold text-orange-900">
                {formatCurrency(netProfit, currency)}
              </span>
            </div>
          </div>
          <p className="mt-4 text-[11px] text-gray-400">
            * COGS and expenses estimated based on typical operating ratios. For
            accurate P&amp;L, connect accounting software via Settings →
            Integrations.
          </p>
        </Card>
      </div>
    );
  }

  // ──── ACTIVITY LOG ────
  if (view === "activity") {

    const typeIcons: Record<string, React.ElementType> = {
      sale: ShoppingBag,
      customer: Users,
      stock: Package,
      alert: AlertTriangle,
      system: Zap,
      report: BarChart3,
      invoice: FileText,
    };
    const typeGradients: Record<string, string> = {
      sale: "from-orange-500 to-amber-600",
      customer: "from-blue-500 to-indigo-600",
      stock: "from-purple-500 to-violet-600",
      alert: "from-amber-500 to-orange-600",
      system: "from-gray-400 to-gray-500",
      report: "from-amber-500 to-green-600",
      invoice: "from-indigo-500 to-purple-600",
    };

    return (
      <div className="space-y-6">
        <ReportHeader
          title="Activity Log"
          description="User activity and audit trail"
        />
        <Card>
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="font-semibold text-gray-800">Recent Activity</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {activities.map((act, i) => {
              const Icon = typeIcons[act.type] || Zap;
              const gradient =
                typeGradients[act.type] || "from-gray-400 to-gray-500";
              return (
                <div
                  key={i}
                  className="flex items-start gap-4 px-6 py-4 transition-colors hover:bg-gray-50/60"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-md`}
                  >
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">
                        {act.action}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        by {act.user}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[13px] text-gray-500">
                      {act.detail}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-gray-400">
                    {act.time}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="border-t border-gray-100 px-6 py-4 text-center">
            <p className="text-[12px] text-gray-400">
              Full activity logs require audit trail integration. Connect via
              Settings → Integrations.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}
