"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "../layout";
import {
  Barcode as BarcodeIcon,
  Layers,
  Plus,
  Search,
  X,
  Calendar,
  Package,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  Hash,
  Tag,
  DollarSign,
  Trash2,
  Eye,
  RotateCcw,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { findBarcodeMatch, logBarcodeScanEvent } from "@/lib/barcode-client";

type CostingMethod = "fifo" | "lifo" | "weighted_avg";

interface BatchItem {
  productId: string;
  productName: string;
  quantity: number;
  remainingQty: number;
  costPrice: number;
  sellingPrice: number;
  expiryDate?: string;
}

interface Batch {
  _id: string;
  batchNumber: string;
  purchaseOrderId?: string;
  items: BatchItem[];
  receivedDate: string;
  notes?: string;
  status: "active" | "depleted" | "expired";
  createdAt: string;
}

type ViewMode = "list" | "settings" | "detail";
type BatchFilter = "all" | "active" | "depleted" | "expired";

interface Product {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  costPrice?: number;
}

export default function BatchesPage() {
  const { tenant } = useSession();
  const currency = tenant?.settings?.currency || "UGX";

  const [batches, setBatches] = useState<Batch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<BatchFilter>("all");
  const [costingMethod, setCostingMethod] = useState<CostingMethod>("fifo");
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingBatch, setSavingBatch] = useState(false);
  const [batchError, setBatchError] = useState("");
  const [batchBarcodeInput, setBatchBarcodeInput] = useState("");

  const [newBatch, setNewBatch] = useState({
    batchNumber: "",
    receivedDate: new Date().toISOString().split("T")[0],
    notes: "",
    items: [
      {
        productId: "",
        quantity: "",
        costPrice: "",
        sellingPrice: "",
        expiryDate: "",
      },
    ],
  });

  const generateBatchNumber = () => {
    const date = new Date();
    const prefix = "BTH";
    const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${datePart}-${random}`;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const prodRes = await fetch("/api/products?limit=500");
      if (prodRes.ok) {
        const d = await prodRes.json();
        setProducts(d.products || []);
      }

      // Batches API may not exist yet — use local demo data
      try {
        const batchRes = await fetch("/api/batches?limit=100");
        if (batchRes.ok) {
          const d = await batchRes.json();
          setBatches(d.batches || []);
        }
      } catch {
        // API not available yet — keep empty
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredBatches = batches.filter((b) => {
    if (filter !== "all" && b.status !== filter) return false;
    if (
      search &&
      !b.batchNumber.toLowerCase().includes(search.toLowerCase()) &&
      !b.items.some((i) =>
        i.productName.toLowerCase().includes(search.toLowerCase()),
      )
    )
      return false;
    return true;
  });

  const totalBatches = batches.length;
  const activeBatches = batches.filter((b) => b.status === "active").length;
  const expiredBatches = batches.filter((b) => b.status === "expired").length;
  const totalBatchValue = batches.reduce(
    (sum, b) =>
      sum + b.items.reduce((s, i) => s + i.remainingQty * i.costPrice, 0),
    0,
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => Date.now(), [batches]);

  const addItemRow = () => {
    setNewBatch({
      ...newBatch,
      items: [
        ...newBatch.items,
        {
          productId: "",
          quantity: "",
          costPrice: "",
          sellingPrice: "",
          expiryDate: "",
        },
      ],
    });
  };

  const removeItemRow = (index: number) => {
    if (newBatch.items.length <= 1) return;
    setNewBatch({
      ...newBatch,
      items: newBatch.items.filter((_, i) => i !== index),
    });
  };

  const updateItemRow = (index: number, field: string, value: string) => {
    const updated = [...newBatch.items];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-fill cost/selling price from product
    if (field === "productId" && value) {
      const product = products.find((p) => p._id === value);
      if (product) {
        updated[index].costPrice = String(product.costPrice || "");
        updated[index].sellingPrice = String(product.price || "");
      }
    }

    setNewBatch({ ...newBatch, items: updated });
  };

  const openAdd = () => {
    setBatchError("");
    setNewBatch({
      batchNumber: generateBatchNumber(),
      receivedDate: new Date().toISOString().split("T")[0],
      notes: "",
      items: [
        {
          productId: "",
          quantity: "",
          costPrice: "",
          sellingPrice: "",
          expiryDate: "",
        },
      ],
    });
    setShowAddModal(true);
  };

  const saveBatch = async () => {
    const validItems = newBatch.items.filter((i) => i.productId && i.quantity);
    if (validItems.length === 0) {
      setBatchError("Add at least one batch item with a product and quantity.");
      return;
    }

    const payload = {
      batchNumber: newBatch.batchNumber,
      receivedDate: newBatch.receivedDate,
      notes: newBatch.notes,
      items: validItems.map((i) => {
        const product = products.find((p) => p._id === i.productId);
        return {
          productId: i.productId,
          productName: product?.name || "",
          quantity: parseInt(i.quantity) || 0,
          remainingQty: parseInt(i.quantity) || 0,
          costPrice: parseFloat(i.costPrice) || 0,
          sellingPrice: parseFloat(i.sellingPrice) || 0,
          expiryDate: i.expiryDate || undefined,
        };
      }),
      status: "active",
    };

    try {
      setSavingBatch(true);
      setBatchError("");

      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save batch");
      }

      setShowAddModal(false);
      setBatchError("");
      await fetchData();
    } catch (error) {
      setBatchError(
        error instanceof Error ? error.message : "Failed to save batch",
      );
    } finally {
      setSavingBatch(false);
    }
  };

  const handleBatchBarcodeScan = async () => {
    const value = batchBarcodeInput.trim();
    if (!value) return;

    const match = findBarcodeMatch(products, value);
    if (!match) {
      setBatchError(`No product matches barcode ${value}.`);
      void logBarcodeScanEvent({
        value,
        context: "batches",
        source: "scanner",
        module: "stock",
        scanAction: "not_found",
        result: "not_found",
      }).catch(() => {
        /* ignore */
      });
      return;
    }

    setNewBatch((prev) => {
      const nextItems = [...prev.items];
      const emptyIndex = nextItems.findIndex((item) => !item.productId);
      const targetIndex = emptyIndex >= 0 ? emptyIndex : nextItems.length;
      const nextItem = {
        productId: match.product._id,
        quantity:
          targetIndex < nextItems.length
            ? nextItems[targetIndex].quantity || "1"
            : "1",
        costPrice: String(match.product.costPrice || ""),
        sellingPrice: String(match.product.price || ""),
        expiryDate:
          targetIndex < nextItems.length
            ? nextItems[targetIndex].expiryDate
            : "",
      };

      if (targetIndex < nextItems.length) nextItems[targetIndex] = nextItem;
      else nextItems.push(nextItem);
      return { ...prev, items: nextItems };
    });

    setBatchBarcodeInput("");
    setBatchError("");
    void logBarcodeScanEvent({
      value,
      context: "batches",
      source: "scanner",
      module: "stock",
      scanAction: "batch_traceability_lookup",
      result: "found",
      productId: match.product._id,
      productName: match.product.name,
      productSku: match.product.sku,
    }).catch(() => {
      /* ignore */
    });
  };

  const viewBatchDetail = (batch: Batch) => {
    setSelectedBatch(batch);
    setViewMode("detail");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
      case "depleted":
        return "bg-gray-100 text-gray-600 ring-gray-600/20";
      case "expired":
        return "bg-red-50 text-red-600 ring-red-600/20";
      default:
        return "bg-gray-100 text-gray-600 ring-gray-600/20";
    }
  };

  const costingMethodLabel: Record<CostingMethod, string> = {
    fifo: "First In, First Out (FIFO)",
    lifo: "Last In, First Out (LIFO)",
    weighted_avg: "Weighted Average Cost",
  };

  // ──── SETTINGS VIEW ────
  if (viewMode === "settings") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode("list")}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              Batch & Costing Settings
            </h1>
            <p className="text-[13px] text-gray-400">
              Configure inventory costing method and batch rules
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">
            Inventory Costing Method
          </h3>
          <p className="text-sm text-gray-500 mb-5">
            Choose how the system calculates Cost of Goods Sold (COGS) when
            items are sold from different batches.
          </p>
          <div className="space-y-3">
            {(["fifo", "lifo", "weighted_avg"] as CostingMethod[]).map(
              (method) => (
                <button
                  key={method}
                  onClick={() => setCostingMethod(method)}
                  className={`w-full flex items-start gap-4 rounded-xl border p-4 text-left transition-all ${
                    costingMethod === method
                      ? "border-orange-300 bg-orange-50/50 ring-2 ring-orange-500/20"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      costingMethod === method
                        ? "border-orange-500"
                        : "border-gray-300"
                    }`}
                  >
                    {costingMethod === method && (
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      {costingMethodLabel[method]}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {method === "fifo" &&
                        "Oldest inventory is sold first. Best for perishable goods."}
                      {method === "lifo" &&
                        "Newest inventory is sold first. Useful in rising cost environments."}
                      {method === "weighted_avg" &&
                        "Average cost across all batches. Simplest for non-perishable items."}
                    </p>
                  </div>
                </button>
              ),
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Expiry Tracking</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-700">Auto-expire batches</p>
                <p className="text-sm text-gray-500">
                  Automatically mark batches as expired when their expiry date
                  passes
                </p>
              </div>
              <div className="w-12 h-7 bg-orange-500 rounded-full relative cursor-pointer">
                <div className="absolute right-0.5 top-0.5 w-6 h-6 bg-white rounded-full shadow-sm" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-700">Expiry warning days</p>
                <p className="text-sm text-gray-500">
                  Alert when batch is within this many days of expiry
                </p>
              </div>
              <input
                type="number"
                defaultValue={30}
                className="w-20 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/30"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ──── DETAIL VIEW ────
  if (viewMode === "detail" && selectedBatch) {
    const batch = selectedBatch;
    const batchValue = batch.items.reduce(
      (s, i) => s + i.remainingQty * i.costPrice,
      0,
    );
    const totalQty = batch.items.reduce((s, i) => s + i.quantity, 0);
    const remainingQty = batch.items.reduce((s, i) => s + i.remainingQty, 0);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setViewMode("list");
              setSelectedBatch(null);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-800">
              {batch.batchNumber}
            </h1>
            <p className="text-[13px] text-gray-400">
              Received{" "}
              {new Date(batch.receivedDate).toLocaleDateString("en-UG", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 capitalize ${getStatusColor(batch.status)}`}
          >
            {batch.status}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            {
              label: "Total Items",
              value: String(batch.items.length),
              icon: Package,
              gradient: "from-blue-500 to-indigo-600",
            },
            {
              label: "Original Qty",
              value: totalQty.toLocaleString(),
              icon: Hash,
              gradient: "from-purple-500 to-violet-600",
            },
            {
              label: "Remaining Qty",
              value: remainingQty.toLocaleString(),
              icon: Layers,
              gradient: "from-orange-500 to-amber-600",
            },
            {
              label: "Batch Value",
              value: formatCurrency(batchValue, currency),
              icon: DollarSign,
              gradient: "from-emerald-500 to-teal-600",
            },
          ].map((s, i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br ${s.gradient} shadow-md`}
                >
                  <s.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[12px] text-gray-400">{s.label}</p>
                  <p className="text-lg font-bold text-gray-800">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {batch.notes && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-2">Notes</h3>
            <p className="text-sm text-gray-600">{batch.notes}</p>
          </div>
        )}

        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="font-semibold text-gray-800">Batch Items</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-blue-100 bg-blue-50/60">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Product
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Original Qty
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Remaining
                  </th>
                  <th className="hidden sm:table-cell px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Cost Price
                  </th>
                  <th className="hidden md:table-cell px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Sell Price
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Margin
                  </th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Expiry
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {batch.items.map((item, i) => {
                  const margin =
                    item.sellingPrice > 0
                      ? ((item.sellingPrice - item.costPrice) /
                          item.sellingPrice) *
                        100
                      : 0;
                  const isExpiring =
                    item.expiryDate &&
                    new Date(item.expiryDate).getTime() - now <
                      30 * 24 * 60 * 60 * 1000;
                  return (
                    <tr
                      key={i}
                      className="transition-colors hover:bg-gray-50/60"
                    >
                      <td className="px-5 py-3 font-medium text-gray-800">
                        {item.productName}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-600">
                        {item.quantity}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className={`font-semibold ${item.remainingQty === 0 ? "text-gray-400" : item.remainingQty < item.quantity * 0.2 ? "text-amber-600" : "text-gray-800"}`}
                        >
                          {item.remainingQty}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell px-5 py-3 text-right text-gray-600">
                        {formatCurrency(item.costPrice, currency)}
                      </td>
                      <td className="hidden md:table-cell px-5 py-3 text-right text-gray-600">
                        {formatCurrency(item.sellingPrice, currency)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className={`text-xs font-semibold ${margin >= 30 ? "text-emerald-600" : margin >= 15 ? "text-amber-600" : "text-red-600"}`}
                        >
                          {margin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {item.expiryDate ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
                              isExpiring
                                ? "bg-amber-50 text-amber-600 ring-amber-600/20"
                                : "bg-gray-50 text-gray-600 ring-gray-200"
                            }`}
                          >
                            {isExpiring && (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                            {new Date(item.expiryDate).toLocaleDateString(
                              "en-UG",
                              {
                                month: "short",
                                day: "numeric",
                                year: "2-digit",
                              },
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ──── LIST VIEW (default) ────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/20">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Batch Tracking</h1>
            <p className="text-[13px] text-gray-400">
              Track inventory batches, expiry, and costing (
              {costingMethodLabel[costingMethod]})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode("settings")}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowUpDown className="h-4 w-4" /> Costing Settings
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg"
          >
            <Plus className="h-4 w-4" /> New Batch
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Batches",
            value: String(totalBatches),
            icon: Layers,
            gradient: "from-purple-500 to-violet-600",
            shadow: "shadow-purple-500/20",
          },
          {
            label: "Active Batches",
            value: String(activeBatches),
            icon: CheckCircle2,
            gradient: "from-emerald-500 to-teal-600",
            shadow: "shadow-emerald-500/20",
          },
          {
            label: "Expired",
            value: String(expiredBatches),
            icon: AlertTriangle,
            gradient: "from-red-500 to-rose-600",
            shadow: "shadow-red-500/20",
          },
          {
            label: "Total Value",
            value: formatCurrency(totalBatchValue, currency),
            icon: DollarSign,
            gradient: "from-orange-500 to-amber-600",
            shadow: "shadow-orange-500/20",
          },
        ].map((s, i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-lg hover:shadow-gray-200/50"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br ${s.gradient} shadow-md ${s.shadow}`}
              >
                <s.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[12px] text-gray-400">{s.label}</p>
                <p className="text-lg font-bold text-gray-800">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-50">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search batches or products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/30"
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
        <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-1.5 py-1">
          {(["all", "active", "depleted", "expired"] as BatchFilter[]).map(
            (f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                  filter === f
                    ? "bg-linear-to-r from-orange-500 to-amber-600 text-white shadow-sm"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {f}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Batches Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-purple-500" />
          </div>
        ) : filteredBatches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-blue-100 bg-blue-50/60">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Batch #
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Items
                  </th>
                  <th className="hidden sm:table-cell px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Received
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Total Qty
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Value
                  </th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Status
                  </th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredBatches.map((batch) => {
                  const batchQty = batch.items.reduce(
                    (s, i) => s + i.remainingQty,
                    0,
                  );
                  const batchVal = batch.items.reduce(
                    (s, i) => s + i.remainingQty * i.costPrice,
                    0,
                  );
                  return (
                    <tr
                      key={batch._id}
                      className="transition-colors hover:bg-gray-50/60"
                    >
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs font-semibold text-gray-800">
                          {batch.batchNumber}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="space-y-0.5">
                          {batch.items.slice(0, 2).map((item, i) => (
                            <p
                              key={i}
                              className="text-xs text-gray-600 truncate max-w-50"
                            >
                              {item.productName}
                            </p>
                          ))}
                          {batch.items.length > 2 && (
                            <p className="text-[11px] text-gray-400">
                              +{batch.items.length - 2} more
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-5 py-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          {new Date(batch.receivedDate).toLocaleDateString(
                            "en-UG",
                            { month: "short", day: "numeric", year: "numeric" },
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right text-gray-600">
                        {batchQty.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-800">
                        {formatCurrency(batchVal, currency)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ${getStatusColor(batch.status)}`}
                        >
                          {batch.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => viewBatchDetail(batch)}
                          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 mb-4">
              <Layers className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-700 mb-1">
              No batches found
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              {search || filter !== "all"
                ? "Try adjusting your filters"
                : "Create your first batch to start tracking inventory"}
            </p>
            {!search && filter === "all" && (
              <button
                onClick={openAdd}
                className="flex items-center gap-2 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-md"
              >
                <Plus className="h-4 w-4" /> Create First Batch
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Batch Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl mx-4">
            <button
              onClick={() => {
                setShowAddModal(false);
                setBatchError("");
              }}
              className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-bold text-gray-800 mb-1">New Batch</h2>
            <p className="text-sm text-gray-400 mb-5">
              Record a new inventory batch with product details
            </p>

            {batchError && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {batchError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Batch Number
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newBatch.batchNumber}
                    onChange={(e) =>
                      setNewBatch({ ...newBatch, batchNumber: e.target.value })
                    }
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/30"
                  />
                  <button
                    onClick={() =>
                      setNewBatch({
                        ...newBatch,
                        batchNumber: generateBatchNumber(),
                      })
                    }
                    className="rounded-xl border border-gray-200 p-2.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                    title="Generate new number"
                  >
                    <Tag className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Received Date
                </label>
                <input
                  type="date"
                  value={newBatch.receivedDate}
                  onChange={(e) =>
                    setNewBatch({ ...newBatch, receivedDate: e.target.value })
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/30"
                />
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Notes
              </label>
              <textarea
                value={newBatch.notes}
                onChange={(e) =>
                  setNewBatch({ ...newBatch, notes: e.target.value })
                }
                rows={2}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/30"
                placeholder="Optional batch notes..."
              />
            </div>

            {/* Items */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">
                  Batch Items
                </h3>
                <button
                  onClick={addItemRow}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Item
                </button>
              </div>
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-orange-100 bg-orange-50/60 p-3">
                <div className="flex min-w-60 flex-1 items-center gap-2 rounded-lg border border-orange-200 bg-white px-3 py-2">
                  <BarcodeIcon className="h-4 w-4 text-orange-500" />
                  <input
                    value={batchBarcodeInput}
                    onChange={(event) =>
                      setBatchBarcodeInput(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleBatchBarcodeScan();
                      }
                    }}
                    placeholder="Scan barcode to add product to this batch"
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
                <button
                  onClick={() => void handleBatchBarcodeScan()}
                  className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-600"
                >
                  Add By Barcode
                </button>
              </div>
              <div className="space-y-3">
                {newBatch.items.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-gray-200 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-400">
                        Item {index + 1}
                      </span>
                      {newBatch.items.length > 1 && (
                        <button
                          onClick={() => removeItemRow(index)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <select
                          value={item.productId}
                          onChange={(e) =>
                            updateItemRow(index, "productId", e.target.value)
                          }
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/30"
                        >
                          <option value="">Select product...</option>
                          {products.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.name} ({p.sku})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItemRow(index, "quantity", e.target.value)
                          }
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/30"
                          placeholder="0"
                          min={1}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">
                          Expiry Date
                        </label>
                        <input
                          type="date"
                          value={item.expiryDate}
                          onChange={(e) =>
                            updateItemRow(index, "expiryDate", e.target.value)
                          }
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/30"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">
                          Cost Price
                        </label>
                        <input
                          type="number"
                          value={item.costPrice}
                          onChange={(e) =>
                            updateItemRow(index, "costPrice", e.target.value)
                          }
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/30"
                          placeholder="0"
                          min={0}
                          step={0.01}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">
                          Selling Price
                        </label>
                        <input
                          type="number"
                          value={item.sellingPrice}
                          onChange={(e) =>
                            updateItemRow(index, "sellingPrice", e.target.value)
                          }
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/30"
                          placeholder="0"
                          min={0}
                          step={0.01}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setBatchError("");
                }}
                className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveBatch}
                disabled={
                  savingBatch ||
                  !newBatch.batchNumber ||
                  newBatch.items.every((i) => !i.productId || !i.quantity)
                }
                className="flex-1 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingBatch ? "Saving..." : "Save Batch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
