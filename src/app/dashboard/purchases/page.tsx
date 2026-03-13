"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ShoppingBag,
  Plus,
  Eye,
  X,
  Truck,
  ChevronLeft,
  ChevronRight,
  Filter,
  Package,
  Calendar,
  Store,
  DollarSign,
  CreditCard,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSession } from "../layout";

interface PurchaseOrder {
  _id: string;
  orderNumber: string;
  vendorId?: { name: string };
  items: {
    productName: string;
    quantity: number;
    unitCost: number;
    receivedQuantity: number;
    total: number;
  }[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  status: string;
  paymentStatus: string;
  amountPaid: number;
  expectedDelivery?: string;
  notes: string;
  createdAt: string;
}

interface Vendor {
  _id: string;
  name: string;
}
interface Product {
  _id: string;
  name: string;
  costPrice: number;
}
interface Branch {
  _id: string;
  name: string;
}

export default function PurchasesPage() {
  const { tenant } = useSession();
  const currency = tenant?.settings?.currency || "UGX";
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [viewOrder, setViewOrder] = useState<PurchaseOrder | null>(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [formError, setFormError] = useState("");
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const [newOrder, setNewOrder] = useState({
    vendorId: "",
    branchId: "",
    status: "draft" as string,
    notes: "",
    dueDate: "",
    paymentMethod: "cash",
    amountPaid: "",
    items: [] as {
      productId: string;
      productName: string;
      quantity: number;
      unitCost: number;
      total: number;
    }[],
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "20",
      ...(statusFilter && { status: statusFilter }),
    });
    try {
      const [ordRes, vendRes, prodRes, branchRes] = await Promise.all([
        fetch(`/api/purchases?${params}`),
        fetch("/api/vendors"),
        fetch("/api/products?limit=200"),
        fetch("/api/branches"),
      ]);
      if (ordRes.ok) {
        const d = await ordRes.json();
        setOrders(d.orders || []);
        setTotal(d.total || 0);
      }
      if (vendRes.ok) {
        const vendorData = await vendRes.json();
        setVendors(
          Array.isArray(vendorData) ? vendorData : vendorData.vendors || [],
        );
      }
      if (prodRes.ok) {
        const d = await prodRes.json();
        setProducts(d.products || []);
      }
      if (branchRes.ok) {
        const branchData = await branchRes.json();
        setBranches(
          Array.isArray(branchData) ? branchData : branchData.branches || [],
        );
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addItem = () => {
    setNewOrder({
      ...newOrder,
      items: [
        ...newOrder.items,
        { productId: "", productName: "", quantity: 1, unitCost: 0, total: 0 },
      ],
    });
  };

  const addNewVendor = async () => {
    if (!newVendorName.trim()) return;
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newVendorName.trim() }),
      });
      if (res.ok) {
        const vendor = await res.json();
        setVendors((prev) => [...prev, vendor]);
        setNewOrder({ ...newOrder, vendorId: vendor._id });
        setShowAddVendor(false);
        setNewVendorName("");
      }
    } catch {
      // ignore
    }
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const items = [...newOrder.items];
    const item = { ...items[index], [field]: value };
    if (field === "productId") {
      const p = products.find((pr) => pr._id === value);
      if (p) {
        item.productName = p.name;
        item.unitCost = p.costPrice;
        item.total = p.costPrice * item.quantity;
      }
    }
    if (field === "quantity" || field === "unitCost") {
      item.total = (item.unitCost || 0) * (item.quantity || 0);
    }
    items[index] = item;
    setNewOrder({ ...newOrder, items });
  };

  const removeItem = (index: number) => {
    setNewOrder({
      ...newOrder,
      items: newOrder.items.filter((_, i) => i !== index),
    });
  };

  const submitOrder = async () => {
    if (submittingOrder) return;

    if (!newOrder.vendorId) {
      setFormError("Select a vendor before creating the order.");
      return;
    }

    if (newOrder.items.length === 0) {
      setFormError("Add at least one product to the purchase order.");
      return;
    }

    if (newOrder.items.some((item) => !item.productId || item.quantity <= 0)) {
      setFormError(
        "Each order item must include a product and a valid quantity.",
      );
      return;
    }

    setSubmittingOrder(true);
    setFormError("");
    const subtotal = newOrder.items.reduce((sum, i) => sum + i.total, 0);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newOrder,
          subtotal,
          total: subtotal,
          amountPaid: parseFloat(newOrder.amountPaid) || 0,
          expectedDelivery: newOrder.dueDate || undefined,
        }),
      });
      const payload = await res.json();

      if (res.ok) {
        setShowNewOrder(false);
        setNewOrder({
          vendorId: "",
          branchId: "",
          status: "draft",
          notes: "",
          dueDate: "",
          paymentMethod: "cash",
          amountPaid: "",
          items: [],
        });
        setFormError("");
        fetchData();
      } else {
        setFormError(payload.error || "Failed to create order");
      }
    } catch {
      setFormError("Failed to create order. Please try again.");
    } finally {
      setSubmittingOrder(false);
    }
  };

  const totalPages = Math.ceil(total / 20);

  const stats = useMemo(() => {
    const totalValue = orders.reduce((a, o) => a + o.total, 0);
    const received = orders.filter((o) => o.status === "received").length;
    const pending = orders.filter(
      (o) => o.status === "ordered" || o.status === "draft",
    ).length;
    return { totalValue, received, pending, totalCount: total };
  }, [orders, total]);

  const statusColor: Record<string, string> = {
    draft: "bg-gray-50 text-gray-700 ring-1 ring-gray-600/10",
    ordered: "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20",
    partial: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
    received: "bg-emerald-50 text-emerald-700 ring-1 ring-amber-600/20",
    cancelled: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
  };

  const paymentColor: Record<string, string> = {
    paid: "bg-emerald-50 text-emerald-700 ring-1 ring-amber-600/20",
    partial: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
    unpaid: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
  };

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20";

  const summaryCards = [
    {
      label: "Total Orders",
      value: stats.totalCount.toString(),
      icon: ShoppingBag,
      gradient: "from-orange-500 to-amber-600",
      shadow: "shadow-orange-500/20",
    },
    {
      label: "Total Value",
      value: formatCurrency(stats.totalValue, currency),
      icon: Truck,
      gradient: "from-blue-500 to-indigo-600",
      shadow: "shadow-blue-500/20",
    },
    {
      label: "Received",
      value: stats.received.toString(),
      icon: Package,
      gradient: "from-amber-500 to-green-600",
      shadow: "shadow-amber-500/20",
    },
    {
      label: "Pending",
      value: stats.pending.toString(),
      icon: ShoppingBag,
      gradient: "from-violet-500 to-purple-600",
      shadow: "shadow-violet-500/20",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/20">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
            <p className="text-[13px] text-gray-500">
              Manage purchase orders from suppliers
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setFormError("");
            setShowNewOrder(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg hover:shadow-orange-500/30"
        >
          <Plus className="h-4 w-4" /> New Purchase Order
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 transition-all hover:shadow-lg hover:shadow-gray-200/50"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} shadow-md ${card.shadow}`}
              >
                <card.icon className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-[13px] text-gray-500">{card.label}</p>
                <p className="text-lg font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4">
        <Filter className="h-4 w-4 text-gray-400" />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="ordered">Ordered</option>
          <option value="partial">Partially Received</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {statusFilter && (
          <button
            onClick={() => {
              setStatusFilter("");
              setPage(1);
            }}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-100 bg-blue-50/60">
                <th className="px-5 py-3.5 text-left text-[13px] font-semibold text-gray-600">
                  Order #
                </th>
                <th className="px-5 py-3.5 text-left text-[13px] font-semibold text-gray-600">
                  Date
                </th>
                <th className="px-5 py-3.5 text-left text-[13px] font-semibold text-gray-600">
                  Vendor
                </th>
                <th className="px-5 py-3.5 text-right text-[13px] font-semibold text-gray-600">
                  Total
                </th>
                <th className="px-5 py-3.5 text-right text-[13px] font-semibold text-gray-600">
                  Balance
                </th>
                <th className="px-5 py-3.5 text-center text-[13px] font-semibold text-gray-600">
                  Status
                </th>
                <th className="px-5 py-3.5 text-center text-[13px] font-semibold text-gray-600">
                  Payment
                </th>
                <th className="px-5 py-3.5 text-right text-[13px] font-semibold text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-orange-500" />
                      <span className="text-sm text-gray-400">
                        Loading orders...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                        <ShoppingBag className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="font-medium text-gray-500">
                        No purchase orders found
                      </p>
                      <p className="text-[13px] text-gray-400">
                        Create your first purchase order
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr
                    key={o._id}
                    className="group transition-colors hover:bg-gray-50/80"
                  >
                    <td className="px-5 py-3.5">
                      <span className="rounded-lg bg-gray-100 px-2 py-1 font-mono text-xs font-semibold text-gray-700">
                        {o.orderNumber}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">
                      {formatDate(o.createdAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-orange-100 to-amber-200 text-[10px] font-bold text-orange-700">
                          {(o.vendorId?.name || "?")[0]}
                        </div>
                        <span className="text-gray-700">
                          {o.vendorId?.name || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-gray-900">
                      {formatCurrency(o.total, currency)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span
                        className={`font-semibold ${o.total - o.amountPaid > 0 ? "text-red-600" : "text-gray-400"}`}
                      >
                        {o.total - o.amountPaid > 0
                          ? formatCurrency(o.total - o.amountPaid, currency)
                          : "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusColor[o.status] || ""}`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${paymentColor[o.paymentStatus] || ""}`}
                      >
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setViewOrder(o)}
                        className="rounded-lg p-1.5 text-gray-400 opacity-0 transition-all hover:bg-orange-50 hover:text-orange-600 group-hover:opacity-100"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
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

      {/* New Purchase Order Modal */}
      {showNewOrder && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4 pt-8"
          onClick={() => setShowNewOrder(false)}
        >
          <div
            className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-md shadow-orange-500/20">
                  <ShoppingBag className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">
                    New Purchase Order
                  </h2>
                  <p className="text-[12px] text-gray-400">
                    Generate a new purchase order with multiple items
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNewOrder(false)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
              {/* Left: Form */}
              <div className="lg:col-span-2 max-h-[70vh] overflow-y-auto px-6 py-5">
                <div className="space-y-5">
                  {formError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {formError}
                    </div>
                  )}

                  {/* Supplier & Store Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 mb-1.5">
                        <Truck className="h-4 w-4 text-gray-400" />
                        Supplier *
                      </label>
                      {showAddVendor ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newVendorName}
                            onChange={(e) => setNewVendorName(e.target.value)}
                            placeholder="New supplier name"
                            className={inputClass + " flex-1"}
                          />
                          <button
                            onClick={addNewVendor}
                            className="rounded-xl bg-emerald-500 px-3 text-white text-sm font-medium hover:bg-emerald-600"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setShowAddVendor(false);
                              setNewVendorName("");
                            }}
                            className="rounded-xl border border-gray-200 px-3 text-gray-500 text-sm hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <select
                            value={newOrder.vendorId}
                            onChange={(e) =>
                              setNewOrder({
                                ...newOrder,
                                vendorId: e.target.value,
                              })
                            }
                            className={inputClass + " flex-1"}
                          >
                            <option value="">Type or select supplier</option>
                            {vendors.map((v) => (
                              <option key={v._id} value={v._id}>
                                {v.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => setShowAddVendor(true)}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 self-end"
                            title="Add new supplier"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 mb-1.5">
                        <Store className="h-4 w-4 text-gray-400" />
                        Store *
                      </label>
                      <select
                        value={newOrder.branchId}
                        onChange={(e) =>
                          setNewOrder({ ...newOrder, branchId: e.target.value })
                        }
                        className={inputClass}
                      >
                        <option value="">Select a store</option>
                        {branches.map((b) => (
                          <option key={b._id} value={b._id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[10px] text-gray-400">
                        Select a store for this purchase order
                      </p>
                    </div>
                  </div>

                  {/* Due Date & Currency Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 mb-1.5">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={newOrder.dueDate}
                        onChange={(e) =>
                          setNewOrder({ ...newOrder, dueDate: e.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="text-[13px] font-semibold text-gray-700 mb-1.5 block">
                        Currency
                      </label>
                      <div className="mt-1.5 rounded-xl border border-gray-200 bg-gray-100 px-3.5 py-2.5 text-sm text-gray-600 font-medium">
                        {currency}
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-[14px] font-bold text-gray-800">
                        Order Items
                      </h3>
                      <button
                        onClick={addItem}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Item
                      </button>
                    </div>

                    {/* Items Header */}
                    {newOrder.items.length > 0 && (
                      <div className="grid grid-cols-12 gap-2 px-3 mb-1.5">
                        <span className="col-span-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                          Item
                        </span>
                        <span className="col-span-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                          Unit
                        </span>
                        <span className="col-span-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                          Quantity
                        </span>
                        <span className="col-span-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                          Unit Price
                        </span>
                        <span className="col-span-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                          Total
                        </span>
                        <span className="col-span-1"></span>
                      </div>
                    )}

                    <div className="space-y-2">
                      {newOrder.items.map((item, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-12 gap-2 items-center rounded-xl border border-gray-100 bg-gray-50/50 p-2.5"
                        >
                          <select
                            value={item.productId}
                            onChange={(e) =>
                              updateItem(i, "productId", e.target.value)
                            }
                            className="col-span-4 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm"
                          >
                            <option value="">Type or select item</option>
                            {products.map((p) => (
                              <option key={p._id} value={p._id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <select className="col-span-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm">
                            <option value="piece">Piece</option>
                            <option value="box">Box</option>
                            <option value="kg">Kg</option>
                            <option value="dozen">Dozen</option>
                            <option value="carton">Carton</option>
                          </select>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(
                                i,
                                "quantity",
                                parseInt(e.target.value) || 0,
                              )
                            }
                            className="col-span-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm"
                            placeholder="Qty"
                            min="1"
                          />
                          <input
                            type="number"
                            value={item.unitCost}
                            onChange={(e) =>
                              updateItem(
                                i,
                                "unitCost",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="col-span-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm"
                            placeholder="Enter"
                          />
                          <span className="col-span-1 text-sm font-semibold text-gray-700 text-right">
                            {formatCurrency(item.total, currency)}
                          </span>
                          <div className="col-span-1 flex justify-center">
                            <button
                              onClick={() => removeItem(i)}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {newOrder.items.length === 0 && (
                      <div className="flex flex-col items-center gap-1 py-8 text-center">
                        <Package className="h-8 w-8 text-gray-300" />
                        <p className="text-sm text-gray-400">
                          No items added yet
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-[13px] font-semibold text-gray-700">
                      Notes
                    </label>
                    <textarea
                      value={newOrder.notes}
                      onChange={(e) =>
                        setNewOrder({ ...newOrder, notes: e.target.value })
                      }
                      rows={2}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* Right: Payment & Summary */}
              <div className="border-l border-gray-100 px-5 py-5 space-y-5">
                {/* Payment Method */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                  <label className="text-[13px] font-semibold text-gray-700 mb-2 block">
                    Payment Method
                  </label>
                  <select
                    value={newOrder.paymentMethod}
                    onChange={(e) =>
                      setNewOrder({
                        ...newOrder,
                        paymentMethod: e.target.value,
                      })
                    }
                    className={inputClass}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="cheque">Cheque</option>
                    <option value="credit">Credit</option>
                  </select>

                  <label className="text-[13px] font-semibold text-gray-700 mt-3 mb-1.5 block">
                    Amount Paid
                  </label>
                  <input
                    type="number"
                    value={newOrder.amountPaid}
                    onChange={(e) =>
                      setNewOrder({ ...newOrder, amountPaid: e.target.value })
                    }
                    placeholder="Enter amount paid"
                    className={inputClass}
                  />
                </div>

                {/* Order Summary */}
                <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3">
                    <DollarSign className="h-4 w-4 text-red-500" />
                    Order Summary
                  </h3>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Amount</span>
                      <span className="font-bold text-gray-900">
                        {formatCurrency(
                          newOrder.items.reduce((sum, i) => sum + i.total, 0),
                          currency,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Amount Paid</span>
                      <span className="font-bold text-red-600">
                        {formatCurrency(
                          parseFloat(newOrder.amountPaid) || 0,
                          currency,
                        )}
                      </span>
                    </div>
                    <div className="border-t border-red-200 pt-2 flex justify-between">
                      <span className="font-semibold text-gray-700">
                        Balance Due
                      </span>
                      <span className="font-bold text-gray-900">
                        {formatCurrency(
                          Math.max(
                            0,
                            newOrder.items.reduce(
                              (sum, i) => sum + i.total,
                              0,
                            ) - (parseFloat(newOrder.amountPaid) || 0),
                          ),
                          currency,
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setShowNewOrder(false)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitOrder}
                disabled={
                  submittingOrder ||
                  !newOrder.vendorId ||
                  newOrder.items.length === 0
                }
                className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg disabled:opacity-50 disabled:shadow-none"
              >
                {submittingOrder ? "Creating..." : "Create Purchase Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Order Modal */}
      {viewOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setViewOrder(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-md shadow-orange-500/20">
                  <ShoppingBag className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">
                    PO #{viewOrder.orderNumber}
                  </h2>
                  <p className="text-[13px] text-gray-500">
                    {formatDate(viewOrder.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewOrder(null)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="mb-5 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                    Vendor
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-gray-700">
                    {viewOrder.vendorId?.name || "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                    Status
                  </p>
                  <span
                    className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusColor[viewOrder.status]}`}
                  >
                    {viewOrder.status}
                  </span>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                    Payment
                  </p>
                  <span
                    className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${paymentColor[viewOrder.paymentStatus]}`}
                  >
                    {viewOrder.paymentStatus}
                  </span>
                </div>
              </div>

              <table className="mb-4 w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Item
                    </th>
                    <th className="pb-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Qty
                    </th>
                    <th className="pb-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Cost
                    </th>
                    <th className="pb-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {viewOrder.items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-2.5 font-medium text-gray-700">
                        {item.productName}
                      </td>
                      <td className="py-2.5 text-right text-gray-500">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 text-right text-gray-500">
                        {formatCurrency(item.unitCost, currency)}
                      </td>
                      <td className="py-2.5 text-right font-medium text-gray-700">
                        {formatCurrency(item.total, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="rounded-xl bg-gray-50 p-4">
                <div className="flex justify-between border-t-0 text-base font-bold">
                  <span className="text-gray-900">Total</span>
                  <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                    {formatCurrency(viewOrder.total, currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
