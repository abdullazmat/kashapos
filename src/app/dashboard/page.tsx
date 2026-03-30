"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "./layout";
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowRight,
  CreditCard,
  Smartphone,
  Banknote,
  Clock,
  Receipt,
  Wallet,
  RotateCcw,
  FileText,
  Warehouse,
  Settings,
  BarChart3,
  Activity,
  User,
  Shield,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

type TimePeriod = "today" | "7days" | "mtd" | "3months" | "6months" | "annual";

const periodLabels: Record<TimePeriod, string> = {
  today: "Today",
  "7days": "Last 7 Days",
  mtd: "Month to Date",
  "3months": "3 Months",
  "6months": "6 Months",
  annual: "Annual",
};

const periodApiMap: Record<TimePeriod, string> = {
  today: "day",
  "7days": "week",
  mtd: "month",
  "3months": "quarter",
  "6months": "half",
  annual: "year",
};

const formatChartLabel = (key: string, period: TimePeriod) => {
  if (period === "today") {
    const hour = key.split(" ")[1]?.split(":")[0];
    if (!hour) return key;
    return `${hour}:00`;
  }

  if (period === "annual" || period === "6months") {
    const [year, month] = key.split("-");
    if (!year || !month) return key;
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
      "en",
      { month: "short" },
    );
  }

  if (period === "3months") {
    const [year, week] = key.split("-");
    if (!year || !week) return key;
    return `Wk ${Number(week)}`;
  }

  const date = new Date(key);
  if (Number.isNaN(date.getTime())) return key;

  return period === "mtd"
    ? date.toLocaleDateString("en", { day: "numeric", month: "short" })
    : date.toLocaleDateString("en", { weekday: "short" });
};

interface DashboardData {
  summary: {
    salesTotal: number;
    purchasesTotal: number;
    expensesTotal: number;
    cogsTotal: number;
    stockValue: number;
    creditBalance: number;
    grossProfit: number;
    netProfit: number;
    totalStock: number;
    totalCustomers: number;
    totalProducts: number;
    todaySales: number;
    todayOrders: number;
    salesGrowth: number;
    ordersGrowth: number;
  };
  weeklySales: { _id: string; total: number; count: number }[];
  lowStockAlerts: {
    productId: { name: string; sku: string };
    quantity: number;
    reorderLevel: number;
    branchId?: { name: string };
  }[];
  topProducts: { name: string; totalQuantity: number; totalRevenue: number }[];
}

interface RecentSale {
  _id: string;
  orderNumber: string;
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  customerId?: { name: string };
}

const quickActions = [
  {
    icon: ShoppingCart,
    label: "Add Sale",
    href: "/dashboard/pos",
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    icon: TrendingDown,
    label: "Add Expense",
    href: "/dashboard/expenses",
    color: "text-red-600",
    bg: "bg-red-50",
  },
  {
    icon: Users,
    label: "Manage Customers",
    href: "/dashboard/customers",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: Package,
    label: "Manage Items",
    href: "/dashboard/inventory",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    icon: Warehouse,
    label: "Stock Transfer",
    href: "/dashboard/stock",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    icon: Package,
    label: "View Stock",
    href: "/dashboard/stock",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    icon: Wallet,
    label: "Manage Suppliers",
    href: "/dashboard/vendors",
    color: "text-teal-600",
    bg: "bg-teal-50",
  },
  {
    icon: CreditCard,
    label: "Manage Purchases",
    href: "/dashboard/purchases",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    icon: FileText,
    label: "Create Invoice",
    href: "/dashboard/invoices",
    color: "text-cyan-600",
    bg: "bg-cyan-50",
  },
  {
    icon: RotateCcw,
    label: "Process Return",
    href: "/dashboard/returns",
    color: "text-pink-600",
    bg: "bg-pink-50",
  },
  {
    icon: BarChart3,
    label: "View Reports",
    href: "/dashboard/reports",
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    icon: Settings,
    label: "Settings",
    href: "/dashboard/settings",
    color: "text-gray-600",
    bg: "bg-gray-50",
  },
];

