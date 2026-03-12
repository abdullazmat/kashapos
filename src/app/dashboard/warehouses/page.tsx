"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Warehouse,
  Plus,
  MapPin,
  Phone,
  Mail,
  Package,
  Users,
  Edit2,
  Trash2,
  Search,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface Branch {
  _id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  isMain: boolean;
  isActive: boolean;
  createdAt: string;
}

interface StockSummary {
  branchId: string;
  totalItems: number;
  totalValue: number;
}

export default function WarehousesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stockSummaries, setStockSummaries] = useState<StockSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    code: "",
    address: "",
    phone: "",
    email: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [branchRes, stockRes] = await Promise.all([
        fetch("/api/branches"),
        fetch("/api/stock"),
      ]);
      if (branchRes.ok) {
        const d = await branchRes.json();
        setBranches(Array.isArray(d) ? d : d.data || d.branches || []);
      }
      if (stockRes.ok) {
        const stockData = await stockRes.json();
        const items = Array.isArray(stockData)
          ? stockData
          : stockData.data || [];
        // Aggregate by branch
        const map = new Map<string, StockSummary>();
        for (const s of items) {
          const bid = s.branchId?._id || s.branchId;
          if (!bid) continue;
          const existing = map.get(bid) || {
            branchId: bid,
            totalItems: 0,
            totalValue: 0,
          };
          existing.totalItems += s.quantity || 0;
          existing.totalValue += (s.quantity || 0) * (s.productId?.price || 0);
          map.set(bid, existing);
        }
        setStockSummaries(Array.from(map.values()));
      }
    } catch (err) {
      console.error("Warehouses fetch error:", err);
      setError("Failed to load warehouses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setEditingBranch(null);
    setError("");
    setForm({ name: "", code: "", address: "", phone: "", email: "" });
    setShowModal(true);
  };

  const openEdit = (b: Branch) => {
    setEditingBranch(b);
    setError("");
    setForm({
      name: b.name,
      code: b.code,
      address: b.address || "",
      phone: b.phone || "",
      email: b.email || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!form.name.trim() || !form.code.trim()) {
      setError("Name and code are required");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      if (editingBranch) {
        const res = await fetch(`/api/branches`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ _id: editingBranch._id, ...form }),
        });
        if (res.ok) {
          await fetchData();
          setShowModal(false);
        } else {
          const payload = await res.json();
          setError(payload.error || "Failed to update warehouse");
        }
      } else {
        const res = await fetch("/api/branches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          await fetchData();
          setShowModal(false);
        } else {
          const payload = await res.json();
          setError(payload.error || "Failed to create warehouse");
        }
      }
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save warehouse");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (branch: Branch) => {
    if (branch.isMain || deletingId) return;

    setDeletingId(branch._id);
    setError("");
    try {
      const res = await fetch(`/api/branches?id=${branch._id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchData();
      } else {
        const payload = await res.json();
        setError(payload.error || "Failed to delete warehouse");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete warehouse");
    } finally {
      setDeletingId("");
    }
  };

  const getStockForBranch = (branchId: string) =>
    stockSummaries.find((s) => s.branchId === branchId);

  const filtered = branches.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/20">
            <Warehouse className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Warehouses</h1>
            <p className="text-[13px] text-gray-400">
              Manage your branches &amp; warehouse locations
            </p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg hover:shadow-orange-500/30"
        >
          <Plus className="w-4 h-4" />
          Add Warehouse
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search warehouses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 transition-colors"
          />
        </div>
      </div>

      {/* Summary Cards */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          {
            label: "Total Locations",
            value: branches.length,
            icon: Warehouse,
            gradient: "from-orange-500 to-amber-600",
            shadow: "shadow-orange-500/20",
          },
          {
            label: "Active",
            value: branches.filter((b) => b.isActive).length,
            icon: CheckCircle,
            gradient: "from-emerald-500 to-teal-600",
            shadow: "shadow-emerald-500/20",
          },
          {
            label: "Total Stock Items",
            value: stockSummaries.reduce((a, s) => a + s.totalItems, 0),
            icon: Package,
            gradient: "from-blue-500 to-indigo-600",
            shadow: "shadow-blue-500/20",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-lg hover:shadow-gray-200/50"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg ${card.shadow}`}
              >
                <card.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-800">{card.value}</p>
                <p className="text-[13px] text-gray-400">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-orange-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((branch) => {
            const stock = getStockForBranch(branch._id);
            return (
              <div
                key={branch._id}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-lg hover:shadow-gray-200/50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl flex items-center justify-center">
                      <Warehouse className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {branch.name}
                      </h3>
                      <span className="text-xs text-gray-500">
                        Code: {branch.code}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {branch.isMain && (
                      <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                        Main
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        branch.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {branch.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  {branch.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>{branch.address}</span>
                    </div>
                  )}
                  {branch.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span>{branch.phone}</span>
                    </div>
                  )}
                  {branch.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span>{branch.email}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Package className="w-3.5 h-3.5" />
                      <span>{stock?.totalItems || 0} items</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(branch)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
                      title="Edit warehouse"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(branch)}
                      disabled={branch.isMain || deletingId === branch._id}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 disabled:opacity-40"
                      title={
                        branch.isMain
                          ? "Main warehouse cannot be deleted"
                          : "Delete warehouse"
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 rounded-2xl border border-gray-100 bg-white">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
                <Warehouse className="h-6 w-6 text-gray-300" />
              </div>
              <p className="font-medium text-gray-500">No warehouses found</p>
              <p className="text-[13px] text-gray-400">
                Try a different search term
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingBranch ? "Edit Warehouse" : "Add Warehouse"}
            </h2>
            <div className="space-y-4">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g. Downtown Store"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g. DT01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Street address"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="text"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl px-4 py-2.5 text-sm text-gray-600 border border-gray-200 bg-white transition-all hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-xl px-4 py-2.5 text-sm text-white bg-gradient-to-r from-orange-500 to-amber-600 shadow-md shadow-orange-500/25 transition-all hover:shadow-lg disabled:opacity-50"
              >
                {submitting ? "Saving..." : editingBranch ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
