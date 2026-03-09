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
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useSession } from "../layout";

interface Vendor {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  contactPerson: string;
  totalOrders: number;
  totalPaid: number;
  isActive: boolean;
  createdAt: string;
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
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vendors");
      if (res.ok) setVendors(await res.json());
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
    if (!confirm("Delete this vendor?")) return;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/20">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Vendors</h1>
            <p className="text-[13px] text-gray-400">
              Manage your suppliers and vendors
            </p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg hover:shadow-orange-500/30"
        >
          <Plus className="h-4 w-4" /> Add Vendor
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-lg hover:shadow-gray-200/50">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/20">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[13px] text-gray-400">Total Vendors</p>
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
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vendors…"
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
              {search ? "No vendors match your search" : "No vendors yet"}
            </p>
            <p className="text-[13px] text-gray-400">
              {search
                ? "Try a different search term"
                : "Add your first vendor to get started"}
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
                    <h3 className="font-semibold text-gray-800">{v.name}</h3>
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
                      ? "bg-emerald-50 text-emerald-600 ring-emerald-600/20"
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
                </div>
                <div className="flex items-center gap-1 opacity-0 transition-all group-hover:opacity-100">
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
                    {editing ? "Edit Vendor" : "Add Vendor"}
                  </h3>
                  <p className="text-[12px] text-gray-400">
                    {editing ? "Update vendor details" : "Add a new supplier"}
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
                  placeholder="Vendor name"
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
    </div>
  );
}
