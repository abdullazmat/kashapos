"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "../layout";
import {
  Receipt,
  DollarSign,
  TrendingUp,
  FileText,
  Download,
  Calendar,
} from "lucide-react";
import { downloadCsv, formatCurrency } from "@/lib/utils";

interface TaxData {
  summary: {
    totalSales: number;
    totalTax: number;
    totalSubtotal: number;
    count: number;
  };
  taxByMonth: {
    _id: string;
    totalSales: number;
    totalTax: number;
    count: number;
  }[];
  taxByProduct: {
    _id: string;
    totalSales: number;
    totalTax: number;
    quantity: number;
  }[];
  taxByPaymentMethod: {
    _id: string;
    totalSales: number;
    totalTax: number;
    count: number;
  }[];
}

export default function TaxesPage() {
  const { tenant } = useSession();
  const [data, setData] = useState<TaxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const currency = tenant?.settings?.currency || "UGX";
  const taxRate = tenant?.settings?.taxRate || 18;

  const fetchTaxes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/taxes?period=${period}`);
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("Tax fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchTaxes();
  }, [fetchTaxes]);

  const formatMonth = (m: string) => {
    const [year, month] = m.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-UG", {
      month: "short",
      year: "numeric",
    });
  };

  const paymentMethodLabel = (m: string) => {
    const labels: Record<string, string> = {
      cash: "Cash",
      card: "Card",
      mobile_money: "Mobile Money",
      split: "Split Payment",
    };
    return labels[m] || m;
  };

  const exportTaxes = () => {
    if (!data) return;

    downloadCsv(`taxes-${period}.csv`, [
      {
        section: "Summary",
        totalSales: data.summary.totalSales,
        totalTax: data.summary.totalTax,
        totalSubtotal: data.summary.totalSubtotal,
        transactions: data.summary.count,
      },
      ...data.taxByMonth.map((month) => ({
        section: `Month ${month._id}`,
        totalSales: month.totalSales,
        totalTax: month.totalTax,
        totalSubtotal: "",
        transactions: month.count,
      })),
      ...data.taxByPaymentMethod.map((method) => ({
        section: `Payment ${paymentMethodLabel(method._id)}`,
        totalSales: method.totalSales,
        totalTax: method.totalTax,
        totalSubtotal: "",
        transactions: method.count,
      })),
      ...data.taxByProduct.map((product) => ({
        section: `Product ${product._id}`,
        totalSales: product.totalSales,
        totalTax: product.totalTax,
        totalSubtotal: product.quantity,
        transactions: "",
      })),
    ]);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/20">
            <Receipt className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Taxes</h1>
            <p className="text-[13px] text-gray-400">
              Tax collection overview &amp; reports (VAT {taxRate}%)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-600 transition-colors focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button
            onClick={exportTaxes}
            disabled={!data}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg hover:shadow-orange-500/30 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-orange-500" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              {
                label: "Total Tax Collected",
                value: formatCurrency(data?.summary.totalTax || 0, currency),
                sub: `VAT @ ${taxRate}%`,
                icon: Receipt,
                gradient: "from-emerald-500 to-teal-600",
                shadow: "shadow-emerald-500/20",
              },
              {
                label: "Total Sales",
                value: formatCurrency(data?.summary.totalSales || 0, currency),
                sub: `${data?.summary.count || 0} transactions`,
                icon: DollarSign,
                gradient: "from-blue-500 to-indigo-600",
                shadow: "shadow-blue-500/20",
              },
              {
                label: "Taxable Amount",
                value: formatCurrency(
                  data?.summary.totalSubtotal || 0,
                  currency,
                ),
                sub: "Before tax",
                icon: TrendingUp,
                gradient: "from-amber-500 to-orange-600",
                shadow: "shadow-amber-500/20",
              },
              {
                label: "Effective Tax Rate",
                value: `${data?.summary.totalSales ? ((data.summary.totalTax / data.summary.totalSales) * 100).toFixed(1) : "0"}%`,
                sub: "Of total revenue",
                icon: FileText,
                gradient: "from-purple-500 to-violet-600",
                shadow: "shadow-purple-500/20",
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-lg hover:shadow-gray-200/50"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] text-gray-400">
                    {card.label}
                  </span>
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg ${card.shadow}`}
                  >
                    <card.icon className="h-4 w-4 text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-800">{card.value}</p>
                <p className="text-[12px] text-gray-400 mt-1">{card.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Tax by Month */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900">
                  Monthly Tax Collection
                </h3>
                <Calendar className="w-4 h-4 text-gray-400" />
              </div>
              {data?.taxByMonth && data.taxByMonth.length > 0 ? (
                <div className="space-y-3">
                  {data.taxByMonth.map((month) => {
                    const maxTax = Math.max(
                      ...data.taxByMonth.map((m) => m.totalTax),
                    );
                    const pct =
                      maxTax > 0 ? (month.totalTax / maxTax) * 100 : 0;
                    return (
                      <div key={month._id}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-700">
                            {formatMonth(month._id)}
                          </span>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(month.totalTax, currency)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-orange-500 h-2 rounded-full transition-all"
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                          <span>{month.count} sales</span>
                          <span>
                            Revenue:{" "}
                            {formatCurrency(month.totalSales, currency)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12 text-sm">
                  No tax data for this period
                </div>
              )}
            </div>

            {/* Tax by Payment Method */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                Tax by Payment Method
              </h3>
              {data?.taxByPaymentMethod &&
              data.taxByPaymentMethod.length > 0 ? (
                <div className="space-y-4">
                  {data.taxByPaymentMethod.map((pm) => (
                    <div
                      key={pm._id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {paymentMethodLabel(pm._id)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {pm.count} transactions
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(pm.totalTax, currency)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Sales: {formatCurrency(pm.totalSales, currency)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12 text-sm">
                  No data for this period
                </div>
              )}
            </div>
          </div>

          {/* Tax by Product */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">
                Tax by Product
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Product
                    </th>
                    <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Qty Sold
                    </th>
                    <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Total Sales
                    </th>
                    <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Tax Collected
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data?.taxByProduct && data.taxByProduct.length > 0 ? (
                    data.taxByProduct.map((product, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-50 hover:bg-gray-50"
                      >
                        <td className="px-5 py-3 text-sm text-gray-900">
                          {product._id}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-700 text-right">
                          {product.quantity}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-700 text-right">
                          {formatCurrency(product.totalSales, currency)}
                        </td>
                        <td className="px-5 py-3 text-sm font-medium text-gray-900 text-right">
                          {formatCurrency(product.totalTax, currency)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-12 text-center text-sm text-gray-500"
                      >
                        No product tax data for this period
                      </td>
                    </tr>
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
