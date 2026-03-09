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
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

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

export default function DashboardPage() {
  const { user, tenant } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashRes, salesRes] = await Promise.all([
        fetch("/api/dashboard?period=week"),
        fetch("/api/sales?limit=5"),
      ]);
      if (dashRes.ok) setData(await dashRes.json());
      if (salesRes.ok) {
        const salesData = await salesRes.json();
        setRecentSales(salesData.sales || []);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const currency = tenant?.settings?.currency || "UGX";

  const summaryCards = [
    {
      title: "Today's Revenue",
      value: formatCurrency(data?.summary.todaySales || 0, currency),
      growth: data?.summary.salesGrowth || 0,
      icon: DollarSign,
      gradient: "from-teal-500 to-emerald-600",
      bgLight: "bg-teal-50",
    },
    {
      title: "Total Orders",
      value: String(data?.summary.todayOrders || 0),
      growth: data?.summary.ordersGrowth || 0,
      icon: ShoppingCart,
      gradient: "from-blue-500 to-indigo-600",
      bgLight: "bg-blue-50",
    },
    {
      title: "Items in Stock",
      value: (data?.summary.totalStock || 0).toLocaleString(),
      growth: 0,
      icon: Package,
      gradient: "from-amber-500 to-orange-600",
      bgLight: "bg-amber-50",
    },
    {
      title: "Active Customers",
      value: String(data?.summary.totalCustomers || 0),
      growth: 0,
      icon: Users,
      gradient: "from-violet-500 to-purple-600",
      bgLight: "bg-violet-50",
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Welcome back, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Here&apos;s what&apos;s happening at {tenant?.name} today.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <div
            key={i}
            className="group relative bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 -mr-6 -mt-6 opacity-[0.07]">
              <div
                className={`w-full h-full rounded-full bg-gradient-to-br ${card.gradient}`}
              />
            </div>
            <div className="flex items-start justify-between relative">
              <div>
                <p className="text-[13px] font-medium text-gray-500">
                  {card.title}
                </p>
                {loading ? (
                  <div className="h-8 w-28 bg-gray-100 rounded-lg animate-pulse mt-2" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900 mt-1 tracking-tight">
                    {card.value}
                  </p>
                )}
                {card.growth !== 0 && !loading && (
                  <div
                    className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                      card.growth > 0
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {card.growth > 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {Math.abs(card.growth)}% vs yesterday
                  </div>
                )}
              </div>
              <div
                className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg shadow-${card.gradient.split("-")[1]}-500/25`}
              >
                <card.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Sales Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Weekly Sales
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Revenue trend for the last 7 days
              </p>
            </div>
            <Link
              href="/dashboard/sales"
              className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="h-56 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-teal-500" />
            </div>
          ) : data?.weeklySales && data.weeklySales.length > 0 ? (
            <div className="h-56 flex items-end gap-3 px-2">
              {data.weeklySales.map((day, i) => {
                const maxVal = Math.max(
                  ...data.weeklySales.map((d) => d.total),
                );
                const height = maxVal > 0 ? (day.total / maxVal) * 100 : 0;
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-2 group/bar"
                  >
                    <span className="text-[10px] font-medium text-gray-500 opacity-0 group-hover/bar:opacity-100 transition-opacity">
                      {formatCurrency(day.total, currency)}
                    </span>
                    <div className="w-full relative">
                      <div
                        className="w-full bg-gradient-to-t from-teal-500 to-emerald-400 rounded-t-lg transition-all duration-500 hover:from-teal-600 hover:to-emerald-500 cursor-pointer relative group/tooltip"
                        style={{ height: `${Math.max(height * 1.8, 6)}px` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          {day.count} orders
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-gray-400">
                      {new Date(day._id).toLocaleDateString("en", {
                        weekday: "short",
                      })}
                    </span>
                  </div>
                );
              })}
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
              className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
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
                        <span className="w-6 h-6 rounded-lg bg-teal-50 text-teal-600 text-xs font-bold flex items-center justify-center">
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
                        className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full transition-all duration-700"
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900">
              Recent Transactions
            </h2>
            <Link
              href="/dashboard/sales"
              className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
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
                        <span className="text-gray-300">·</span>
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
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Low Stock Alerts
            </h2>
            <Link
              href="/dashboard/stock"
              className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
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
    </div>
  );
}
