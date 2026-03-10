"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  Wallet,
  CreditCard,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSession } from "../layout";

type CustomerTab = "all" | "payments" | "balances";

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  totalPurchases: number;
  totalSpent: number;
  balance?: number;
  creditLimit?: number;
  isActive: boolean;
  createdAt: string;
}

export default function CustomersPage() {
  const { tenant } = useSession();
  const currency = tenant?.settings?.currency || "UGX";
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeTab, setActiveTab] = useState<CustomerTab>("all");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    creditLimit: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "cash",
    reference: "",
    notes: "",
  });

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "20",
      ...(search && { search }),
    });
    try {
      const res = await fetch(`/api/customers?${params}`);
      if (res.ok) {
        const d = await res.json();
        setCustomers(d.customers || []);
        setTotal(d.total || 0);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
      creditLimit: "",
    });
    setShowModal(true);
  };
  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      notes: "",
      creditLimit: c.creditLimit?.toString() || "",
    });
    setShowModal(true);
  };

  const openPayment = (c: Customer) => {
    setPaymentCustomer(c);
    setPaymentForm({ amount: "", method: "cash", reference: "", notes: "" });
    setShowPaymentModal(true);
  };

  const submitPayment = async () => {
    if (!paymentCustomer || !paymentForm.amount) return;
    const res = await fetch(`/api/customers/${paymentCustomer._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: paymentCustomer.name,
        email: paymentCustomer.email,
        phone: paymentCustomer.phone,
        address: paymentCustomer.address,
        payment: {
          amount: parseFloat(paymentForm.amount),
          method: paymentForm.method,
          reference: paymentForm.reference,
          notes: paymentForm.notes,
        },
      }),
    });
    if (res.ok) {
      setShowPaymentModal(false);
      fetchCustomers();
    }
  };

  const saveCustomer = async () => {
    const url = editing ? `/api/customers/${editing._id}` : "/api/customers";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        creditLimit: form.creditLimit
          ? parseFloat(form.creditLimit)
          : undefined,
      }),
    });
    if (res.ok) {
      setShowModal(false);
      fetchCustomers();
    }
  };

  const deleteCustomer = async (id: string) => {
    if (!confirm("Delete this customer?")) return;
    await fetch(`/api/customers/${id}`, { method: "DELETE" });
    fetchCustomers();
  };

  const totalPages = Math.ceil(total / 20);
  const inputClass =
    "mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-[13px] text-gray-500">
              Manage your customer database
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setPaymentCustomer(null);
              setPaymentForm({
                amount: "",
                method: "cash",
                reference: "",
                notes: "",
              });
              setShowPaymentModal(true);
            }}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50"
          >
            <Wallet className="h-4 w-4" /> Add Payment
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg hover:shadow-orange-500/30"
          >
            <Plus className="h-4 w-4" /> Add Customer
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Total Customers",
            value: total,
            icon: Users,
            color: "violet",
          },
          {
            label: "Active",
            value: customers.filter((c) => c.isActive).length,
            icon: TrendingUp,
            color: "emerald",
          },
          {
            label: "Total Revenue",
            value: formatCurrency(
              customers.reduce((s, c) => s + c.totalSpent, 0),
              currency,
            ),
            icon: DollarSign,
            color: "orange",
          },
          {
            label: "With Balance",
            value: customers.filter((c) => (c.balance ?? 0) > 0).length,
            icon: CreditCard,
            color: "amber",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl bg-${stat.color}-50`}
              >
                <stat.icon className={`h-4 w-4 text-${stat.color}-600`} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                  {stat.label}
                </p>
                <p className="text-lg font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {(
          [
            { key: "all", label: "All Customers" },
            { key: "payments", label: "Payments" },
            { key: "balances", label: "Balances" },
          ] as { key: CustomerTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search customers by name, phone, or email..."
          className="w-full rounded-xl border border-gray-200 bg-white px-10 py-2.5 text-sm shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="px-5 py-3.5 text-left text-[13px] font-semibold text-gray-600">
                Customer
              </th>
              <th className="px-5 py-3.5 text-left text-[13px] font-semibold text-gray-600">
                Contact
              </th>
              <th className="px-5 py-3.5 text-right text-[13px] font-semibold text-gray-600">
                Purchases
              </th>
              <th className="px-5 py-3.5 text-right text-[13px] font-semibold text-gray-600">
                Total Spent
              </th>
              <th className="px-5 py-3.5 text-right text-[13px] font-semibold text-gray-600">
                Balance
              </th>
              <th className="px-5 py-3.5 text-right text-[13px] font-semibold text-gray-600">
                Credit Limit
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
                    <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-violet-500" />
                    <span className="text-sm text-gray-400">
                      Loading customers...
                    </span>
                  </div>
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                      <Users className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="font-medium text-gray-500">
                      No customers found
                    </p>
                    <p className="text-[13px] text-gray-400">
                      Add your first customer
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr
                  key={c._id}
                  className="group transition-colors hover:bg-gray-50/80"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-purple-200 text-xs font-bold text-violet-700">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {c.name}
                        </div>
                        {c.address && (
                          <div className="flex items-center gap-1 text-[11px] text-gray-400">
                            <MapPin className="h-3 w-3" />
                            {c.address}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="space-y-1">
                      {c.phone && (
                        <div className="flex items-center gap-1.5 text-[13px] text-gray-600">
                          <Phone className="h-3 w-3 text-gray-400" />
                          {c.phone}
                        </div>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-[13px] text-gray-500">
                          <Mail className="h-3 w-3 text-gray-400" />
                          {c.email}
                        </div>
                      )}
                      {!c.phone && !c.email && (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-600/10">
                      {c.totalPurchases} orders
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-gray-900">
                    {formatCurrency(c.totalSpent, currency)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span
                      className={`font-semibold ${(c.balance ?? 0) > 0 ? "text-red-600" : "text-gray-400"}`}
                    >
                      {formatCurrency(c.balance ?? 0, currency)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-gray-500">
                    {c.creditLimit
                      ? formatCurrency(c.creditLimit, currency)
                      : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        c.isActive
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-amber-600/20"
                          : "bg-red-50 text-red-700 ring-1 ring-red-600/20"
                      }`}
                    >
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => openPayment(c)}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                        title="Add Payment"
                      >
                        <Wallet className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEdit(c)}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-violet-50 hover:text-violet-600"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteCustomer(c._id)}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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
              <span className="ml-2">{total} customers</span>
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

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-md shadow-violet-500/20">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <h2 className="font-bold text-gray-900">
                  {editing ? "Edit Customer" : "Add Customer"}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5">
              <div className="space-y-4">
                <div>
                  <label className="text-[13px] font-semibold text-gray-700">
                    Name *
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-gray-700">
                    Phone
                  </label>
                  <input
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-gray-700">
                    Address
                  </label>
                  <textarea
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                    rows={2}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-gray-700">
                    Credit Limit
                  </label>
                  <input
                    type="number"
                    value={form.creditLimit}
                    onChange={(e) =>
                      setForm({ ...form, creditLimit: e.target.value })
                    }
                    placeholder="e.g. 500000"
                    className={inputClass}
                  />
                  <p className="mt-1 text-[11px] text-gray-400">
                    Maximum credit allowed for this customer
                  </p>
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
                onClick={saveCustomer}
                disabled={!form.name}
                className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg disabled:opacity-50 disabled:shadow-none"
              >
                {editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowPaymentModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-md shadow-emerald-500/20">
                  <Wallet className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">Add Payment</h2>
                  <p className="text-[12px] text-gray-500">
                    {paymentCustomer
                      ? paymentCustomer.name
                      : "Select a customer below"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {!paymentCustomer && (
                <div>
                  <label className="text-[13px] font-semibold text-gray-700">
                    Customer *
                  </label>
                  <select
                    value=""
                    onChange={(e) => {
                      const c = customers.find((c) => c._id === e.target.value);
                      if (c) setPaymentCustomer(c);
                    }}
                    className={inputClass}
                  >
                    <option value="">Select customer…</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                        {(c.balance ?? 0) > 0
                          ? ` (Balance: ${formatCurrency(c.balance ?? 0, currency)})`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {paymentCustomer && (paymentCustomer.balance ?? 0) > 0 && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm">
                  <span className="text-red-600 font-medium">
                    Outstanding Balance:{" "}
                  </span>
                  <span className="text-red-700 font-bold">
                    {formatCurrency(paymentCustomer.balance ?? 0, currency)}
                  </span>
                </div>
              )}
              <div>
                <label className="text-[13px] font-semibold text-gray-700">
                  Amount *
                </label>
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, amount: e.target.value })
                  }
                  placeholder="Enter payment amount"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-[13px] font-semibold text-gray-700">
                  Payment Method
                </label>
                <select
                  value={paymentForm.method}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, method: e.target.value })
                  }
                  className={inputClass}
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="card">Card</option>
                </select>
              </div>
              <div>
                <label className="text-[13px] font-semibold text-gray-700">
                  Reference
                </label>
                <input
                  value={paymentForm.reference}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      reference: e.target.value,
                    })
                  }
                  placeholder="Transaction reference (optional)"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-[13px] font-semibold text-gray-700">
                  Notes
                </label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, notes: e.target.value })
                  }
                  rows={2}
                  placeholder="Payment notes (optional)"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitPayment}
                disabled={!paymentCustomer || !paymentForm.amount}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-emerald-500/25 transition-all hover:shadow-lg disabled:opacity-50 disabled:shadow-none"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
