"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RotateCcw,
  Plus,
  Search,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  X,
  Clock,
  CircleAlert,
  CheckCircle2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useSession } from "../layout";

interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  tone: "success" | "error";
}

interface ReturnItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
  reason: string;
}

interface ReturnRecord {
  _id: string;
  returnNumber: string;
  type: "sales_return" | "purchase_return";
  referenceNumber?: string;
  customerId?: { _id: string; name: string };
  vendorId?: { _id: string; name: string };
  items: ReturnItem[];
  subtotal: number;
  total: number;
  status: "pending" | "approved" | "completed" | "rejected";
  refundMethod?: string;
  notes: string;
  processedBy?: { _id: string; name: string };
  createdAt: string;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  price: number;
  costPrice?: number;
}

export default function ReturnsPage() {
  const { tenant } = useSession();
  const currency = tenant?.settings?.currency || "UGX";
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [productLoadError, setProductLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [updatingReturnId, setUpdatingReturnId] = useState("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showModal, setShowModal] = useState(false);

  // New return form
  const [returnType, setReturnType] = useState<
    "sales_return" | "purchase_return"
  >("sales_return");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [refundMethod, setRefundMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [returnItems, setReturnItems] = useState<
    {
      productId: string;
      productName: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      reason: string;
    }[]
  >([]);

  const pushToast = useCallback(
    (tone: ToastMessage["tone"], title: string, description?: string) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((current) => [...current, { id, title, description, tone }]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 3500);
    },
    [],
  );

  const fetchReturns = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(`/api/returns?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch returns");
      }
      const data = await res.json();
      setReturns(data.returns || []);
    } catch (error) {
      console.error("Failed to fetch returns:", error);
      pushToast(
        "error",
        "Could not load returns",
        "Please refresh and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [pushToast, typeFilter]);

  const fetchProducts = useCallback(async () => {
    try {
      setProductLoadError("");
      const res = await fetch("/api/products?limit=500&active=true");
      if (!res.ok) {
        throw new Error("Failed to fetch products");
      }
      const data = await res.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      setProducts([]);
      setProductLoadError(
        "Products could not be loaded. Try refreshing the page.",
      );
      pushToast(
        "error",
        "Could not load products",
        "The return form will stay limited until products load.",
      );
    }
  }, [pushToast]);

  useEffect(() => {
    fetchReturns();
    fetchProducts();
  }, [fetchReturns, fetchProducts]);

  const addItem = () => {
    setReturnItems([
      ...returnItems,
      {
        productId: "",
        productName: "",
        sku: "",
        quantity: 1,
        unitPrice: 0,
        reason: "",
      },
    ]);
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const updated = [...returnItems];
    if (field === "productId") {
      const product = products.find((p) => p._id === value);
      if (product) {
        updated[index] = {
          ...updated[index],
          productId: product._id,
          productName: product.name,
          sku: product.sku,
          unitPrice:
            returnType === "sales_return"
              ? product.price
              : product.costPrice || product.price,
        };
      }
    } else {
      (updated[index] as Record<string, unknown>)[field] = value;
    }
    setReturnItems(updated);
  };

  const removeItem = (index: number) => {
    setReturnItems(returnItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (returnItems.length === 0) {
      pushToast(
        "error",
        "Add at least one item",
        "Select a product before creating the return.",
      );
      return;
    }

    if (returnItems.some((item) => !item.productId || item.quantity <= 0)) {
      pushToast(
        "error",
        "Incomplete return item",
        "Each row needs a product and quantity greater than zero.",
      );
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: returnType,
          referenceNumber,
          refundMethod,
          notes,
          items: returnItems,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create return");
      }

      setShowModal(false);
      setReturnItems([]);
      setReferenceNumber("");
      setNotes("");
      setRefundMethod("cash");
      setReturnType("sales_return");
      await fetchReturns();
      pushToast(
        "success",
        "Return created",
        `Return ${data.returnNumber || "saved successfully"}.`,
      );
    } catch (error) {
      console.error("Failed to create return:", error);
      pushToast(
        "error",
        "Failed to create return",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      setUpdatingReturnId(id);
      const res = await fetch("/api/returns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update status");
      }

      await fetchReturns();
      pushToast("success", "Return updated", `Return marked as ${status}.`);
    } catch (error) {
      console.error("Failed to update return:", error);
      pushToast(
        "error",
        "Failed to update return",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setUpdatingReturnId("");
    }
  };

  const filtered = returns.filter(
    (r) =>
      r.returnNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.referenceNumber?.toLowerCase().includes(search.toLowerCase()) ||
      r.items.some((i) =>
        i.productName.toLowerCase().includes(search.toLowerCase()),
      ),
  );

  const totalReturns = returns.length;
  const salesReturns = returns.filter((r) => r.type === "sales_return").length;
  const purchaseReturns = returns.filter(
    (r) => r.type === "purchase_return",
  ).length;
  const pendingReturns = returns.filter((r) => r.status === "pending").length;

  const statusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-100 text-emerald-700";
      case "approved":
        return "bg-blue-100 text-blue-700";
      case "pending":
        return "bg-amber-100 text-amber-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      <div className="fixed right-4 top-4 z-[70] flex w-full max-w-sm flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto overflow-hidden rounded-2xl border bg-white shadow-2xl backdrop-blur ${toast.tone === "success" ? "border-emerald-200 shadow-emerald-500/10" : "border-red-200 shadow-red-500/10"}`}
          >
            <div className="flex items-start gap-3 p-4">
              <div
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toast.tone === "success" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}
              >
                {toast.tone === "success" ? (
                  <CheckCircle2 className="h-4.5 w-4.5" />
                ) : (
                  <CircleAlert className="h-4.5 w-4.5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  {toast.title}
                </p>
                {toast.description && (
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                onClick={() =>
                  setToasts((current) =>
                    current.filter((item) => item.id !== toast.id),
                  )
                }
                className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/20">
            <RotateCcw className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Returns</h1>
            <p className="text-[13px] text-gray-400">
              Manage sales &amp; purchase returns
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg hover:shadow-orange-500/30"
        >
          <Plus className="w-4 h-4" />
          New Return
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Returns",
            value: totalReturns,
            icon: RotateCcw,
            gradient: "from-orange-500 to-amber-600",
            shadow: "shadow-orange-500/20",
          },
          {
            label: "Sales Returns",
            value: salesReturns,
            icon: ArrowDownLeft,
            gradient: "from-blue-500 to-indigo-600",
            shadow: "shadow-blue-500/20",
          },
          {
            label: "Purchase Returns",
            value: purchaseReturns,
            icon: ArrowUpRight,
            gradient: "from-purple-500 to-violet-600",
            shadow: "shadow-purple-500/20",
          },
          {
            label: "Pending",
            value: pendingReturns,
            icon: Clock,
            gradient:
              pendingReturns > 0
                ? "from-amber-500 to-orange-600"
                : "from-gray-400 to-gray-500",
            shadow:
              pendingReturns > 0 ? "shadow-amber-500/20" : "shadow-gray-400/20",
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
                <p className="text-[13px] text-gray-400">{card.label}</p>
                <p className="text-xl font-bold text-gray-800">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search returns…"
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
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-600 transition-colors focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        >
          <option value="">All Types</option>
          <option value="sales_return">Sales Returns</option>
          <option value="purchase_return">Purchase Returns</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-orange-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
              <Package className="h-6 w-6 text-gray-300" />
            </div>
            <p className="font-medium text-gray-500">No returns found</p>
            <p className="text-[13px] text-gray-400">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Return #
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Type
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Reference
                </th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Items
                </th>
                <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Total
                </th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Date
                </th>
                <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((ret) => (
                <tr
                  key={ret._id}
                  className="group transition-colors hover:bg-gray-50/60"
                >
                  <td className="px-5 py-3.5 font-semibold text-gray-800">
                    {ret.returnNumber}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${
                        ret.type === "sales_return"
                          ? "bg-blue-50 text-blue-600 ring-blue-600/20"
                          : "bg-purple-50 text-purple-600 ring-purple-600/20"
                      }`}
                    >
                      {ret.type === "sales_return" ? (
                        <ArrowDownLeft className="h-3 w-3" />
                      ) : (
                        <ArrowUpRight className="h-3 w-3" />
                      )}
                      {ret.type === "sales_return" ? "Sales" : "Purchase"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 font-mono text-[12px]">
                    {ret.referenceNumber || "—"}
                  </td>
                  <td className="px-5 py-3.5 text-center text-gray-600">
                    {ret.items.length}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-gray-800">
                    {formatCurrency(ret.total, currency)}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${statusColor(ret.status)}`}
                    >
                      {ret.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 text-[13px]">
                    {new Date(ret.createdAt).toLocaleDateString("en-UG", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {ret.status === "pending" && (
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() =>
                            handleStatusUpdate(ret._id, "completed")
                          }
                          disabled={updatingReturnId === ret._id}
                          className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 ring-1 ring-emerald-600/20 transition-all hover:bg-emerald-100"
                          title="Complete"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            handleStatusUpdate(ret._id, "rejected")
                          }
                          disabled={updatingReturnId === ret._id}
                          className="rounded-lg bg-red-50 p-1.5 text-red-600 ring-1 ring-red-600/20 transition-all hover:bg-red-100"
                          title="Reject"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Return Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/20">
                  <RotateCcw className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-800">
                    New Return
                  </h2>
                  <p className="text-[12px] text-gray-400">
                    Process a sales or purchase return
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    Type
                  </label>
                  <select
                    value={returnType}
                    onChange={(e) =>
                      setReturnType(
                        e.target.value as "sales_return" | "purchase_return",
                      )
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  >
                    <option value="sales_return">Sales Return</option>
                    <option value="purchase_return">Purchase Return</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    {returnType === "sales_return"
                      ? "Invoice / Sale #"
                      : "PO #"}
                  </label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    placeholder="Reference number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Refund Method
                </label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                >
                  <option value="cash">Cash</option>
                  <option value="credit">Store Credit</option>
                  <option value="exchange">Exchange</option>
                </select>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[13px] font-medium text-gray-700">
                    Items
                  </label>
                  <button
                    onClick={addItem}
                    className="text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
                  >
                    + Add Item
                  </button>
                </div>
                {productLoadError && (
                  <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                    {productLoadError}
                  </div>
                )}
                {returnItems.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-6 text-center">
                    <Package className="h-6 w-6 mx-auto text-gray-300 mb-1" />
                    <p className="text-[13px] text-gray-400">
                      No items added. Click &quot;+ Add Item&quot; to begin.
                    </p>
                  </div>
                )}
                {returnItems.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-gray-200 p-3 mb-2 space-y-2 bg-gray-50/30"
                  >
                    <div className="flex gap-2">
                      <select
                        value={item.productId}
                        onChange={(e) =>
                          updateItem(index, "productId", e.target.value)
                        }
                        className="flex-1 rounded-lg border border-gray-200 px-2.5 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      >
                        <option value="">Select product</option>
                        {products.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeItem(index)}
                        className="rounded-lg p-2 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[11px] font-medium text-gray-400">
                          Qty
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "quantity",
                              parseInt(e.target.value) || 1,
                            )
                          }
                          className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-gray-400">
                          Unit Price
                        </label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "unitPrice",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-gray-400">
                          Subtotal
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={formatCurrency(
                            item.quantity * item.unitPrice,
                            currency,
                          )}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-500"
                        />
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Reason for return"
                      value={item.reason}
                      onChange={(e) =>
                        updateItem(index, "reason", e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                ))}
              </div>

              {returnItems.length > 0 && (
                <div className="rounded-xl bg-orange-50/50 p-3 text-right">
                  <span className="text-[13px] text-gray-500">Total: </span>
                  <span className="text-lg font-bold text-gray-800">
                    {formatCurrency(
                      returnItems.reduce(
                        (sum, i) => sum + i.quantity * i.unitPrice,
                        0,
                      ),
                      currency,
                    )}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  placeholder="Optional notes..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg"
              >
                {submitting ? "Creating..." : "Create Return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
