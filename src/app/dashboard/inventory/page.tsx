"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  Tag,
  X,
  ChevronLeft,
  ChevronRight,
  Layers,
  ImagePlus,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useSession } from "../layout";

interface Product {
  _id: string;
  name: string;
  sku: string;
  barcode: string;
  price: number;
  costPrice: number;
  categoryId?: { _id: string; name: string };
  isActive: boolean;
  trackStock: boolean;
  unit: string;
  taxRate: number;
  description: string;
  image?: string;
  stock?: number;
}

interface Category {
  _id: string;
  name: string;
  slug: string;
}

export default function InventoryPage() {
  const { tenant } = useSession();
  const currency = tenant?.settings?.currency || "UGX";
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [stockFilter, setStockFilter] = useState<
    "all" | "in-stock" | "low" | "out"
  >("all");

  const [form, setForm] = useState({
    name: "",
    sku: "",
    barcode: "",
    price: "",
    costPrice: "",
    categoryId: "",
    description: "",
    unit: "pcs",
    taxRate: "0",
    trackStock: true,
    image: "",
    reorderLevel: "",
    maxStockLevel: "",
  });
  const [catForm, setCatForm] = useState({
    name: "",
    slug: "",
    description: "",
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "20",
      ...(search && { search }),
      ...(filterCategory && { category: filterCategory }),
    });
    try {
      const res = await fetch(`/api/products?${params}`);
      if (res.ok) {
        const d = await res.json();
        setProducts(d.products || []);
        setTotal(d.total || 0);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [page, search, filterCategory]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) setCategories(await res.json());
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openAdd = () => {
    setEditing(null);
    const rand = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    setForm({
      name: "",
      sku: `SKU-${rand}`,
      barcode: Math.floor(Math.random() * 9e12 + 1e12).toString(),
      price: "",
      costPrice: "",
      categoryId: "",
      description: "",
      unit: "pcs",
      taxRate: "0",
      trackStock: true,
      image: "",
      reorderLevel: "",
      maxStockLevel: "",
    });
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      price: p.price.toString(),
      costPrice: p.costPrice.toString(),
      categoryId: p.categoryId?._id || "",
      description: p.description,
      unit: p.unit,
      taxRate: p.taxRate.toString(),
      trackStock: p.trackStock,
      image: p.image || "",
      reorderLevel: "",
      maxStockLevel: "",
    });
    setShowModal(true);
  };

  const saveProduct = async () => {
    const slug = form.name
      .toLowerCase()
      .replace(/[^\w ]+/g, "")
      .replace(/ +/g, "-");
    const payload = {
      ...form,
      slug,
      price: parseFloat(form.price) || 0,
      costPrice: parseFloat(form.costPrice) || 0,
      taxRate: parseFloat(form.taxRate) || 0,
      image: form.image || undefined,
      reorderLevel: form.reorderLevel ? parseInt(form.reorderLevel) : undefined,
      maxStockLevel: form.maxStockLevel
        ? parseInt(form.maxStockLevel)
        : undefined,
    };
    const url = editing ? `/api/products/${editing._id}` : "/api/products";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setShowModal(false);
      fetchProducts();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to save product");
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) fetchProducts();
  };

  const saveCategory = async () => {
    const slug = catForm.name
      .toLowerCase()
      .replace(/[^\w ]+/g, "")
      .replace(/ +/g, "-");
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...catForm, slug }),
    });
    if (res.ok) {
      setShowCatModal(false);
      setCatForm({ name: "", slug: "", description: "" });
      fetchCategories();
    }
  };

  const totalPages = Math.ceil(total / 20);

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
            <p className="text-[13px] text-gray-500">
              Manage your products and categories
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCatModal(true)}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow"
          >
            <Tag className="h-4 w-4" /> Categories
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg hover:shadow-orange-500/30"
          >
            <Plus className="h-4 w-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search products by name, SKU, or barcode..."
            className="w-full rounded-xl border border-gray-200 bg-white px-10 py-2.5 text-sm shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        {/* Stock Level Filter */}
        <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1">
          {(
            [
              { key: "all", label: "All" },
              { key: "in-stock", label: "In Stock" },
              { key: "low", label: "Low Stock" },
              { key: "out", label: "Out of Stock" },
            ] as { key: typeof stockFilter; label: string }[]
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setStockFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                stockFilter === f.key
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {(search || filterCategory || stockFilter !== "all") && (
          <button
            onClick={() => {
              setSearch("");
              setFilterCategory("");
              setStockFilter("all");
              setPage(1);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        )}
      </div>

      {/* Products Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-100 bg-blue-50/60">
                <th className="px-5 py-3.5 text-left text-[13px] font-semibold text-gray-600">
                  Product
                </th>
                <th className="px-5 py-3.5 text-left text-[13px] font-semibold text-gray-600">
                  SKU
                </th>
                <th className="px-5 py-3.5 text-left text-[13px] font-semibold text-gray-600">
                  Category
                </th>
                <th className="px-5 py-3.5 text-right text-[13px] font-semibold text-gray-600">
                  Cost
                </th>
                <th className="px-5 py-3.5 text-right text-[13px] font-semibold text-gray-600">
                  Price
                </th>
                <th className="px-5 py-3.5 text-right text-[13px] font-semibold text-gray-600">
                  Quantity
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
                      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-blue-500" />
                      <span className="text-sm text-gray-400">
                        Loading products...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="font-medium text-gray-500">
                        No products found
                      </p>
                      <p className="text-[13px] text-gray-400">
                        Add your first product to get started
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr
                    key={p._id}
                    className="group transition-colors hover:bg-gray-50/80"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {p.image ? (
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden border border-gray-100">
                            <img
                              src={p.image}
                              alt={p.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gray-100 to-gray-200">
                            <Package className="h-4 w-4 text-gray-500" />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-gray-900">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            {p.barcode}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-lg bg-gray-100 px-2 py-1 font-mono text-xs font-semibold text-gray-600">
                        {p.sku}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {p.categoryId?.name ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-600/10">
                          <Layers className="h-3 w-3" /> {p.categoryId.name}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-500">
                      {formatCurrency(p.costPrice, currency)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-gray-900">
                      {formatCurrency(p.price, currency)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          (p.stock ?? 0) === 0
                            ? "bg-red-50 text-red-700 ring-1 ring-red-600/20"
                            : (p.stock ?? 0) <= 10
                              ? "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20"
                              : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                        }`}
                      >
                        {p.stock ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          p.isActive
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                            : "bg-red-50 text-red-700 ring-1 ring-red-600/20"
                        }`}
                      >
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => openEdit(p)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteProduct(p._id)}
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
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3.5">
            <span className="text-[13px] text-gray-500">
              Showing{" "}
              <span className="font-medium text-gray-700">
                {(page - 1) * 20 + 1}
              </span>
              –
              <span className="font-medium text-gray-700">
                {Math.min(page * 20, total)}
              </span>{" "}
              of <span className="font-medium text-gray-700">{total}</span>
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              {Array.from(
                { length: Math.min(totalPages, 5) },
                (_, i) => i + 1,
              ).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${page === p ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}
                >
                  {p}
                </button>
              ))}
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

      {/* Product Modal */}
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
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/20">
                  <Package className="h-4 w-4 text-white" />
                </div>
                <h2 className="font-bold text-gray-900">
                  {editing ? "Edit Product" : "Add Product"}
                </h2>
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
                    Name *
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[13px] font-semibold text-gray-700">
                      SKU *
                    </label>
                    <input
                      value={form.sku}
                      onChange={(e) =>
                        setForm({ ...form, sku: e.target.value })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-semibold text-gray-700">
                      Barcode
                    </label>
                    <input
                      value={form.barcode}
                      onChange={(e) =>
                        setForm({ ...form, barcode: e.target.value })
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[13px] font-semibold text-gray-700">
                      Cost Price
                    </label>
                    <input
                      type="number"
                      value={form.costPrice}
                      onChange={(e) =>
                        setForm({ ...form, costPrice: e.target.value })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-[13px] font-semibold text-gray-700">
                      Selling Price *
                    </label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) =>
                        setForm({ ...form, price: e.target.value })
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[13px] font-semibold text-gray-700">
                      Category
                    </label>
                    <div className="flex gap-2 mt-1.5">
                      <select
                        value={form.categoryId}
                        onChange={(e) =>
                          setForm({ ...form, categoryId: e.target.value })
                        }
                        className="flex-1 rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      >
                        <option value="">Select category</option>
                        {categories.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowCatModal(true)}
                        className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-orange-600 transition-colors"
                        title="Add new category"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[13px] font-semibold text-gray-700">
                      Unit
                    </label>
                    <select
                      value={form.unit}
                      onChange={(e) =>
                        setForm({ ...form, unit: e.target.value })
                      }
                      className={inputClass}
                    >
                      <option value="pcs">Pieces</option>
                      <option value="kg">Kilograms</option>
                      <option value="litre">Litres</option>
                      <option value="box">Boxes</option>
                      <option value="pack">Packs</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-gray-700">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    value={form.taxRate}
                    onChange={(e) =>
                      setForm({ ...form, taxRate: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[13px] font-semibold text-gray-700">
                      Reorder Level
                    </label>
                    <input
                      type="number"
                      value={form.reorderLevel}
                      onChange={(e) =>
                        setForm({ ...form, reorderLevel: e.target.value })
                      }
                      placeholder="e.g. 10"
                      className={inputClass}
                    />
                    <p className="mt-1 text-[11px] text-gray-400">
                      Alert when stock falls below
                    </p>
                  </div>
                  <div>
                    <label className="text-[13px] font-semibold text-gray-700">
                      Max Stock Level
                    </label>
                    <input
                      type="number"
                      value={form.maxStockLevel}
                      onChange={(e) =>
                        setForm({ ...form, maxStockLevel: e.target.value })
                      }
                      placeholder="e.g. 500"
                      className={inputClass}
                    />
                    <p className="mt-1 text-[11px] text-gray-400">
                      Maximum stock capacity
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-gray-700">
                    Product Image
                  </label>
                  <div className="mt-1.5 flex items-center gap-4">
                    {form.image ? (
                      <div className="relative h-20 w-20 rounded-xl overflow-hidden border border-gray-200">
                        <img
                          src={form.image}
                          alt="Product"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, image: "" })}
                          className="absolute top-1 right-1 rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
                        <ImagePlus className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="text"
                        value={form.image}
                        onChange={(e) =>
                          setForm({ ...form, image: e.target.value })
                        }
                        placeholder="Paste image URL"
                        className={inputClass}
                      />
                      <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                        <ImagePlus className="h-3.5 w-3.5" />
                        Upload File
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setForm({
                                  ...form,
                                  image: reader.result as string,
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    rows={2}
                    className={inputClass}
                  />
                </div>
                <label className="flex items-center gap-2.5 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.trackStock}
                    onChange={(e) =>
                      setForm({ ...form, trackStock: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  Track stock for this product
                </label>
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
                onClick={saveProduct}
                className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg"
              >
                {editing ? "Update" : "Create"} Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCatModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowCatModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-md shadow-violet-500/20">
                  <Tag className="h-4 w-4 text-white" />
                </div>
                <h2 className="font-bold text-gray-900">Categories</h2>
              </div>
              <button
                onClick={() => setShowCatModal(false)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="mb-4 space-y-2">
                {categories.map((c) => (
                  <div
                    key={c._id}
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-gradient-to-r from-orange-400 to-amber-500" />
                      <span className="text-sm font-semibold text-gray-700">
                        {c.name}
                      </span>
                    </div>
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                      {c.slug}
                    </span>
                  </div>
                ))}
                {categories.length === 0 && (
                  <div className="flex flex-col items-center gap-1 py-6 text-center">
                    <Tag className="h-6 w-6 text-gray-300" />
                    <p className="text-sm text-gray-400">No categories yet</p>
                  </div>
                )}
              </div>
              <div className="border-t border-gray-100 pt-4">
                <h3 className="mb-3 text-[13px] font-semibold text-gray-700">
                  Add Category
                </h3>
                <div className="space-y-2.5">
                  <input
                    value={catForm.name}
                    onChange={(e) =>
                      setCatForm({ ...catForm, name: e.target.value })
                    }
                    placeholder="Category name"
                    className={inputClass}
                  />
                  <input
                    value={catForm.description}
                    onChange={(e) =>
                      setCatForm({ ...catForm, description: e.target.value })
                    }
                    placeholder="Description (optional)"
                    className={inputClass}
                  />
                  <button
                    onClick={saveCategory}
                    disabled={!catForm.name}
                    className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg disabled:opacity-50 disabled:shadow-none"
                  >
                    Add Category
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