export default function DashboardPage() {
  const { user, tenant } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<TimePeriod>("7days");
  const [activityData, setActivityData] = useState<{
    summary: {
      totalActivities: number;
      mostActiveUser: string;
      topModule: string;
      topAction: string;
    };
    actionBreakdown: { _id: string; count: number }[];
    moduleBreakdown: { _id: string; count: number }[];
  } | null>(null);

  const fetchDashboard = useCallback(async (p: TimePeriod) => {
    try {
      const [dashRes, salesRes, activityRes] = await Promise.all([
        fetch(`/api/dashboard?period=${periodApiMap[p]}`, {
          cache: "no-store",
        }),
        fetch("/api/sales?limit=5", { cache: "no-store" }),
        fetch("/api/activity-logs?limit=50", { cache: "no-store" }),
      ]);
      if (dashRes.ok) setData(await dashRes.json());
      if (salesRes.ok) {
        const salesData = await salesRes.json();
        setRecentSales(salesData.sales || []);
      }
      if (activityRes.ok) {
        setActivityData(await activityRes.json());
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchDashboard(period);
  }, [fetchDashboard, period]);

  const currency = tenant?.settings?.currency || "UGX";

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const summaryCards = [
    {
      title: "Sales Total",
      value: formatCurrency(data?.summary.salesTotal || 0, currency),
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    },
    {
      title: "Purchases Total",
      value: formatCurrency(data?.summary.purchasesTotal || 0, currency),
      icon: ShoppingCart,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      title: "Profit Total",
      value: formatCurrency(data?.summary.netProfit || 0, currency),
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-100",
    },
    {
      title: "Gross Profit",
      value: formatCurrency(data?.summary.grossProfit || 0, currency),
      icon: Activity,
      color: "text-teal-600",
      bg: "bg-teal-50",
      border: "border-teal-100",
    },
    {
      title: "Expenses Total",
      value: formatCurrency(data?.summary.expensesTotal || 0, currency),
      icon: TrendingDown,
      color: "text-rose-600",
      bg: "bg-rose-50",
      border: "border-rose-100",
    },
    {
      title: "Stock Value",
      value: formatCurrency(data?.summary.stockValue || 0, currency),
      icon: Package,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-100",
    },
    {
      title: "Credit Balance",
      value: formatCurrency(data?.summary.creditBalance || 0, currency),
      icon: CreditCard,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
    },
    {
      title: "Cost of Goods Sold",
      value: formatCurrency(data?.summary.cogsTotal || 0, currency),
      icon: BarChart3,
      color: "text-slate-600",
      bg: "bg-slate-50",
      border: "border-slate-100",
    },
  ];

  const paymentIcon = (method: string) => {
    switch (method) {
      case "card":
        return <CreditCard className="w-3.5 h-3.5" />;
      case "mobile_money":
        return <Smartphone className="w-3.5 h-3.5" />;
      default:
        return <Banknote className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 p-6 shadow-lg shadow-orange-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {getGreeting()}, {user?.name?.split(" ")[0]} 👋
            </h1>
            <p className="text-orange-100 mt-1 text-sm">
              Here&apos;s what&apos;s happening at {tenant?.name}.
            </p>
          </div>
          {/* Period Selector */}
          <div className="flex flex-wrap gap-1.5 bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 p-1">
            {(Object.keys(periodLabels) as TimePeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  period === p
                    ? "bg-white text-orange-600 shadow-sm"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <div
            key={i}
            className={`bg-white rounded-2xl border ${card.border} p-5 hover:shadow-md transition-all duration-300`}
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center`}
              >
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest hidden md:block">
                Real-time
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">
                {card.title}
              </p>
              {loading ? (
                <div className="h-7 w-32 bg-slate-50 rounded-lg animate-pulse" />
              ) : (
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  {card.value}
                </h3>
              )}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Active Insight
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Sales Trend
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Revenue for {periodLabels[period].toLowerCase()}
              </p>
            </div>
            <Link
              href="/dashboard/sales"
              className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="h-56 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-orange-500" />
            </div>
          ) : data?.weeklySales && data.weeklySales.length > 0 ? (
            <div className="h-56 flex items-end gap-2 overflow-hidden px-2">
              {(() => {
                const maxVal = Math.max(
                  ...data.weeklySales.map((d) => d.total),
                );
                const sorted = [...data.weeklySales]
                  .map((d) => d.total)
                  .sort((a, b) => b - a);
                const getBarColor = (total: number) => {
                  if (total === 0)
                    return "from-gray-300 to-gray-200 hover:from-gray-400 hover:to-gray-300";
                  const rank = sorted.indexOf(total);
                  if (rank === 0)
                    return "from-emerald-500 to-green-400 hover:from-emerald-600 hover:to-green-500";
                  if (rank === sorted.length - 1)
                    return "from-red-500 to-rose-400 hover:from-red-600 hover:to-rose-500";
                  return "from-orange-500 to-amber-400 hover:from-orange-600 hover:to-amber-500";
                };
                return data.weeklySales.map((day, i) => {
                  const height = maxVal > 0 ? (day.total / maxVal) * 100 : 0;
                  return (
                    <div
                      key={i}
                      className="flex min-w-0 flex-1 flex-col items-center gap-2 group/bar"
                    >
                      <span className="text-[10px] font-medium text-gray-500 opacity-0 group-hover/bar:opacity-100 transition-opacity">
                        {formatCurrency(day.total, currency)}
                      </span>
                      <div className="w-full relative">
                        <div
                          className={`w-full bg-gradient-to-t ${getBarColor(day.total)} rounded-t-lg transition-all duration-500 cursor-pointer relative group/tooltip`}
                          style={{
                            height: `${Math.max(Math.min(height, 92) * 1.6, 6)}px`,
                          }}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            {day.count} orders
                          </div>
                        </div>
                      </div>
                      <span className="text-center text-[11px] font-medium text-gray-400">
                        {formatChartLabel(day._id, period)}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-gray-400">
              <ShoppingCart className="w-10 h-10 mb-3 text-gray-300" />
              <p className="text-sm font-medium">No sales data yet</p>
              <p className="text-xs mt-1">
                Complete some transactions to see the chart.
              </p>
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900">
              Top Products
            </h2>
            <Link
              href="/dashboard/inventory"
              className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-14 bg-gray-50 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : data?.topProducts && data.topProducts.length > 0 ? (
            <div className="space-y-2">
              {data.topProducts.slice(0, 6).map((product, i) => {
                const maxRev = Math.max(
                  ...data.topProducts.map((p) => p.totalRevenue),
                );
                const pct =
                  maxRev > 0 ? (product.totalRevenue / maxRev) * 100 : 0;
                return (
                  <div
                    key={i}
                    className="relative rounded-xl p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {product.name}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {product.totalQuantity} sold
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(product.totalRevenue, currency)}
                      </span>
                    </div>
                    <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <Package className="w-8 h-8 mb-2 text-gray-300" />
              <p className="text-sm">No sales data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {quickActions.map((action, i) => (
            <Link
              key={i}
              href={action.href}
              className="flex flex-col items-center gap-2 rounded-xl p-3 md:p-4 border border-gray-100 hover:shadow-md hover:border-orange-200 transition-all group"
            >
              <div
                className={`w-9 h-9 md:w-10 md:h-10 ${action.bg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}
              >
                <action.icon
                  className={`w-4.5 h-4.5 md:w-5 md:h-5 ${action.color}`}
                />
              </div>
              <span className="text-[10px] md:text-xs font-medium text-gray-700 text-center">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900">
              Recent Transactions
            </h2>
            <Link
              href="/dashboard/sales"
              className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentSales.length > 0 ? (
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <div
                  key={sale._id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">
                      {paymentIcon(sale.paymentMethod)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {sale.orderNumber}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-gray-400">
                          {sale.customerId?.name || "Walk-in"}
                        </span>
                        <span className="text-gray-300">Â·</span>
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(sale.createdAt).toLocaleDateString("en", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(sale.total, currency)}
                    </p>
                    <span
                      className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                        sale.status === "completed"
                          ? "bg-emerald-50 text-emerald-700"
                          : sale.status === "pending"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-red-50 text-red-700"
                      }`}
                    >
                      {sale.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <ShoppingCart className="w-8 h-8 mb-2 text-gray-300" />
              <p className="text-sm">No transactions yet</p>
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Low Stock
              Alerts
            </h2>
            <Link
              href="/dashboard/stock"
              className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
            >
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {data?.lowStockAlerts && data.lowStockAlerts.length > 0 ? (
            <div className="space-y-2">
              {data.lowStockAlerts.slice(0, 6).map((item, i) => {
                const pct =
                  item.reorderLevel > 0
                    ? Math.min((item.quantity / item.reorderLevel) * 100, 100)
                    : 0;
                const isVeryLow = pct < 30;
                return (
                  <div
                    key={i}
                    className="p-3 rounded-xl border border-gray-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.productId?.name || "Unknown"}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {item.productId?.sku}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-lg font-bold ${isVeryLow ? "text-red-600" : "text-amber-600"}`}
                        >
                          {item.quantity}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          of {item.reorderLevel} min
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isVeryLow ? "bg-red-500" : "bg-amber-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <Package className="w-8 h-8 mb-2 text-gray-300" />
              <p className="text-sm font-medium">All stocked up!</p>
              <p className="text-xs mt-1">No items below reorder level</p>
            </div>
          )}
        </div>
      </div>

      {/* Activity Summary */}
      {activityData && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-500" /> Activity Summary
            </h2>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 p-4 border border-orange-100">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-600/70">
                Total Activities
              </p>
              <p className="text-2xl font-bold text-orange-700 mt-1">
                {activityData.summary.totalActivities}
              </p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4 border border-blue-100">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600/70">
                Most Active User
              </p>
              <p className="text-sm font-bold text-blue-700 mt-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                {activityData.summary.mostActiveUser || "—"}
              </p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 p-4 border border-emerald-100">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600/70">
                Top Module
              </p>
              <p className="text-sm font-bold text-emerald-700 mt-1 capitalize">
                {activityData.summary.topModule || "—"}
              </p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 p-4 border border-violet-100">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-600/70">
                Top Action
              </p>
              <p className="text-sm font-bold text-violet-700 mt-1 capitalize">
                {activityData.summary.topAction || "—"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Actions Breakdown */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Actions Breakdown
              </h3>
              <div className="space-y-2">
                {activityData.actionBreakdown.length > 0 ? (
                  activityData.actionBreakdown.map((a) => {
                    const maxCount = Math.max(
                      ...activityData.actionBreakdown.map((x) => x.count),
                    );
                    const pct = maxCount > 0 ? (a.count / maxCount) * 100 : 0;
                    const colors: Record<string, string> = {
                      login: "from-blue-400 to-blue-500",
                      create: "from-emerald-400 to-emerald-500",
                      update: "from-amber-400 to-amber-500",
                      delete: "from-red-400 to-red-500",
                      view: "from-gray-400 to-gray-500",
                    };
                    return (
                      <div key={a._id} className="flex items-center gap-3">
                        <span className="w-16 text-[12px] font-medium text-gray-500 capitalize">
                          {a._id}
                        </span>
                        <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${colors[a._id] || "from-gray-400 to-gray-500"} rounded-lg flex items-center justify-end pr-2 transition-all`}
                            style={{ width: `${Math.max(pct, 8)}%` }}
                          >
                            <span className="text-[10px] font-bold text-white">
                              {a.count}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-400">No activity data yet</p>
                )}
              </div>
            </div>

            {/* Modules Breakdown */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Modules Breakdown
              </h3>
              <div className="space-y-2">
                {activityData.moduleBreakdown.length > 0 ? (
                  activityData.moduleBreakdown.map((m) => {
                    const maxCount = Math.max(
                      ...activityData.moduleBreakdown.map((x) => x.count),
                    );
                    const pct = maxCount > 0 ? (m.count / maxCount) * 100 : 0;
                    const colors: Record<string, string> = {
                      auth: "from-blue-400 to-indigo-500",
                      items: "from-emerald-400 to-green-500",
                      sales: "from-orange-400 to-amber-500",
                      purchases: "from-purple-400 to-violet-500",
                      customers: "from-pink-400 to-rose-500",
                      vendors: "from-teal-400 to-cyan-500",
                      stock: "from-yellow-400 to-amber-500",
                      expenses: "from-red-400 to-rose-500",
                      invoices: "from-sky-400 to-blue-500",
                      settings: "from-gray-400 to-gray-500",
                    };
                    return (
                      <div key={m._id} className="flex items-center gap-3">
                        <span className="w-20 text-[12px] font-medium text-gray-500 capitalize">
                          {m._id}
                        </span>
                        <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${colors[m._id] || "from-gray-400 to-gray-500"} rounded-lg flex items-center justify-end pr-2 transition-all`}
                            style={{ width: `${Math.max(pct, 8)}%` }}
                          >
                            <span className="text-[10px] font-bold text-white">
                              {m.count}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-400">No activity data yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
