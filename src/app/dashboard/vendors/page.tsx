"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Truck,
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Phone,
  Mail,
  MapPin,
  User,
  ShoppingBag,
  DollarSign,
  Wallet,
  CreditCard,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Building2,
  FileText,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSession } from "../layout";
import { useSearchParams } from "next/navigation";

type VendorTab = "suppliers" | "pay" | "history" | "balances";

interface Vendor {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  contactPerson: string;
  totalOrders: number;
  totalPaid: number;
  balance?: number;
  isActive: boolean;
  createdAt: string;
}

interface PurchasePayment {
  _id: string;
  orderNumber: string;
  vendorId: { _id: string; name: string } | string;
  total: number;
  amountPaid: number;
  paymentStatus: string;
  status: string;
  createdAt: string;
  notes: string;
}

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
  contactPerson: "",
};

const inputClass =
  "mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20";

export default function VendorsPage() {
  const { tenant } = useSession();
  const currency = tenant?.settings?.currency || "UGX";
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as VendorTab) || "suppliers";
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchases, setPurchases] = useState<PurchasePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payVendor, setPayVendor] = useState<Vendor | null>(null);
  const [activeTab, setActiveTab] = useState<VendorTab>(initialTab);

  // Sync tab when URL search params change (e.g. sidebar sub-link clicks)
  useEffect(() => {
    const tab = searchParams.get("tab") as VendorTab;
    if (tab && ["suppliers", "pay", "history", "balances"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const [editing, setEditing] = useState<Vendor | null>(null);
  const [search, setSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historySubTab, setHistorySubTab] = useState<
    "history" | "balances" | "outstanding"
  >("history");
  const [form, setForm] = useState(emptyForm);
  const [payForm, setPayForm] = useState({
    amount: "",
    method: "bank",
    reference: "",
    notes: "",
  });

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const [vendorRes, purchaseRes] = await Promise.all([
        fetch("/api/vendors"),
        fetch("/api/purchases?limit=500"),
      ]);
      if (vendorRes.ok) setVendors(await vendorRes.json());
      if (purchaseRes.ok) {
        const pData = await purchaseRes.json();
        setPurchases(pData.orders || []);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (v: Vendor) => {
    setEditing(v);
    setForm({
      name: v.name,
      email: v.email || "",
      phone: v.phone || "",
      address: v.address || "",
      contactPerson: v.contactPerson || "",
    });
    setShowModal(true);
  };

  const saveVendor = async () => {
    const method = editing ? "PUT" : "POST";
    const body = editing ? { _id: editing._id, ...form } : form;
    const res = await fetch("/api/vendors", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setShowModal(false);
      setEditing(null);
      setForm(emptyForm);
      fetchVendors();
    }
  };

  const deleteVendor = async (id: string) => {
    if (!confirm("Delete this supplier?")) return;
    const res = await fetch(`/api/vendors?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchVendors();
  };

  const filtered = useMemo(
    () =>
      vendors.filter(
        (v) =>
          v.name.toLowerCase().includes(search.toLowerCase()) ||
          v.contactPerson?.toLowerCase().includes(search.toLowerCase()) ||
          v.email?.toLowerCase().includes(search.toLowerCase()),
      ),
    [vendors, search],
  );

  const totalOrders = useMemo(
    () => vendors.reduce((s, v) => s + (v.totalOrders || 0), 0),
    [vendors],
  );
  const totalPaid = useMemo(
    () => vendors.reduce((s, v) => s + (v.totalPaid || 0), 0),
    [vendors],
  );

  const totalOutstanding = useMemo(
    () =>
      purchases
        .filter((p) => p.paymentStatus !== "paid" && p.status !== "cancelled")
        .reduce((s, p) => s + (p.total - p.amountPaid), 0),
    [purchases],
  );

  const vendorsWithBalance = useMemo(() => {
    const balanceMap = new Map<string, number>();
    purchases
      .filter((p) => p.paymentStatus !== "paid" && p.status !== "cancelled")
      .forEach((p) => {
        const vid =
          typeof p.vendorId === "object" ? p.vendorId._id : p.vendorId;
        balanceMap.set(
          vid,
          (balanceMap.get(vid) || 0) + (p.total - p.amountPaid),
        );
      });
    return balanceMap;
  }, [purchases]);

  const recentPayments = useMemo(
    () => purchases.filter((p) => p.amountPaid > 0).length,
    [purchases],
  );

  const paymentHistory = useMemo(() => {
    const paid = purchases.filter((p) => p.amountPaid > 0);
    let filtered = paid;
    if (historySearch) {
      const q = historySearch.toLowerCase();
      filtered = paid.filter((p) => {
        const vendorName =
          typeof p.vendorId === "object" ? p.vendorId.name : "";
        return (
          p.orderNumber.toLowerCase().includes(q) ||
          vendorName.toLowerCase().includes(q)
        );
      });
    }
    return filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [purchases, historySearch]);

  const historyRowsPerPage = 50;
  const historyTotalPages = Math.ceil(
    paymentHistory.length / historyRowsPerPage,
  );
  const paginatedHistory = paymentHistory.slice(
    (historyPage - 1) * historyRowsPerPage,
    historyPage * historyRowsPerPage,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/20">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              {activeTab === "suppliers"
                ? "Suppliers"
                : activeTab === "pay"
                  ? "Supplier Payments"
                  : "Supplier Payments"}
            </h1>
            <p className="text-[13px] text-gray-400">
              {activeTab === "suppliers"
                ? "Manage your suppliers"
                : "Manage supplier payments and balances"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {activeTab === "suppliers" && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg hover:shadow-orange-500/30"
            >
              <Plus className="h-4 w-4" /> Add Supplier
            </button>
          )}
          {(activeTab === "history" || activeTab === "balances") && (
            <button
              onClick={fetchVendors}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm transition-all hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {(
          [
            { key: "suppliers", label: "Suppliers" },
            { key: "pay", label: "Pay Suppliers" },
            { key: "history", label: "Payment History" },
            { key: "balances", label: "Balances" },
          ] as { key: VendorTab; label: string }[]
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

      {/* Summary Cards */}
      {activeTab === "suppliers" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-lg hover:shadow-gray-200/50">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/20">
                <Truck className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[13px] text-gray-400">Total Suppliers</p>
                <p className="text-xl font-bold text-gray-800">
                  {vendors.length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-lg hover:shadow-gray-200/50">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
                <ShoppingBag className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[13px] text-gray-400">Total Orders</p>
                <p className="text-xl font-bold text-gray-800">{totalOrders}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-lg hover:shadow-gray-200/50">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[13px] text-gray-400">Total Paid</p>
                <p className="text-xl font-bold text-gray-800">
                  {formatCurrency(totalPaid, currency)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <div>
                <p className="text-[13px] text-gray-400">Total Outstanding</p>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(totalOutstanding, currency)}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <DollarSign className="h-6 w-6 text-emerald-500" />
              <div>
                <p className="text-[13px] text-gray-400">Total Payments</p>
                <p className="text-xl font-bold text-emerald-600">
                  {formatCurrency(totalPaid, currency)}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-blue-500" />
              <div>
                <p className="text-[13px] text-gray-400">
                  Suppliers w/ Balance
                </p>
                <p className="text-xl font-bold text-blue-600">
                  {vendorsWithBalance.size}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-violet-500" />
              <div>
                <p className="text-[13px] text-gray-400">Recent Payments</p>
                <p className="text-xl font-bold text-violet-600">
                  {recentPayments}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment History Sub-tabs */}
      {(activeTab === "history" || activeTab === "balances") && (
        <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit">
          {(
            [
              { key: "history", label: "Payment History" },
              { key: "balances", label: "Supplier Balances" },
              { key: "outstanding", label: "Outstanding Balances" },
            ] as { key: typeof historySubTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setHistorySubTab(tab.key)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                historySubTab === tab.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* TAB: Suppliers */}
      {activeTab === "suppliers" && (
        <>
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search suppliers…"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-9 text-sm transition-colors focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Vendor Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <div className="col-span-full flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-orange-500" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-16">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
                  <Truck className="h-6 w-6 text-gray-300" />
                </div>
                <p className="font-medium text-gray-500">
                  {search
                    ? "No suppliers match your search"
                    : "No suppliers yet"}
                </p>
                <p className="text-[13px] text-gray-400">
                  {search
                    ? "Try a different search term"
                    : "Add your first supplier to get started"}
                </p>
              </div>
            ) : (
              filtered.map((v) => (
                <div
                  key={v._id}
                  className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-lg hover:shadow-gray-200/50"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-100 to-amber-100">
                        <span className="text-sm font-bold text-orange-600">
                          {v.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {v.name}
                        </h3>
                        {v.contactPerson && (
                          <p className="flex items-center gap-1 text-[12px] text-gray-400">
                            <User className="h-3 w-3" />
                            {v.contactPerson}
                          </p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${
                        v.isActive !== false
                          ? "bg-emerald-50 text-amber-600 ring-amber-600/20"
                          : "bg-red-50 text-red-600 ring-red-600/20"
                      }`}
                    >
                      {v.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[13px] text-gray-500">
                    {v.phone && (
                      <p className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        {v.phone}
                      </p>
                    )}
                    {v.email && (
                      <p className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-gray-400" />
                        {v.email}
                      </p>
                    )}
                    {v.address && (
                      <p className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                        <span className="truncate">{v.address}</span>
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-3">
                    <div className="flex gap-4 text-[13px]">
                      <span className="text-gray-400">
                        Orders:{" "}
                        <span className="font-semibold text-gray-700">
                          {v.totalOrders || 0}
                        </span>
                      </span>
                      {(v.totalPaid || 0) > 0 && (
                        <span className="text-gray-400">
                          Paid:{" "}
                          <span className="font-semibold text-gray-700">
                            {formatCurrency(v.totalPaid, currency)}
                          </span>
                        </span>
                      )}
                      <span className="text-gray-400">
                        Balance:{" "}
                        <span
                          className={`font-semibold ${(vendorsWithBalance.get(v._id) || 0) > 0 ? "text-red-600" : "text-gray-700"}`}
                        >
                          {(vendorsWithBalance.get(v._id) || 0) > 0
                            ? formatCurrency(
                                vendorsWithBalance.get(v._id) || 0,
                                currency,
                              )
                            : "—"}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 transition-all group-hover:opacity-100">
                      <button
                        onClick={() => {
                          setPayVendor(v);
                          setPayForm({
                            amount: "",
                            method: "bank",
                            reference: "",
                            notes: "",
                          });
                          setShowPayModal(true);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                        title="Pay Supplier"
                      >
                        <Wallet className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => openEdit(v)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-orange-50 hover:text-orange-600"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteVendor(v._id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* TAB: Pay Suppliers */}
      {activeTab === "pay" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Payment Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
               <div className="flex items-center gap-2 mb-6 border-b border-gray-50 pb-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-800">Payment Information</h3>
               </div>

               {/* Recipient Card */}
               {payVendor && (
                  <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center">
                       <User className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Recipient</p>
                       <h4 className="font-bold text-slate-700">{payVendor.name} • ID: {payVendor._id.slice(-5).toUpperCase()}</h4>
                       <p className="text-xs text-slate-500">Contact: {payVendor.contactPerson || "N/A"}</p>
                    </div>
                  </div>
               )}

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                      <User className="w-3 h-3" /> Select Supplier
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input 
                        className={`${inputClass} pl-10`}
                        placeholder="Search supplier..."
                        value={payVendor?.name || ""}
                        readOnly={!!payVendor}
                      />
                      {payVendor && (
                         <button 
                          onClick={() => setPayVendor(null)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          <X className="w-4 h-4" />
                         </button>
                      )}
                    </div>
                    {!payVendor && (
                      <div className="mt-2 max-h-40 overflow-y-auto border border-gray-100 rounded-xl bg-white shadow-lg">
                        {vendors.slice(0, 5).map(v => (
                          <button 
                            key={v._id} 
                            onClick={() => setPayVendor(v)}
                            className="w-full text-left px-4 py-2 hover:bg-orange-50 text-sm border-b border-gray-50 last:border-0"
                          >
                            {v.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                      <DollarSign className="w-3 h-3" /> Amount ({currency})
                    </label>
                    <input 
                      type="number"
                      className={inputClass}
                      placeholder="0.00"
                      value={payForm.amount}
                      onChange={(e) => setPayForm({...payForm, amount: e.target.value})}
                    />
                    {payForm.amount && (
                       <div className="mt-2 p-2 rounded-lg bg-emerald-50 text-emerald-700 font-black text-xs">
                          {formatCurrency(Number(payForm.amount), currency)}
                       </div>
                    )}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                      <Wallet className="w-3 h-3" /> Payment Method
                    </label>
                    <select 
                      className={inputClass}
                      value={payForm.method}
                      onChange={(e) => setPayForm({...payForm, method: e.target.value})}
                    >
                      <option value="cash">💵 Cash Payment</option>
                      <option value="bank">🏦 Bank Transfer</option>
                      <option value="mobile_money">📱 Mobile Money</option>
                      <option value="check">✍️ Check / Draft</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      # Reference (Optional)
                    </label>
                    <input 
                      className={inputClass}
                      placeholder="Transaction reference"
                      value={payForm.reference}
                      onChange={(e) => setPayForm({...payForm, reference: e.target.value})}
                    />
                  </div>
               </div>

               <div className="mt-6">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <FileText className="w-3 h-3" /> Payment Notes (Optional)
                  </label>
                  <textarea 
                    className={`${inputClass} h-24 resize-none`}
                    placeholder="Add any additional notes about this payment..."
                    value={payForm.notes}
                    onChange={(e) => setPayForm({...payForm, notes: e.target.value})}
                  />
               </div>

               <div className="mt-8 border-t border-gray-100 pt-6">
                  <button 
                    onClick={async () => {
                      if (!payVendor || !payForm.amount) return;
                      setLoading(true);
                      try {
                        const res = await fetch("/api/vendors/pay", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            vendorId: payVendor._id,
                            ...payForm,
                            amount: Number(payForm.amount)
                          })
                        });
                        if (res.ok) {
                          alert("Payment processed successfully!");
                          setPayForm({ amount: "", method: "bank", reference: "", notes: "" });
                          fetchVendors();
                        }
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={!payVendor || !payForm.amount || loading}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-white font-black uppercase tracking-widest text-sm hover:bg-slate-800 transition-all disabled:opacity-50 shadow-xl shadow-slate-900/10"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4 text-emerald-400" />}
                    Process Payment
                  </button>
               </div>
            </div>
          </div>

          {/* Sidebars */}
          <div className="space-y-6">
             {/* Payment Summary */}
             <div className="rounded-2xl bg-emerald-700 p-6 text-white shadow-lg shadow-emerald-500/20">
                <div className="flex items-center gap-2 mb-6">
                  <DollarSign className="w-5 h-5 text-emerald-200" />
                  <h3 className="font-bold">Payment Summary</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-emerald-100 text-sm">Amount</span>
                    <span className="text-xl font-black">{formatCurrency(Number(payForm.amount) || 0, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-100 text-sm">Method</span>
                    <span className="font-bold capitalize">{payForm.method.replace("_", " ")}</span>
                  </div>
                </div>
             </div>

             {/* Balance Summary */}
             <div className="rounded-2xl bg-blue-600 p-6 text-white shadow-lg shadow-blue-500/20">
                <div className="flex items-center gap-2 mb-6">
                  <DollarSign className="w-5 h-5 text-blue-200" />
                  <h3 className="font-bold">Supplier Balance Summary</h3>
                </div>
                <div className="space-y-3">
                  <div className="bg-white/10 rounded-2xl p-4 border border-white/10 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-black">1</div>
                    <div>
                      <p className="text-[10px] text-blue-100 font-bold uppercase tracking-wider">Outstanding Balance</p>
                      <p className="text-lg font-black">{formatCurrency(vendorsWithBalance.get(payVendor?._id || "") || 0, currency)}</p>
                    </div>
                  </div>

                  <div className="bg-orange-500/30 rounded-2xl p-4 border border-orange-500/20 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-black italic">$</div>
                    <div>
                      <p className="text-[10px] text-orange-500 font-bold uppercase tracking-wider">Payment Amount</p>
                      <p className="text-lg font-black italic">-{formatCurrency(Number(payForm.amount) || 0, currency)}</p>
                    </div>
                  </div>

                  <div className="bg-emerald-500/30 rounded-2xl p-4 border border-emerald-500/20 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-black italic">3</div>
                    <div>
                      <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider">Remaining Balance</p>
                      <p className="text-lg font-black">{formatCurrency(Math.max(0, (vendorsWithBalance.get(payVendor?._id || "") || 0) - (Number(payForm.amount) || 0)), currency)}</p>
                    </div>
                  </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* TAB: Payment History */}
      {(activeTab === "history" || activeTab === "balances") &&
        historySubTab === "history" && (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setHistoryPage(1);
                  }}
                  placeholder="Search payments…"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50/50 py-2 pl-9 pr-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
              <p className="text-[13px] text-gray-400">
                {paymentHistory.length} payment(s)
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-left">
                    <th className="px-5 py-3 font-semibold text-gray-500 text-[12px] uppercase tracking-wider">
                      Payment No
                    </th>
                    <th className="px-5 py-3 font-semibold text-gray-500 text-[12px] uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-5 py-3 font-semibold text-gray-500 text-[12px] uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-5 py-3 font-semibold text-gray-500 text-[12px] uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-5 py-3 font-semibold text-gray-500 text-[12px] uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-5 py-3 font-semibold text-gray-500 text-[12px] uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-5 py-3 font-semibold text-gray-500 text-[12px] uppercase tracking-wider">
                      Note
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedHistory.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-10 text-center text-gray-400"
                      >
                        No payments found
                      </td>
                    </tr>
                  ) : (
                    paginatedHistory.map((p) => (
                      <tr key={p._id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 font-medium text-gray-800">
                          {p.orderNumber}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {typeof p.vendorId === "object"
                            ? p.vendorId.name
                            : "—"}
                        </td>
                        <td className="px-5 py-3 font-semibold text-emerald-600">
                          {formatCurrency(p.amountPaid, currency)}
                        </td>
                        <td className="px-5 py-3">
                          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600 capitalize">
                            {p.paymentStatus}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-500">
                          {p.orderNumber}
                        </td>
                        <td className="px-5 py-3 text-gray-500">
                          {formatDate(p.createdAt)}
                        </td>
                        <td className="px-5 py-3 text-gray-400 max-w-[200px] truncate">
                          {p.notes || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {historyTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
                <p className="text-[13px] text-gray-400">
                  Page {historyPage} of {historyTotalPages}
                </p>
                <div className="flex gap-1">
                  <button
                    disabled={historyPage <= 1}
                    onClick={() => setHistoryPage(historyPage - 1)}
                    className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:bg-gray-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={historyPage >= historyTotalPages}
                    onClick={() => setHistoryPage(historyPage + 1)}
                    className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:bg-gray-50 disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      {/* TAB: Supplier Balances */}
      {(activeTab === "history" || activeTab === "balances") &&
        historySubTab === "balances" && (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-left">
                    <th className="px-5 py-3 font-semibold text-gray-500 text-[12px] uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-5 py-3 font-semibold text-gray-500 text-[12px] uppercase tracking-wider">
                      Total Orders
                    </th>
                    <th className="px-5 py-3 font-semibold text-gray-500 text-[12px] uppercase tracking-wider">
                      Total Paid
                    </th>
                    <th className="px-5 py-3 font-semibold text-gray-500 text-[12px] uppercase tracking-wider">
                      Outstanding
                    </th>
                    <th className="px-5 py-3 font-semibold text-gray-500 text-[12px] uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {vendors.map((v) => {
                    const outstanding = vendorsWithBalance.get(v._id) || 0;
                    return (
                      <tr key={v._id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50">
                              <span className="text-xs font-bold text-orange-600">
                                {v.name.charAt(0)}
                              </span>
                            </div>
                            <span className="font-medium text-gray-800">
                              {v.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {v.totalOrders || 0}
                        </td>
                        <td className="px-5 py-3 font-medium text-gray-700">
                          {formatCurrency(v.totalPaid || 0, currency)}
                        </td>
                        <td className="px-5 py-3 font-semibold text-red-600">
                          {outstanding > 0
                            ? formatCurrency(outstanding, currency)
                            : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${outstanding > 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}
                          >
                            {outstanding > 0 ? "Has Balance" : "Settled"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* TAB: Outstanding Balances */}
      {(activeTab === "history" || activeTab === "balances") &&
        historySubTab === "outstanding" && (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-left">
                    <th className="px-5 py-3 font-semibold text-gray-500 text-[12px] uppercase tracking-wider">
                      Order #
                    </th>
                    <th className="px-5 py-3 font-semibold text-gray-500 text-[12px] uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-5 py-3 font-semibold text-gray-500 text-[12px] uppercase tracking-wider">
                      Order Total
                    </th>
                    <th className="px-5 py-3 font-semibold text-gray-500 text-[12px] uppercase tracking-wider">
                      Paid
                    </th>
                    <th className="px-5 py-3 font-semibold text-gray-500 text-[12px] uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-5 py-3 font-semibold text-gray-500 text-[12px] uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-5 py-3 font-semibold text-gray-500 text-[12px] uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {purchases
                    .filter(
                      (p) =>
                        p.paymentStatus !== "paid" &&
                        p.status !== "cancelled" &&
                        p.total - p.amountPaid > 0,
                    )
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime(),
                    )
                    .map((p) => (
                      <tr key={p._id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 font-medium text-gray-800">
                          {p.orderNumber}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {typeof p.vendorId === "object"
                            ? p.vendorId.name
                            : "—"}
                        </td>
                        <td className="px-5 py-3 text-gray-700">
                          {formatCurrency(p.total, currency)}
                        </td>
                        <td className="px-5 py-3 text-emerald-600">
                          {formatCurrency(p.amountPaid, currency)}
                        </td>
                        <td className="px-5 py-3 font-semibold text-red-600">
                          {formatCurrency(p.total - p.amountPaid, currency)}
                        </td>
                        <td className="px-5 py-3 text-gray-500">
                          {formatDate(p.createdAt)}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${p.paymentStatus === "partial" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}
                          >
                            {p.paymentStatus === "partial"
                              ? "Partial"
                              : "Unpaid"}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/20">
                  <Truck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-800">
                    {editing ? "Edit Supplier" : "Add Supplier"}
                  </h3>
                  <p className="text-[12px] text-gray-400">
                    {editing ? "Update supplier details" : "Add a new supplier"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditing(null);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Name *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                  placeholder="Supplier name"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Contact Person
                </label>
                <input
                  value={form.contactPerson}
                  onChange={(e) =>
                    setForm({ ...form, contactPerson: e.target.value })
                  }
                  className={inputClass}
                  placeholder="Contact person name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Phone
                  </label>
                  <input
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    className={inputClass}
                    placeholder="+256 700 000 000"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className={inputClass}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Address
                </label>
                <textarea
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  rows={2}
                  className={inputClass}
                  placeholder="Full address"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditing(null);
                }}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveVendor}
                disabled={!form.name}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg disabled:opacity-50"
              >
                {editing ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Supplier Modal */}
      {showPayModal && payVendor && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8"
          onClick={() => setShowPayModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Supplier Payment
                </h3>
                <p className="text-[12px] text-gray-400">
                  Process payment to supplier efficiently
                </p>
              </div>
              <button
                onClick={() => setShowPayModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
              {/* Left: Payment Info Form */}
              <div className="lg:col-span-3 px-6 py-5 space-y-5">
                <div className="rounded-xl bg-gradient-to-br from-[hsl(222,47%,11%)] to-[hsl(224,50%,18%)] p-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-white" />
                    <h4 className="text-sm font-bold text-white">
                      Payment Information
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 mb-1.5">
                      <User className="h-3.5 w-3.5 text-gray-400" />
                      Select Supplier
                    </label>
                    <div className="rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-700 font-medium">
                      {payVendor.name}
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 mb-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                      Amount ({currency})
                    </label>
                    <input
                      type="number"
                      value={payForm.amount}
                      onChange={(e) =>
                        setPayForm({ ...payForm, amount: e.target.value })
                      }
                      placeholder="0.00"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 mb-1.5">
                      <Wallet className="h-3.5 w-3.5 text-gray-400" />
                      Payment Method
                    </label>
                    <select
                      value={payForm.method}
                      onChange={(e) =>
                        setPayForm({ ...payForm, method: e.target.value })
                      }
                      className={inputClass}
                    >
                      <option value="">Select method</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 mb-1.5">
                      # Reference (Optional)
                    </label>
                    <input
                      value={payForm.reference}
                      onChange={(e) =>
                        setPayForm({ ...payForm, reference: e.target.value })
                      }
                      placeholder="Transaction reference"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 mb-1.5">
                    Payment Notes (Optional)
                  </label>
                  <textarea
                    value={payForm.notes}
                    onChange={(e) =>
                      setPayForm({ ...payForm, notes: e.target.value })
                    }
                    rows={2}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Right: Payment Record Info */}
              <div className="lg:col-span-2 border-l border-gray-100 px-5 py-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm font-semibold text-emerald-600">
                    Secure Payment
                  </span>
                </div>

                <div className="rounded-xl border border-pink-100 bg-pink-50/50 p-4">
                  <h4 className="text-sm font-bold text-gray-800 mb-2">
                    Payment Record
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    This payment will be automatically allocated to outstanding
                    purchases and recorded in your financial records.
                  </p>
                </div>

                {(payVendor.balance ?? 0) > 0 && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm">
                    <span className="text-amber-600 font-medium">
                      Outstanding:{" "}
                    </span>
                    <span className="text-amber-700 font-bold">
                      {formatCurrency(payVendor.balance ?? 0, currency)}
                    </span>
                  </div>
                )}

                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Supplier</span>
                    <span className="font-medium text-gray-700">
                      {payVendor.name}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Orders</span>
                    <span className="font-medium text-gray-700">
                      {payVendor.totalOrders || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Paid</span>
                    <span className="font-medium text-gray-700">
                      {formatCurrency(payVendor.totalPaid || 0, currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setShowPayModal(false)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={!payForm.amount}
                onClick={async () => {
                  const res = await fetch("/api/vendors", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      _id: payVendor._id,
                      name: payVendor.name,
                      payment: {
                        amount: parseFloat(payForm.amount),
                        method: payForm.method,
                        reference: payForm.reference,
                        notes: payForm.notes,
                      },
                    }),
                  });
                  if (res.ok) {
                    setShowPayModal(false);
                    fetchVendors();
                  }
                }}
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-500/25 hover:shadow-lg disabled:opacity-50"
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
