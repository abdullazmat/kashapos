"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Package,
  AlertTriangle,
  ArrowUpDown,
  Search,
  RefreshCw,
  X,
  Warehouse,
  TrendingUp,
  Plus,
  Minus,
  ArrowRightLeft,
  ClipboardList,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useSession } from "../layout";

type StockTab = "overview" | "transfer" | "adjustment";

interface StockItem {
  _id: string;
  productId: { _id: string; name: string; sku: string; price: number };
  branchId: { _id: string; name: string };
  quantity: number;
  reservedQuantity: number;
  reorderLevel: number;
}

interface Branch {
  _id: string;
  name: string;
}

const inputClass =
  "mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20";

export default function StockPage() {
  const { tenant } = useSession();
  const currency = tenant?.settings?.currency || "UGX";
  const [stock, setStock] = useState<StockItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [adjustModal, setAdjustModal] = useState<StockItem | null>(null);
  const [adjustType, setAdjustType] = useState<"addition" | "subtraction">(
    "addition",
  );
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState<StockTab>("overview");

  // Stock Transfer state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferProduct, setTransferProduct] = useState("");
  const [transferQty, setTransferQty] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [savingTransfer, setSavingTransfer] = useState(false);

  // Product list for transfers
  const [products, setProducts] = useState<
    { _id: string; name: string; sku: string }[]
  >([]);

  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (branchFilter) params.set("branchId", branchFilter);
      const res = await fetch(`/api/stock?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStock(data.data || data);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [branchFilter]);

  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch("/api/branches");
      if (res.ok) {
        const data = await res.json();
        setBranches(data.data || data);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products?limit=500");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchStock();
    fetchBranches();
    fetchProducts();
  }, [fetchStock, fetchBranches, fetchProducts]);

  const handleAdjust = async () => {
    if (!adjustModal || !adjustQty || !adjustReason) return;
    setSaving(true);
    try {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: adjustModal.productId._id,
          branchId: adjustModal.branchId._id,
          type: adjustType,
          quantity: parseInt(adjustQty),
          reason: adjustReason,
        }),
      });
      if (res.ok) {
        setAdjustModal(null);
        setAdjustQty("");
        setAdjustReason("");
        fetchStock();
      }
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const handleTransfer = async () => {
    if (!transferFrom || !transferTo || !transferProduct || !transferQty)
      return;
    if (transferFrom === transferTo) {
      alert("Source and destination branches must be different");
      return;
    }
    setSavingTransfer(true);
    try {
      const selectedProduct = products.find((p) => p._id === transferProduct);
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: transferProduct,
          branchId: transferFrom,
          type: "subtraction",
          quantity: parseInt(transferQty),
          reason: `Stock transfer to ${branches.find((b) => b._id === transferTo)?.name || "branch"}: ${transferNotes || "N/A"}`,
        }),
      });
      if (res.ok) {
        await fetch("/api/stock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: transferProduct,
            branchId: transferTo,
            type: "addition",
            quantity: parseInt(transferQty),
            reason: `Stock transfer from ${branches.find((b) => b._id === transferFrom)?.name || "branch"}: ${transferNotes || "N/A"}`,
          }),
        });
        setShowTransferModal(false);
        setTransferFrom("");
        setTransferTo("");
        setTransferProduct("");
        setTransferQty("");
        setTransferNotes("");
        fetchStock();
      }
    } catch (err) {
      console.error(err);
    }
    setSavingTransfer(false);
  };

  const filtered = useMemo(() => {
    return stock.filter((s) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !s.productId?.name?.toLowerCase().includes(q) &&
          !s.productId?.sku?.toLowerCase().includes(q)
        )
          return false;
      }
      if (showLowOnly && s.quantity > s.reorderLevel) return false;
      return true;
    });
  }, [stock, search, showLowOnly]);

  const lowStockCount = useMemo(
    () => stock.filter((s) => s.quantity <= s.reorderLevel).length,
    [stock],
  );
  const totalUnits = useMemo(
    () => stock.reduce((sum, s) => sum + s.quantity, 0),
    [stock],
  );
  const totalValue = useMemo(
    () =>
      stock.reduce((sum, s) => sum + s.quantity * (s.productId?.price || 0), 0),
    [stock],
  );

  const summaryCards = [
    {
      label: "Total Units",
      value: totalUnits.toLocaleString(),
      icon: Package,
      gradient: "from-orange-500 to-amber-600",
      shadow: "shadow-orange-500/20",
    },
    {
      label: "Stock Value",
      value: formatCurrency(totalValue, currency),
      icon: TrendingUp,
      gradient: "from-blue-500 to-indigo-600",
      shadow: "shadow-blue-500/20",
    },
    {
      label: "Low Stock",
      value: lowStockCount.toString(),
      icon: AlertTriangle,
      gradient:
        lowStockCount > 0
          ? "from-amber-500 to-orange-600"
          : "from-gray-400 to-gray-500",
      shadow: lowStockCount > 0 ? "shadow-amber-500/20" : "shadow-gray-400/20",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/20">
            <Warehouse className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              Stock Management
            </h1>
            <p className="text-[13px] text-gray-400">
              Monitor and adjust stock levels
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTransferModal(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg hover:shadow-orange-500/30"
          >
            <ArrowRightLeft className="h-4 w-4" /> Transfer
          </button>
          <button
            onClick={fetchStock}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm transition-all hover:bg-gray-50 hover:shadow"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {(
          [
            { key: "overview", label: "Stock Overview" },
            { key: "transfer", label: "Stock Transfer" },
            { key: "adjustment", label: "Stock Adjustment" },
          ] as { key: StockTab; label: string }[]
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
      <div className="grid gap-4 sm:grid-cols-3">
        {summaryCards.map((card) => (
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
                <p className="text-[13px] text-gray-400">{card.label}</p>
                <p className="text-xl font-bold text-gray-800">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* TAB: Stock Overview */}
      {activeTab === "overview" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-600 transition-colors focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowLowOnly(!showLowOnly)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                showLowOnly
                  ? "border-amber-300 bg-amber-50 text-amber-700 ring-1 ring-amber-600/20"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              Low Stock Only
            </button>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-orange-500" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
                    <Package className="h-6 w-6 text-gray-300" />
                  </div>
                  <p className="font-medium text-gray-500">
                    No stock records found
                  </p>
                  <p className="text-[13px] text-gray-400">
                    Try adjusting your filters
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-blue-100 bg-blue-50/60">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Product
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Branch
                      </th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Qty
                      </th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Reserved
                      </th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Available
                      </th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Value
                      </th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Status
                      </th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((s) => {
                      const available = s.quantity - (s.reservedQuantity || 0);
                      const isLow = s.quantity <= s.reorderLevel;
                      return (
                        <tr
                          key={s._id}
                          className="group transition-colors hover:bg-gray-50/60"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-50 to-amber-50">
                                <Package className="h-4 w-4 text-orange-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-800">
                                  {s.productId?.name || "—"}
                                </p>
                                <p className="text-[11px] text-gray-400 font-mono">
                                  {s.productId?.sku || "—"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1 text-[12px] font-medium text-gray-600">
                              <Warehouse className="h-3 w-3" />
                              {s.branchId?.name || "—"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold text-gray-800">
                            {s.quantity}
                          </td>
                          <td className="px-5 py-3.5 text-right text-gray-400">
                            {s.reservedQuantity || 0}
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold text-gray-800">
                            {available}
                          </td>
                          <td className="px-5 py-3.5 text-right text-gray-600">
                            {formatCurrency(
                              s.quantity * (s.productId?.price || 0),
                              currency,
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {isLow ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-600 ring-1 ring-red-600/20">
                                <AlertTriangle className="h-3 w-3" />
                                Low
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 ring-1 ring-emerald-600/20">
                                OK
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => setAdjustModal(s)}
                              className="rounded-lg bg-orange-50 px-3 py-1.5 text-[12px] font-semibold text-orange-600 opacity-0 ring-1 ring-orange-600/20 transition-all hover:bg-orange-100 group-hover:opacity-100"
                            >
                              <ArrowUpDown className="mr-1 inline h-3 w-3" />
                              Adjust
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* TAB: Stock Transfer */}
      {activeTab === "transfer" && (
        <div className="max-w-lg">
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/20">
                <ArrowRightLeft className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-800">
                  Stock Transfer
                </h3>
                <p className="text-[12px] text-gray-400">
                  Move stock between branches
                </p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Product
                </label>
                <select
                  value={transferProduct}
                  onChange={(e) => setTransferProduct(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select product</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    From Branch
                  </label>
                  <select
                    value={transferFrom}
                    onChange={(e) => setTransferFrom(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select branch</option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    To Branch
                  </label>
                  <select
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select branch</option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Enter quantity"
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Notes / Reason
                </label>
                <textarea
                  placeholder="Transfer notes (optional)"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  rows={3}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => {
                  setTransferProduct("");
                  setTransferFrom("");
                  setTransferTo("");
                  setTransferQty("");
                  setTransferNotes("");
                }}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                onClick={handleTransfer}
                disabled={
                  savingTransfer ||
                  !transferFrom ||
                  !transferTo ||
                  !transferProduct ||
                  !transferQty
                }
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 hover:shadow-lg disabled:opacity-50"
              >
                {savingTransfer ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <ArrowRightLeft className="h-4 w-4" />
                )}
                {savingTransfer ? "Transferring…" : "Transfer Stock"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Stock Adjustment */}
      {activeTab === "adjustment" && (
        <div className="max-w-lg">
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/20">
                <ArrowUpDown className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-800">
                  Stock Adjustment
                </h3>
                <p className="text-[12px] text-gray-400">
                  Add or remove stock with a reason
                </p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Product
                </label>
                <select
                  value={adjustModal?.productId?._id || ""}
                  onChange={(e) => {
                    const item = stock.find(
                      (s) => s.productId?._id === e.target.value,
                    );
                    if (item) setAdjustModal(item);
                  }}
                  className={inputClass}
                >
                  <option value="">Select product</option>
                  {stock.map((s) => (
                    <option key={s._id} value={s.productId?._id}>
                      {s.productId?.name} ({s.branchId?.name}) — Qty:{" "}
                      {s.quantity}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAdjustType("addition")}
                  className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${adjustType === "addition" ? "border-amber-500 bg-emerald-50 text-emerald-700 shadow-sm" : "border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50"}`}
                >
                  <Plus className="h-4 w-4" /> Add Stock
                </button>
                <button
                  onClick={() => setAdjustType("subtraction")}
                  className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${adjustType === "subtraction" ? "border-red-500 bg-red-50 text-red-700 shadow-sm" : "border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50"}`}
                >
                  <Minus className="h-4 w-4" /> Remove Stock
                </button>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Quantity
                </label>
                <input
                  type="number"
                  placeholder="Enter quantity"
                  min="1"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Reason / Note
                </label>
                <textarea
                  placeholder="Reason for adjustment"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  rows={3}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => {
                  setAdjustModal(null);
                  setAdjustQty("");
                  setAdjustReason("");
                }}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                onClick={handleAdjust}
                disabled={saving || !adjustQty || !adjustReason || !adjustModal}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 hover:shadow-lg disabled:opacity-50"
              >
                {saving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <ArrowUpDown className="h-4 w-4" />
                )}
                {saving ? "Applying…" : "Apply Adjustment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {adjustModal && activeTab === "overview" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/20">
                  <ArrowUpDown className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-800">
                    Adjust Stock
                  </h3>
                  <p className="text-[12px] text-gray-400">
                    {adjustModal.productId?.name} — {adjustModal.branchId?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setAdjustModal(null);
                  setAdjustQty("");
                  setAdjustReason("");
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Current Qty */}
              <div className="rounded-xl bg-gray-50 p-4 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Current Quantity
                </p>
                <p className="mt-1 text-2xl font-extrabold text-gray-800">
                  {adjustModal.quantity}
                </p>
              </div>

              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAdjustType("addition")}
                  className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                    adjustType === "addition"
                      ? "border-amber-500 bg-emerald-50 text-emerald-700 shadow-sm"
                      : "border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  Add Stock
                </button>
                <button
                  onClick={() => setAdjustType("subtraction")}
                  className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                    adjustType === "subtraction"
                      ? "border-red-500 bg-red-50 text-red-700 shadow-sm"
                      : "border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <Minus className="h-4 w-4" />
                  Remove Stock
                </button>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Quantity
                </label>
                <input
                  type="number"
                  placeholder="Enter quantity"
                  min="1"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Reason
                </label>
                <input
                  type="text"
                  placeholder="Reason for adjustment"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => {
                  setAdjustModal(null);
                  setAdjustQty("");
                  setAdjustReason("");
                }}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjust}
                disabled={saving || !adjustQty || !adjustReason}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg disabled:opacity-50"
              >
                {saving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <ArrowUpDown className="h-4 w-4" />
                )}
                {saving ? "Applying…" : "Apply Adjustment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/20">
                  <ArrowRightLeft className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-800">
                    Stock Transfer
                  </h3>
                  <p className="text-[12px] text-gray-400">
                    Move stock between branches
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTransferModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Product
                </label>
                <select
                  value={transferProduct}
                  onChange={(e) => setTransferProduct(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select product</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    From Branch
                  </label>
                  <select
                    value={transferFrom}
                    onChange={(e) => setTransferFrom(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select branch</option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    To Branch
                  </label>
                  <select
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select branch</option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Enter quantity"
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="Transfer notes (optional)"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setShowTransferModal(false)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={
                  savingTransfer ||
                  !transferFrom ||
                  !transferTo ||
                  !transferProduct ||
                  !transferQty
                }
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg disabled:opacity-50"
              >
                {savingTransfer ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <ArrowRightLeft className="h-4 w-4" />
                )}
                {savingTransfer ? "Transferring…" : "Transfer Stock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
