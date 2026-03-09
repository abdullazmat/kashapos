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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Taxes</h1>
          <p className="text-gray-500 text-sm mt-1">
            Tax collection overview and reports (VAT {taxRate}%)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
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
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">
                  Total Tax Collected
                </span>
                <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data?.summary.totalTax || 0, currency)}
              </p>
              <p className="text-xs text-gray-400 mt-1">VAT @ {taxRate}%</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">Total Sales</span>
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data?.summary.totalSales || 0, currency)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {data?.summary.count || 0} transactions
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">Taxable Amount</span>
                <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data?.summary.totalSubtotal || 0, currency)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Before tax</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">
                  Effective Tax Rate
                </span>
                <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {data?.summary.totalSales
                  ? (
                      (data.summary.totalTax / data.summary.totalSales) *
                      100
                    ).toFixed(1)
                  : "0"}
                %
              </p>
              <p className="text-xs text-gray-400 mt-1">Of total revenue</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Tax by Month */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
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
                            className="bg-teal-500 h-2 rounded-full transition-all"
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
            <div className="bg-white rounded-xl border border-gray-200 p-5">
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
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-5 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">
                Tax by Product
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                      Product
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                      Qty Sold
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                      Total Sales
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">
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
