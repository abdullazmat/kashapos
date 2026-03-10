"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DollarSign,
  Plus,
  Search,
  Trash2,
  X,
  Calendar,
  Banknote,
  CreditCard,
  Smartphone,
  Building2,
  TrendingDown,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSession } from "../layout";

interface ExpenseItem {
  _id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  paymentMethod: string;
  reference?: string;
  notes: string;
  createdBy?: { name: string };
  vendorId?: { name: string };
}

const CATEGORIES = [
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities" },
  { value: "salaries", label: "Salaries" },
  { value: "supplies", label: "Supplies" },
  { value: "transport", label: "Transport" },
  { value: "marketing", label: "Marketing" },
  { value: "maintenance", label: "Maintenance" },
  { value: "taxes", label: "Taxes" },
  { value: "insurance", label: "Insurance" },
  { value: "other", label: "Other" },
];

const categoryColors: Record<string, string> = {
  rent: "bg-blue-50 text-blue-700",
  utilities: "bg-amber-50 text-amber-700",
  salaries: "bg-green-50 text-green-700",
  supplies: "bg-purple-50 text-purple-700",
  transport: "bg-orange-50 text-orange-700",
  marketing: "bg-pink-50 text-pink-700",
  maintenance: "bg-cyan-50 text-cyan-700",
  taxes: "bg-red-50 text-red-700",
  insurance: "bg-indigo-50 text-indigo-700",
  other: "bg-gray-50 text-gray-700",
};

const inputClass =
  "mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20";

export default function ExpensesPage() {
  const { tenant } = useSession();
  const currency = tenant?.settings?.currency || "UGX";
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    category: "other",
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "cash",
    reference: "",
    notes: "",
  });

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(filterCategory && { category: filterCategory }),
      });
      const res = await fetch(`/api/expenses?${params}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
        setTotal(data.total || 0);
        setTotalAmount(data.totalAmount || 0);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [page, filterCategory]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleSave = async () => {
    if (!form.description || !form.amount) return;
    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount) || 0,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({
          category: "other",
          description: "",
          amount: "",
          date: new Date().toISOString().split("T")[0],
          paymentMethod: "cash",
          reference: "",
          notes: "",
        });
        fetchExpenses();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save");
      }
    } catch {
      alert("Network error");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    const res = await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchExpenses();
  };

  const filtered = useMemo(() => {
    if (!search) return expenses;
    const q = search.toLowerCase();
    return expenses.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q),
    );
  }, [expenses, search]);

  const thisMonthTotal = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const paymentIcon = (method: string) => {
    switch (method) {
      case "card":
        return <CreditCard className="w-3.5 h-3.5" />;
      case "mobile_money":
        return <Smartphone className="w-3.5 h-3.5" />;
      case "bank_transfer":
        return <Building2 className="w-3.5 h-3.5" />;
      default:
        return <Banknote className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/20">
            <TrendingDown className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
            <p className="text-[13px] text-gray-500">
              Track business expenses for P&L
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg hover:shadow-orange-500/30"
        >
          <Plus className="h-4 w-4" /> Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-[13px] font-medium text-gray-500">
            Total Expenses
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(totalAmount, currency)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-[13px] font-medium text-gray-500">This Month</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {formatCurrency(thisMonthTotal, currency)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-[13px] font-medium text-gray-500">Total Records</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{total}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expenses..."
            className="w-full rounded-xl border border-gray-200 bg-white px-10 py-2.5 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Quick Add Expense */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Quick Add Expense
        </h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[11px] font-medium text-gray-400 uppercase">
              Description
            </label>
            <input
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="What was the expense for?"
              className={inputClass}
            />
          </div>
          <div className="w-32">
            <label className="text-[11px] font-medium text-gray-400 uppercase">
              Amount
            </label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div className="w-36">
            <label className="text-[11px] font-medium text-gray-400 uppercase">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={inputClass}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="w-36">
            <label className="text-[11px] font-medium text-gray-400 uppercase">
              Date
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputClass}
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !form.description || !form.amount}
            className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg disabled:opacity-50 h-[42px] mt-1.5"
          >
            {saving ? "Saving..." : "Add"}
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="px-5 py-3.5 text-left text-[13px] font-semibold text-gray-600">
                Description
              </th>
              <th className="px-5 py-3.5 text-left text-[13px] font-semibold text-gray-600">
                Category
              </th>
              <th className="px-5 py-3.5 text-right text-[13px] font-semibold text-gray-600">
                Amount
              </th>
              <th className="px-5 py-3.5 text-left text-[13px] font-semibold text-gray-600">
                Date
              </th>
              <th className="px-5 py-3.5 text-left text-[13px] font-semibold text-gray-600">
                Payment
              </th>
              <th className="px-5 py-3.5 text-right text-[13px] font-semibold text-gray-600"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-orange-500" />
                    <span className="text-sm text-gray-400">
                      Loading expenses...
                    </span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <DollarSign className="h-10 w-10 text-gray-300" />
                    <p className="font-medium text-gray-500">
                      No expenses found
                    </p>
                    <p className="text-[13px] text-gray-400">
                      Add your first expense to start tracking
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((e) => (
                <tr
                  key={e._id}
                  className="group transition-colors hover:bg-gray-50/80"
                >
                  <td className="px-5 py-3.5">
                    <div>
                      <div className="font-semibold text-gray-900">
                        {e.description}
                      </div>
                      {e.reference && (
                        <div className="text-[11px] text-gray-400">
                          Ref: {e.reference}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${categoryColors[e.category] || "bg-gray-50 text-gray-700"}`}
                    >
                      {e.category}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-red-600">
                    -{formatCurrency(e.amount, currency)}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {formatDate(e.date)}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 text-gray-500 capitalize">
                      {paymentIcon(e.paymentMethod)}
                      {e.paymentMethod.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => handleDelete(e._id)}
                      className="rounded-lg p-1.5 text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Expense Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-600 shadow-md shadow-red-500/20">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
                <h2 className="font-bold text-gray-900">Add Expense</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              <div className="space-y-4">
                <div>
                  <label className="text-[13px] font-semibold text-gray-700">
                    Description *
                  </label>
                  <input
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="e.g., Monthly rent payment"
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[13px] font-semibold text-gray-700">
                      Category *
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value })
                      }
                      className={inputClass}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[13px] font-semibold text-gray-700">
                      Amount *
                    </label>
                    <input
                      type="number"
                      value={form.amount}
                      onChange={(e) =>
                        setForm({ ...form, amount: e.target.value })
                      }
                      placeholder="0"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[13px] font-semibold text-gray-700">
                      Date
                    </label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) =>
                        setForm({ ...form, date: e.target.value })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-semibold text-gray-700">
                      Payment Method
                    </label>
                    <select
                      value={form.paymentMethod}
                      onChange={(e) =>
                        setForm({ ...form, paymentMethod: e.target.value })
                      }
                      className={inputClass}
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-gray-700">
                    Reference
                  </label>
                  <input
                    value={form.reference}
                    onChange={(e) =>
                      setForm({ ...form, reference: e.target.value })
                    }
                    placeholder="Receipt/Invoice number"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-gray-700">
                    Notes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    rows={2}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.description || !form.amount}
                className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add Expense"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
