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
  Banknote,
  Smartphone,
  CheckCircle2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSession } from "../layout";
import { useSearchParams } from "next/navigation";

type CustomerTab = "all" | "payments" | "balances";

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  totalPurchases: number;
  totalSpent: number;
  outstandingBalance?: number;
  creditLimit?: number;
  paymentStatus?: "cleared" | "partial" | "overdue";
  lastPaymentDate?: string;
  isActive: boolean;
  createdAt: string;
}

interface CustomerPaymentHistoryItem {
  _id: string;
  amount: number;
  method: string;
  reference?: string;
  notes?: string;
  balanceBefore: number;
  balanceAfter: number;
  recordedByName?: string;
  createdAt: string;
  saleId?: {
    orderNumber?: string;
    total?: number;
    amountPaid?: number;
  };
}

function formatPaymentMethodLabel(method?: string) {
  if (!method) return "—";
  return method
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<CustomerTab>(
    (searchParams.get("tab") as CustomerTab) || "all",
  );

  // Sync tab when URL search params change (e.g. sidebar sub-link clicks)
  useEffect(() => {
    const tab = searchParams.get("tab") as CustomerTab;
    if (tab && ["all", "payments", "balances"].includes(tab)) {
      setActiveTab(tab);
    }
    if (searchParams.get("action") === "add" && tab === "payments") {
      setShowPaymentModal(true);
    }
  }, [searchParams]);

  const [editing, setEditing] = useState<Customer | null>(null);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [historyItems, setHistoryItems] = useState<
    CustomerPaymentHistoryItem[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [sendingReminderCustomerId, setSendingReminderCustomerId] =
    useState("");
  const [reminderStatus, setReminderStatus] = useState("");
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

  const fetchPaymentHistory = useCallback(
    async (customerId: string, nextPage = 1) => {
      setHistoryLoading(true);
      try {
        const params = new URLSearchParams({
          page: nextPage.toString(),
          limit: "10",
        });
        const res = await fetch(
          `/api/customers/${customerId}/payments?${params}`,
        );
        if (res.ok) {
          const data = await res.json();
          setHistoryItems(data.payments || []);
          setHistoryPage(data.page || nextPage);
          setHistoryTotalPages(data.totalPages || 1);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setHistoryLoading(false);
      }
    },
    [],
  );

  const openHistory = (customer: Customer) => {
    setHistoryCustomer(customer);
    setShowHistoryPanel(true);
    setReminderStatus("");
    setHistoryItems([]);
    setHistoryPage(1);
    setHistoryTotalPages(1);
    void fetchPaymentHistory(customer._id, 1);
  };

  const sendBalanceReminder = async (customer: Customer) => {
    if (!customer.email || sendingReminderCustomerId) return;
    setSendingReminderCustomerId(customer._id);
    setReminderStatus("");
    try {
      const res = await fetch(
        `/api/customers/${customer._id}/balance-reminder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
      const payload = await res.json();
      if (!res.ok) {
        setReminderStatus(payload.error || "Failed to send reminder");
        return;
      }
      setReminderStatus(`Reminder sent to ${customer.name}.`);
    } catch {
      setReminderStatus("Failed to send reminder");
    } finally {
      setSendingReminderCustomerId("");
    }
  };

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
      if (historyCustomer?._id === paymentCustomer._id) {
        fetchPaymentHistory(paymentCustomer._id, historyPage);
      }
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
  const displayedCustomers =
    activeTab === "balances"
      ? customers.filter((c) => (c.outstandingBalance ?? 0) > 0)
      : activeTab === "payments"
        ? customers.filter((c) => Boolean(c.lastPaymentDate))
        : customers;
  const inputClass =
    "mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-[11px] md:text-[13px] text-gray-500">
              Manage your customer database
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
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
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs md:text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50"
          >
            <Wallet className="h-4 w-4" /> <span className="hidden sm:inline">Add Payment</span>
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-3 py-2 text-xs md:text-sm font-medium text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg"
          >
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add Customer</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
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
            value: customers.filter((c) => (c.outstandingBalance ?? 0) > 0)
              .length,
            icon: CreditCard,
            color: "amber",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-gray-100 bg-white p-4 transition-all hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 md:h-9 md:w-9 shrink-0 items-center justify-center rounded-xl bg-${stat.color}-50`}
              >
                <stat.icon className={`h-3.5 w-3.5 md:h-4 md:w-4 text-${stat.color}-600`} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[10px] md:text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                  {stat.label}
                </p>
                <p className="truncate text-base md:text-lg font-bold text-gray-900">{stat.value}</p>
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-100 bg-blue-50/60">
                <th className="px-3 md:px-5 py-3.5 text-left text-xs md:text-[13px] font-semibold text-gray-600">
                  Customer
                </th>
                <th className="hidden sm:table-cell px-5 py-3.5 text-left text-[13px] font-semibold text-gray-600">
                  Contact
                </th>
                <th className="hidden md:table-cell px-5 py-3.5 text-right text-[13px] font-semibold text-gray-600">
                  Purchases
                </th>
                <th className="px-3 md:px-5 py-3.5 text-right text-xs md:text-[13px] font-semibold text-gray-600">
                  Total Spent
                </th>
                <th className="px-3 md:px-5 py-3.5 text-right text-xs md:text-[13px] font-semibold text-gray-600">
                  Balance
                </th>
                <th className="hidden lg:table-cell px-5 py-3.5 text-right text-[13px] font-semibold text-gray-600">
                  Credit Limit
                </th>
                <th className="hidden lg:table-cell px-5 py-3.5 text-center text-[13px] font-semibold text-gray-600">
                  Payment Status
                </th>
                <th className="hidden sm:table-cell px-5 py-3.5 text-center text-[13px] font-semibold text-gray-600">
                  Last Payment
                </th>
                <th className="px-3 md:px-5 py-3.5 text-right text-xs md:text-[13px] font-semibold text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-violet-500" />
                      <span className="text-sm text-gray-400">
                        Loading customers...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : displayedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
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
                displayedCustomers.map((c) => (
                  <tr
                    key={c._id}
                    className="group transition-colors hover:bg-gray-50/80"
                  >
                    <td className="px-3 md:px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="hidden md:flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-purple-200 text-xs font-bold text-violet-700">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 text-xs md:text-sm truncate">
                            {c.name}
                          </div>
                          {c.address && (
                            <div className="flex items-center gap-1 text-[10px] md:text-[11px] text-gray-400 truncate max-w-[120px] md:max-w-none">
                              <MapPin className="h-2.5 w-2.5 shrink-0" />
                              {c.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-5 py-3.5">
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
                    <td className="hidden md:table-cell px-5 py-3.5 text-right">
                      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-600/10">
                        {c.totalPurchases} orders
                      </span>
                    </td>
                    <td className="px-3 md:px-5 py-3.5 text-right font-semibold text-gray-900 text-xs md:text-sm">
                      {formatCurrency(c.totalSpent, currency)}
                    </td>
                    <td className="px-3 md:px-5 py-3.5 text-right">
                      <span
                        className={`font-semibold text-xs md:text-sm ${(c.outstandingBalance ?? 0) > 0 ? "text-red-600" : "text-gray-400"}`}
                      >
                        {formatCurrency(c.outstandingBalance ?? 0, currency)}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell px-5 py-3.5 text-right text-gray-500">
                      {c.creditLimit
                        ? formatCurrency(c.creditLimit, currency)
                        : "—"}
                    </td>
                    <td className="hidden lg:table-cell px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          c.paymentStatus === "overdue"
                            ? "bg-red-50 text-red-700 ring-1 ring-red-600/20"
                            : c.paymentStatus === "partial"
                              ? "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20"
                              : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                        }`}
                      >
                        {c.paymentStatus || "cleared"}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-5 py-3.5 text-center text-[12px] text-gray-500">
                      {c.lastPaymentDate ? formatDate(c.lastPaymentDate) : "—"}
                    </td>
                    <td className="px-3 md:px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1 md:opacity-0 transition-opacity group-hover:opacity-100">
                        {/* Mobile: Use more compact icons/buttons */}
                        <button
                          onClick={() => openHistory(c)}
                          className="rounded-lg p-1.5 md:px-2 md:py-1.5 text-[11px] font-semibold text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                          title="View payment history"
                        >
                          <TrendingUp className="h-3.5 w-3.5 md:hidden" />
                          <span className="hidden md:inline">History</span>
                        </button>
                        <button
                          onClick={() => openPayment(c)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                          title="Add Payment"
                        >
                          <Wallet className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(c)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-violet-50 hover:text-violet-600"
                        >
                          <Edit className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-0 md:p-6"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full h-full md:h-auto md:max-w-md md:rounded-2xl bg-white shadow-2xl flex flex-col md:max-h-[95vh]"
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
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto p-0 md:p-8 no-scrollbar"
          onClick={() => setShowPaymentModal(false)}
        >
          <div
            className="w-full h-full md:h-auto md:max-w-4xl md:rounded-2xl bg-white shadow-2xl flex flex-col md:max-h-[95vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-md shadow-emerald-500/20">
                  <Wallet className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">
                    Receive Customer Payment
                  </h2>
                  <p className="text-[12px] text-gray-500">
                    Process payment from a customer for outstanding credit sales
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
              {/* Left: Form */}
              <div className="lg:col-span-2 px-6 py-5 space-y-5 border-r border-gray-100">
                {/* Customer */}
                <div>
                  <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 mb-1.5">
                    <Users className="h-4 w-4 text-gray-400" />
                    Customer *
                  </label>
                  {paymentCustomer ? (
                    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-purple-200 text-xs font-bold text-violet-700">
                          {paymentCustomer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {paymentCustomer.name}
                          </p>
                          {paymentCustomer.phone && (
                            <p className="text-[11px] text-gray-400">
                              {paymentCustomer.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setPaymentCustomer(null)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="Type or select a customer"
                      className={inputClass}
                      onFocus={(e) => {
                        const target = e.target;
                        const select =
                          target.nextElementSibling as HTMLSelectElement;
                        if (select) select.style.display = "block";
                      }}
                    />
                  )}
                  {!paymentCustomer && (
                    <select
                      value=""
                      onChange={(e) => {
                        const c = customers.find(
                          (c) => c._id === e.target.value,
                        );
                        if (c) setPaymentCustomer(c);
                      }}
                      className={inputClass + " mt-1"}
                    >
                      <option value="">Select customer…</option>
                      {customers.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                          {(c.outstandingBalance ?? 0) > 0
                            ? ` (Balance: ${formatCurrency(c.outstandingBalance ?? 0, currency)})`
                            : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 mb-1.5">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    Payment Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">
                      {currency}
                    </span>
                    <input
                      type="number"
                      value={paymentForm.amount}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          amount: e.target.value,
                        })
                      }
                      placeholder="0.00"
                      className={inputClass + " pl-14"}
                    />
                  </div>
                </div>

                {/* Payment Method Cards */}
                <div>
                  <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 mb-2">
                    <Wallet className="h-4 w-4 text-gray-400" />
                    Payment Method *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: "cash", label: "Cash", icon: Banknote },
                      { key: "card", label: "Card", icon: CreditCard },
                      {
                        key: "bank_transfer",
                        label: "Bank Transfer",
                        icon: DollarSign,
                      },
                      {
                        key: "mobile_money",
                        label: "Mobile Money",
                        icon: Smartphone,
                      },
                    ].map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() =>
                          setPaymentForm({ ...paymentForm, method: m.key })
                        }
                        className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-all ${
                          paymentForm.method === m.key
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <m.icon className="h-4 w-4" />
                        {m.label}
                        {paymentForm.method === m.key && (
                          <CheckCircle2 className="h-4 w-4 ml-auto text-emerald-500" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reference */}
                <div>
                  <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 mb-1.5">
                    # Reference Number (Optional)
                  </label>
                  <input
                    value={paymentForm.reference}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        reference: e.target.value,
                      })
                    }
                    placeholder="Transaction reference"
                    className={inputClass}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[13px] font-semibold text-gray-700">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, notes: e.target.value })
                    }
                    rows={2}
                    placeholder="Payment notes"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Right: Summary & Allocation Logic */}
              <div className="px-5 py-5 space-y-5">
                {/* Customer Balance Summary */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="h-5 w-5 text-emerald-500" />
                    <h3 className="text-sm font-bold text-gray-800">
                      Customer Balance Summary
                    </h3>
                  </div>
                  {paymentCustomer ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Outstanding</span>
                        <span className="font-semibold text-red-600">
                          {formatCurrency(
                            paymentCustomer.outstandingBalance ?? 0,
                            currency,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Spent</span>
                        <span className="font-semibold text-gray-700">
                          {formatCurrency(paymentCustomer.totalSpent, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Credit Limit</span>
                        <span className="font-semibold text-gray-700">
                          {paymentCustomer.creditLimit
                            ? formatCurrency(
                                paymentCustomer.creditLimit,
                                currency,
                              )
                            : "—"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-2">
                      Select a customer
                    </p>
                  )}
                </div>

                {/* Payment Allocation Logic */}
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">
                    Payment Allocation Logic
                  </h3>
                  <div className="space-y-3">
                    {[
                      {
                        num: 1,
                        title: "Oldest First",
                        desc: "Payments are applied to the oldest unpaid sale first",
                      },
                      {
                        num: 2,
                        title: "Full Allocation",
                        desc: "Each sale is fully paid before moving to the next",
                      },
                      {
                        num: 3,
                        title: "Credit Balance",
                        desc: "Any remaining amount becomes customer credit",
                      },
                    ].map((step) => (
                      <div key={step.num} className="flex gap-3">
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                          {step.num}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-700">
                            {step.title}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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

      {showHistoryPanel && historyCustomer && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm"
          onClick={() => setShowHistoryPanel(false)}
        >
          <div
            className="flex h-full w-full max-w-5xl flex-col bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Payment History
                </h2>
                <p className="text-sm text-gray-500">
                  {historyCustomer.name} • Outstanding{" "}
                  {formatCurrency(
                    historyCustomer.outstandingBalance ?? 0,
                    currency,
                  )}
                </p>
              </div>
              <button
                onClick={() => setShowHistoryPanel(false)}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {reminderStatus && (
              <div
                className={`mx-6 mt-4 rounded-xl border px-4 py-3 text-sm ${reminderStatus.startsWith("Reminder sent") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}
              >
                {reminderStatus}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 border-b border-gray-100 bg-gray-50/60 px-6 py-4 md:grid-cols-4">
              <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Outstanding Balance
                </p>
                <p className="mt-1 text-lg font-bold text-red-600">
                  {formatCurrency(
                    historyCustomer.outstandingBalance ?? 0,
                    currency,
                  )}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Total Purchases
                </p>
                <p className="mt-1 text-lg font-bold text-gray-900">
                  {historyCustomer.totalPurchases}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Last Payment Date
                </p>
                <p className="mt-1 text-lg font-bold text-gray-900">
                  {historyCustomer.lastPaymentDate
                    ? formatDate(historyCustomer.lastPaymentDate)
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Payment Status
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    historyCustomer.paymentStatus === "overdue"
                      ? "bg-red-50 text-red-700"
                      : historyCustomer.paymentStatus === "partial"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {historyCustomer.paymentStatus || "cleared"}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-auto px-6 py-5">
              <div className="mb-4 flex items-center justify-end">
                <button
                  onClick={() => sendBalanceReminder(historyCustomer)}
                  disabled={
                    !historyCustomer.email ||
                    (historyCustomer.outstandingBalance ?? 0) <= 0 ||
                    sendingReminderCustomerId === historyCustomer._id
                  }
                  className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50"
                >
                  {sendingReminderCustomerId === historyCustomer._id
                    ? "Sending reminder..."
                    : "Send Balance Reminder"}
                </button>
              </div>
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-240 text-sm">
                    <thead>
                      <tr className="border-b border-orange-100 bg-orange-50/70">
                        <th className="px-4 py-3 text-left text-[13px] font-semibold text-gray-600">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-[13px] font-semibold text-gray-600">
                          Reference
                        </th>
                        <th className="px-4 py-3 text-right text-[13px] font-semibold text-gray-600">
                          Sale Amount
                        </th>
                        <th className="px-4 py-3 text-right text-[13px] font-semibold text-gray-600">
                          Amount Paid
                        </th>
                        <th className="px-4 py-3 text-right text-[13px] font-semibold text-gray-600">
                          Balance Before
                        </th>
                        <th className="px-4 py-3 text-right text-[13px] font-semibold text-gray-600">
                          Balance After
                        </th>
                        <th className="px-4 py-3 text-left text-[13px] font-semibold text-gray-600">
                          Method
                        </th>
                        <th className="px-4 py-3 text-left text-[13px] font-semibold text-gray-600">
                          Recorded By
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {historyLoading ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-4 py-16 text-center text-gray-400"
                          >
                            Loading payment history...
                          </td>
                        </tr>
                      ) : historyItems.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-4 py-16 text-center text-gray-400"
                          >
                            No payment history found for this customer.
                          </td>
                        </tr>
                      ) : (
                        historyItems.map((payment) => (
                          <tr key={payment._id} className="hover:bg-gray-50/70">
                            <td className="px-4 py-3 text-gray-700">
                              {formatDate(payment.createdAt)}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {payment.reference ||
                                payment.saleId?.orderNumber ||
                                "—"}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-gray-700">
                              {payment.saleId?.total
                                ? formatCurrency(payment.saleId.total, currency)
                                : "—"}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">
                              {formatCurrency(payment.amount, currency)}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">
                              {formatCurrency(payment.balanceBefore, currency)}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-gray-800">
                              {formatCurrency(payment.balanceAfter, currency)}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {formatPaymentMethodLabel(payment.method)}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {payment.recordedByName || "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
              <p className="text-sm text-gray-500">
                Page {historyPage} of {historyTotalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    historyCustomer &&
                    fetchPaymentHistory(
                      historyCustomer._id,
                      Math.max(1, historyPage - 1),
                    )
                  }
                  disabled={historyPage <= 1 || historyLoading}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    historyCustomer &&
                    fetchPaymentHistory(
                      historyCustomer._id,
                      Math.min(historyTotalPages, historyPage + 1),
                    )
                  }
                  disabled={historyPage >= historyTotalPages || historyLoading}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
