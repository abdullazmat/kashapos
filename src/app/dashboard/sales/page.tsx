"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  TrendingUp,
  Eye,
  Calendar,
  X,
  Banknote,
  CreditCard,
  Smartphone,
  ArrowUpRight,
  ShoppingCart,
  Filter,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Save,
  Trash2,
  Plus,
  Search,
  Download,
  Package,
  User,
  CheckCircle,
  Clock,
  Info,
} from "lucide-react";
import {
  formatCurrency,
  formatDateTime,
  formatDate,
  printHtml,
} from "@/lib/utils";
import { useSession } from "../layout";

interface SaleItem {
  productId?: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
}

interface Sale {
  _id: string;
  orderNumber: string;
  customerId?: { _id: string; name: string; phone: string };
  walkInName?: string;
  walkInPhone?: string;
  cashierId?: { name: string };
  items: SaleItem[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  total: number;
  remainingBalance: number;
  paymentMethod: string;
  status: string;
  notes: string;
  createdAt: string;
}

interface ProductOption {
  _id: string;
  name: string;
  sku: string;
  price: number;
  hasVariants?: boolean;
  variants?: {
    name: string;
    sku: string;
    price: number;
    stock: number;
  }[];
}

interface CustomerOption {
  _id: string;
  name: string;
  phone: string;
  outstandingBalance?: number;
  creditLimit?: number;
  paymentStatus?: "cleared" | "partial" | "overdue";
}

interface BranchOption {
  _id: string;
  name: string;
}

interface OrderItem {
  lineKey: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
}

const inputClass =
  "mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20";

export default function SalesPage() {
  const { tenant } = useSession();
  const currency = tenant?.settings?.currency || "UGX";
  const supportedCurrencies = new Set([
    "UGX",
    "USD",
    "KES",
    "EUR",
    "GBP",
    "TZS",
    "RWF",
    "NGN",
    "ZAR",
    "GHS",
  ]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewSale, setViewSale] = useState<Sale | null>(null);
  const [selectedStatus, setSelectedStatus] = useState("completed");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [pageError, setPageError] = useState("");

  // Create Sales Order state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderCustomer, setOrderCustomer] = useState("");
  const [orderBranch, setOrderBranch] = useState("");
  const [orderPaymentMethod, setOrderPaymentMethod] = useState("cash");
  const [orderAmountPaid, setOrderAmountPaid] = useState("");
  const [orderDueDate, setOrderDueDate] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [orderStatus, setOrderStatus] = useState<"completed" | "pending">(
    "completed",
  );
  const [orderWalkInName, setOrderWalkInName] = useState("");
  const [orderWalkInPhone, setOrderWalkInPhone] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [showOrderCustomerModal, setShowOrderCustomerModal] = useState(false);
  const [creatingOrderCustomer, setCreatingOrderCustomer] = useState(false);
  const [newOrderCustomerName, setNewOrderCustomerName] = useState("");
  const [newOrderCustomerPhone, setNewOrderCustomerPhone] = useState("");
  const [newOrderCustomerEmail, setNewOrderCustomerEmail] = useState("");
  const [quickFilter, setQuickFilter] = useState<"all" | "today" | "custom">(
    "all",
  );

  const fetchSales = useCallback(async () => {
    setLoading(true);
    setPageError("");
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "20",
      ...(statusFilter && { status: statusFilter }),
      ...(fromDate && { from: fromDate }),
      ...(toDate && { to: toDate }),
    });
    try {
      const res = await fetch(`/api/sales?${params}`);
      if (res.ok) {
        const d = await res.json();
        setSales(d.sales || []);
        setTotal(d.total || 0);
      } else {
        const payload = await res.json();
        setPageError(payload.error || "Failed to load sales");
      }
    } catch (err) {
      console.error(err);
      setPageError("Failed to load sales");
    }
    setLoading(false);
  }, [page, statusFilter, fromDate, toDate]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  useEffect(() => {
    if (!viewSale) return;
    setSelectedStatus(viewSale.status);
    setActionError("");
  }, [viewSale]);

  const fetchFormData = useCallback(async () => {
    try {
      const [prodRes, custRes, branchRes] = await Promise.all([
        fetch("/api/products?limit=500"),
        fetch("/api/customers?limit=500"),
        fetch("/api/branches"),
      ]);
      if (prodRes.ok) {
        const d = await prodRes.json();
        setProducts(d.products || d.data || d || []);
      }
      if (custRes.ok) {
        const d = await custRes.json();
        setCustomers(d.customers || d.data || d || []);
      }
      if (branchRes.ok) {
        const d = await branchRes.json();
        setBranches(d.data || d || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const openCreateModal = () => {
    setOrderItems([]);
    setOrderCustomer("");
    setOrderBranch(branches[0]?._id || "");
    setOrderPaymentMethod("cash");
    setOrderAmountPaid("");
    setOrderDueDate("");
    setOrderNotes("");
    setOrderStatus("completed");
    setOrderWalkInName("");
    setOrderWalkInPhone("");
    setOrderError("");
    setProductSearch("");
    setShowOrderCustomerModal(false);
    setNewOrderCustomerName("");
    setNewOrderCustomerPhone("");
    setNewOrderCustomerEmail("");
    fetchFormData();
    setShowCreateModal(true);
  };

  const addProduct = (
    p: ProductOption,
    variant?: { name: string; sku: string; price: number; stock: number },
  ) => {
    const lineKey = `${p._id}:${variant?.sku || "base"}`;
    const resolvedName = variant ? `${p.name} - ${variant.name}` : p.name;
    const resolvedSku = variant?.sku || p.sku;
    const resolvedPrice = variant?.price ?? p.price;

    const existing = orderItems.find((i) => i.lineKey === lineKey);
    if (existing) {
      setOrderItems(
        orderItems.map((i) =>
          i.lineKey === lineKey
            ? {
                ...i,
                quantity: i.quantity + 1,
                total: (i.quantity + 1) * i.unitPrice,
              }
            : i,
        ),
      );
    } else {
      setOrderItems([
        ...orderItems,
        {
          lineKey,
          productId: p._id,
          productName: resolvedName,
          sku: resolvedSku,
          quantity: 1,
          unitPrice: resolvedPrice,
          discount: 0,
          tax: 0,
          total: resolvedPrice,
        },
      ]);
    }
    setProductSearch("");
  };

  const updateItemQty = (idx: number, qty: number) => {
    if (qty < 1) return;
    setOrderItems(
      orderItems.map((item, i) =>
        i === idx
          ? { ...item, quantity: qty, total: qty * item.unitPrice }
          : item,
      ),
    );
  };

  const removeItem = (idx: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== idx));
  };

  async function quickCreateOrderCustomer() {
    if (!newOrderCustomerName.trim() || creatingOrderCustomer) return;
    setCreatingOrderCustomer(true);
    setOrderError("");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newOrderCustomerName.trim(),
          phone: newOrderCustomerPhone.trim(),
          email: newOrderCustomerEmail.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOrderError(data.error || "Failed to create customer");
        return;
      }

      const created = data.customer || data;
      setCustomers((prev) => [created, ...prev]);
      setOrderCustomer(created._id);
      setOrderWalkInName("");
      setOrderWalkInPhone("");
      setShowOrderCustomerModal(false);
      setNewOrderCustomerName("");
      setNewOrderCustomerPhone("");
      setNewOrderCustomerEmail("");
    } catch {
      setOrderError("Failed to create customer");
    } finally {
      setCreatingOrderCustomer(false);
    }
  }

  const orderSubtotal = useMemo(
    () => orderItems.reduce((s, i) => s + i.total, 0),
    [orderItems],
  );
  const orderTax = useMemo(
    () => orderItems.reduce((s, i) => s + i.tax, 0),
    [orderItems],
  );
  const orderTotal = orderSubtotal + orderTax;

  const saveOrder = async () => {
    const validateOrder = () => {
      const errors: string[] = [];

      if (orderItems.length === 0) {
        errors.push("Add at least one item");
      }
      if (!orderBranch) {
        errors.push("Select a store/branch");
      }
      if (!orderCustomer && !orderWalkInName.trim()) {
        errors.push("Enter walk-in name or select an existing customer");
      }

      // Issue #1: Walk-in + Credit block
      if (orderPaymentMethod === "credit" && !orderCustomer) {
        errors.push("Credit sales require a saved customer profile");
      }

      // Issue #3: Backdated due date block
      if (orderPaymentMethod === "credit" && !orderDueDate) {
        errors.push("Select a due date for credit sales");
      }
      if (orderDueDate) {
        const selected = new Date(orderDueDate);
        const today = new Date();
        selected.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        if (selected < today) {
          errors.push("Due date cannot be in the past");
        }
      }

      // Issue #2: Currency support guard
      if (!supportedCurrencies.has(String(currency).toUpperCase())) {
        errors.push("Selected currency is not supported");
      }

      if (errors.length > 0) {
        setOrderError(errors.join(" "));
        return false;
      }

      return true;
    };

    if (!validateOrder()) return;

    const parsedInputAmount = Number.parseFloat(orderAmountPaid);
    const parsedAmountPaid = Number.isFinite(parsedInputAmount)
      ? Math.max(0, parsedInputAmount)
      : orderPaymentMethod === "credit"
        ? 0
        : orderTotal;

    const remainingBalance = Math.max(0, orderTotal - parsedAmountPaid);

    if (remainingBalance > 0 && !orderCustomer) {
      setOrderError(
        "Balance sales require a saved customer. Create/select one for credit tracking.",
      );
      return;
    }

    setSavingOrder(true);
    setOrderError("");
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: orderBranch,
          customerId: orderCustomer || undefined,
          items: orderItems.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            sku: i.sku,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discount: i.discount,
            tax: i.tax,
            total: i.total,
          })),
          paymentMethod: orderPaymentMethod,
          amountPaid: parsedAmountPaid,
          status:
            orderPaymentMethod === "credit" || remainingBalance > 0
              ? "pending"
              : orderStatus,
          ...(orderDueDate && { dueDate: orderDueDate }),
          notes: orderNotes,
          ...(orderCustomer
            ? {}
            : {
                walkInName: orderWalkInName.trim(),
                walkInPhone: orderWalkInPhone.trim(),
              }),
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        fetchSales();
      } else {
        const d = await res.json();
        setOrderError(d.error || "Failed to create order");
      }
    } catch {
      setOrderError("Failed to create order");
    } finally {
      setSavingOrder(false);
    }
  };

  async function updateSaleStatus() {
    if (!viewSale || actionLoading || selectedStatus === viewSale.status)
      return;
    setActionLoading(true);
    setActionError("");
    try {
      const res = await fetch(`/api/sales/${viewSale._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selectedStatus }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setActionError(payload.error || "Failed to update sale");
        return;
      }
      setViewSale((c) =>
        c ? { ...c, status: payload.sale?.status || selectedStatus } : c,
      );
      await fetchSales();
    } catch {
      setActionError("Failed to update sale");
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteSale() {
    if (!viewSale || actionLoading) return;
    setActionLoading(true);
    setActionError("");
    try {
      const res = await fetch(`/api/sales/${viewSale._id}`, {
        method: "DELETE",
      });
      const payload = await res.json();
      if (!res.ok) {
        setActionError(payload.error || "Failed to delete sale");
        return;
      }
      setViewSale(null);
      await fetchSales();
    } catch {
      setActionError("Failed to delete sale");
    } finally {
      setActionLoading(false);
    }
  }

  const totalPages = Math.ceil(total / 20);

  const stats = useMemo(() => {
    const completed = sales.filter((s) => s.status === "completed");
    const pending = sales.filter((s) => s.status === "pending");
    const totalRevenue = completed.reduce((a, s) => a + s.total, 0);
    return {
      totalRevenue,
      completedCount: completed.length,
      pendingCount: pending.length,
      totalCount: total,
    };
  }, [sales, total]);

  const filteredSales = useMemo(() => {
    if (!searchQuery.trim()) return sales;
    const q = searchQuery.toLowerCase();
    return sales.filter(
      (s) =>
        s.orderNumber.toLowerCase().includes(q) ||
        (s.customerId?.name || "").toLowerCase().includes(q) ||
        s.items.some((i) => i.productName.toLowerCase().includes(q)),
    );
  }, [sales, searchQuery]);

  const statusColor: Record<string, string> = {
    completed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
    pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
    refunded: "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20",
    voided: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
  };

  const paymentIcon: Record<string, React.ReactNode> = {
    cash: <Banknote className="h-3.5 w-3.5" />,
    card: <CreditCard className="h-3.5 w-3.5" />,
    mobile_money: <Smartphone className="h-3.5 w-3.5" />,
    split: <Receipt className="h-3.5 w-3.5" />,
    credit: <CreditCard className="h-3.5 w-3.5" />,
  };
  const paymentLabel: Record<string, string> = {
    cash: "Cash",
    card: "Card",
    mobile_money: "Mobile Money",
    split: "Split",
    credit: "Credit",
    bank_transfer: "Bank Transfer",
  };

  const handleQuickFilter = (f: "all" | "today" | "custom") => {
    setQuickFilter(f);
    if (f === "today") {
      const today = new Date().toISOString().split("T")[0];
      setFromDate(today);
      setToDate(today);
    } else if (f === "all") {
      setFromDate("");
      setToDate("");
    }
    setPage(1);
  };

  const variantSearchResults = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return [];

    const rows: Array<{
      key: string;
      label: string;
      sku: string;
      price: number;
      parent: ProductOption;
      variant?: { name: string; sku: string; price: number; stock: number };
      stockText: string;
    }> = [];

    for (const product of products) {
      const baseMatches =
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query);

      if (baseMatches) {
        rows.push({
          key: `${product._id}:base`,
          label: product.name,
          sku: product.sku,
          price: product.price,
          parent: product,
          stockText: "",
        });
      }

      if (product.hasVariants && product.variants?.length) {
        for (const variant of product.variants) {
          const variantMatches =
            variant.name.toLowerCase().includes(query) ||
            variant.sku.toLowerCase().includes(query) ||
            product.name.toLowerCase().includes(query);
          if (!variantMatches) continue;
          rows.push({
            key: `${product._id}:${variant.sku}`,
            label: `${product.name} - ${variant.name}`,
            sku: variant.sku,
            price: variant.price,
            parent: product,
            variant,
            stockText: `Stock ${variant.stock}`,
          });
        }
      }
    }

    return rows.slice(0, 20);
  }, [productSearch, products]);

  const selectedOrderCustomer = customers.find((c) => c._id === orderCustomer);
  const isWalkInOrder = !orderCustomer;

  const getSaleCustomerName = (sale: Sale) => {
    if (sale.customerId?.name) return sale.customerId.name;
    if (sale.walkInName) return sale.walkInName;
    return "Walk-in Customer";
  };

  const getSaleCustomerPhone = (sale: Sale) => {
    if (sale.customerId?.phone) return sale.customerId.phone;
    return sale.walkInPhone || "";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/20">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Sales Orders</h1>
            <p className="text-[13px] text-gray-400">
              Track and manage all sales transactions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const csv = ["Order,Customer,Items,Total,Payment,Status,Date"]
                .concat(
                  sales.map(
                    (s) =>
                      `${s.orderNumber},"${getSaleCustomerName(s)}",${s.items.length},${s.total},${s.paymentMethod},${s.status},${s.createdAt}`,
                  ),
                )
                .join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "sales-orders.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            onClick={() => {
              const rows = sales
                .map(
                  (s) => `
                    <tr>
                      <td>${s.orderNumber}</td>
                        <td>${getSaleCustomerName(s)}</td>
                      <td>${s.items.length}</td>
                      <td>${formatCurrency(s.total, currency)}</td>
                      <td>${s.paymentMethod}</td>
                      <td>${s.status}</td>
                      <td>${formatDate(s.createdAt)}</td>
                    </tr>
                  `,
                )
                .join("");

              printHtml(
                "Sales Orders",
                `<div class="receipt" style="max-width:100%"><h2>Sales Orders</h2><p class="muted">Generated ${new Date().toLocaleString()}</p><table><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table></div>`,
              );
            }}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50"
          >
            <Receipt className="h-4 w-4" /> Export PDF
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 hover:shadow-lg"
          >
            <Plus className="h-4 w-4" /> New Order
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: "Total Orders",
            value: stats.totalCount.toString(),
            icon: ShoppingCart,
            gradient: "from-orange-500 to-amber-600",
            shadow: "shadow-orange-500/20",
          },
          {
            label: "Completed",
            value: stats.completedCount.toString(),
            icon: CheckCircle,
            gradient: "from-emerald-500 to-green-600",
            shadow: "shadow-emerald-500/20",
          },
          {
            label: "Pending",
            value: stats.pendingCount.toString(),
            icon: Clock,
            gradient: "from-amber-500 to-orange-500",
            shadow: "shadow-amber-500/20",
          },
          {
            label: "Total Revenue",
            value: formatCurrency(stats.totalRevenue, currency),
            icon: TrendingUp,
            gradient: "from-violet-500 to-purple-600",
            shadow: "shadow-violet-500/20",
          },
        ].map((card) => (
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

      {/* Quick Filters + Search */}
      {pageError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
          {(["all", "today", "custom"] as const).map((f) => (
            <button
              key={f}
              onClick={() => handleQuickFilter(f)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all ${quickFilter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              {f === "all" ? "All" : f === "today" ? "Today" : "Custom"}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search orders…"
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-9 pr-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        >
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="refunded">Refunded</option>
          <option value="voided">Voided</option>
        </select>
        {quickFilter === "custom" && (
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-1.5">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-sm outline-none"
            />
            <span className="text-xs text-gray-300">—</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-sm outline-none"
            />
          </div>
        )}
        {(statusFilter || fromDate || toDate || searchQuery) && (
          <button
            onClick={() => {
              setStatusFilter("");
              setFromDate("");
              setToDate("");
              setSearchQuery("");
              setPage(1);
              setQuickFilter("all");
            }}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Sales Table - expanded columns */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-100 bg-blue-50/60">
                <th className="px-4 py-3.5 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                  Order Details
                </th>
                <th className="px-4 py-3.5 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                  Customer
                </th>
                <th className="px-4 py-3.5 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                  Item Details
                </th>
                <th className="px-4 py-3.5 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                  Financial
                </th>
                <th className="px-4 py-3.5 text-right text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                  Balance
                </th>
                <th className="px-4 py-3.5 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                  Payment
                </th>
                <th className="px-4 py-3.5 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                  Date
                </th>
                <th className="px-4 py-3.5 text-center text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                  Actions
                </th>
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
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                        <TrendingUp className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="font-medium text-gray-500">
                        No orders found
                      </p>
                      <p className="text-[13px] text-gray-400">
                        Try adjusting your filters or create a new order
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => (
                  <tr
                    key={s._id}
                    className="group transition-colors hover:bg-gray-50/80"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <span className="rounded-lg bg-gray-100 px-2 py-1 font-mono text-xs font-semibold text-gray-700">
                          {s.orderNumber}
                        </span>
                        <p className="mt-1 text-[11px] text-gray-400">
                          {s.cashierId?.name || "—"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200 text-[10px] font-bold text-gray-500">
                          {getSaleCustomerName(s)[0]}
                        </div>
                        <div>
                          <span className="text-gray-700 text-[13px] font-medium">
                            {getSaleCustomerName(s)}
                          </span>
                          {getSaleCustomerPhone(s) && (
                            <p className="text-[11px] text-gray-400">
                              {getSaleCustomerPhone(s)}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[13px] text-gray-700">
                        {s.items.length} item{s.items.length !== 1 ? "s" : ""}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate max-w-[150px]">
                        {s.items.map((i) => i.productName).join(", ")}
                      </p>
                    </td>
                    <td className="relative px-4 py-3 text-right">
                      <div className="group/fin inline-flex items-center justify-end gap-1.5">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(s.total, currency)}
                        </p>
                        <Info className="h-3.5 w-3.5 text-gray-300" />
                        <div className="pointer-events-none invisible absolute z-10 w-52 -translate-x-2 translate-y-7 rounded-lg border border-gray-200 bg-white p-2 text-left text-[11px] text-gray-600 shadow-lg group-hover/fin:visible">
                          <p>
                            Subtotal: {formatCurrency(s.subtotal, currency)}
                          </p>
                          <p>
                            Discount:{" "}
                            {formatCurrency(s.totalDiscount || 0, currency)}
                          </p>
                          <p>
                            Tax: {formatCurrency(s.totalTax || 0, currency)}
                          </p>
                        </div>
                      </div>
                      {s.totalDiscount > 0 && (
                        <p className="text-[11px] text-red-500">
                          -{formatCurrency(s.totalDiscount, currency)} disc
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`text-[13px] font-semibold ${s.remainingBalance > 0 ? "text-red-600" : "text-gray-400"}`}
                      >
                        {s.remainingBalance > 0
                          ? formatCurrency(s.remainingBalance, currency)
                          : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        {paymentIcon[s.paymentMethod]}
                        <span className="text-[13px]">
                          {paymentLabel[s.paymentMethod] || s.paymentMethod}
                        </span>
                      </div>
                      <span
                        className={`inline-flex mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusColor[s.status] || ""}`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-[13px]">
                      {formatDate(s.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setViewSale(s)}
                        className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-orange-50 hover:text-orange-600 opacity-0 group-hover:opacity-100"
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
              <span className="font-medium text-gray-700">{totalPages}</span> ·{" "}
              {total} results
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sale Detail Modal */}
      {viewSale && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setViewSale(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-md shadow-orange-500/20">
                  <Receipt className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">
                    Sale #{viewSale.orderNumber}
                  </h2>
                  <p className="text-[13px] text-gray-500">
                    {formatDateTime(viewSale.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewSale(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4">
              {actionError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {actionError}
                </div>
              )}
              <div className="mb-5 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                    Customer
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-gray-700">
                    {getSaleCustomerName(viewSale)}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                    Payment
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                    {paymentIcon[viewSale.paymentMethod]}
                    {paymentLabel[viewSale.paymentMethod]}
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                    Status
                  </p>
                  <span
                    className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusColor[viewSale.status]}`}
                  >
                    {viewSale.status}
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
                      Price
                    </th>
                    <th className="pb-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {viewSale.items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-2.5 font-medium text-gray-700">
                        {item.productName}
                      </td>
                      <td className="py-2.5 text-right text-gray-500">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 text-right text-gray-500">
                        {formatCurrency(item.unitPrice, currency)}
                      </td>
                      <td className="py-2.5 text-right font-medium text-gray-700">
                        {formatCurrency(item.total, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="space-y-2 rounded-xl bg-gray-50 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-700">
                    {formatCurrency(viewSale.subtotal, currency)}
                  </span>
                </div>
                {viewSale.totalDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Discount</span>
                    <span className="text-red-500">
                      -{formatCurrency(viewSale.totalDiscount, currency)}
                    </span>
                  </div>
                )}
                {viewSale.totalTax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tax</span>
                    <span className="text-gray-700">
                      {formatCurrency(viewSale.totalTax, currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold">
                  <span className="text-gray-900">Total</span>
                  <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                    {formatCurrency(viewSale.total, currency)}
                  </span>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-4 md:flex-row md:items-end md:justify-between">
                <div className="w-full md:max-w-[220px]">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Update Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  >
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="refunded">Refunded</option>
                    <option value="voided">Voided</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={deleteSale}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                  <button
                    onClick={updateSaleStatus}
                    disabled={
                      actionLoading || selectedStatus === viewSale.status
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 hover:shadow-lg disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {actionLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Sales Order Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-6"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/20">
                  <ShoppingCart className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Create Sales Order
                  </h2>
                  <p className="text-[12px] text-gray-400">
                    Fill in the details to create a new sales order
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {orderError && (
              <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {orderError}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
              {/* Left: Form */}
              <div className="lg:col-span-3 px-6 py-5 space-y-5">
                {/* Customer & Branch */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 mb-1.5">
                      <User className="h-3.5 w-3.5 text-gray-400" /> Customer
                    </label>
                    <select
                      value={orderCustomer}
                      onChange={(e) => {
                        const nextCustomer = e.target.value;
                        setOrderCustomer(nextCustomer);

                        if (nextCustomer) {
                          setOrderWalkInName("");
                          setOrderWalkInPhone("");
                        } else if (orderPaymentMethod === "credit") {
                          setOrderPaymentMethod("cash");
                          setOrderDueDate("");
                          setOrderStatus("completed");
                        }
                      }}
                      className={inputClass}
                    >
                      <option value="">Walk-in Customer</option>
                      {customers.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                          {c.phone ? ` (${c.phone})` : ""}
                          {(c.outstandingBalance || 0) > 0
                            ? ` • Bal ${formatCurrency(c.outstandingBalance || 0, currency)}`
                            : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowOrderCustomerModal(true)}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add New Customer
                    </button>
                    {!orderCustomer && (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={orderWalkInName}
                          onChange={(e) => setOrderWalkInName(e.target.value)}
                          placeholder="Walk-in name"
                          className={inputClass}
                        />
                        <input
                          value={orderWalkInPhone}
                          onChange={(e) => setOrderWalkInPhone(e.target.value)}
                          placeholder="Walk-in phone (optional)"
                          className={inputClass}
                        />
                      </div>
                    )}
                    {selectedOrderCustomer &&
                      (selectedOrderCustomer.outstandingBalance || 0) > 0 && (
                        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
                          Existing credit due:{" "}
                          {formatCurrency(
                            selectedOrderCustomer.outstandingBalance || 0,
                            currency,
                          )}
                        </div>
                      )}
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-[13px] font-semibold text-gray-700 mb-1.5">
                      <Package className="h-3.5 w-3.5 text-gray-400" /> Store /
                      Branch
                    </label>
                    <select
                      value={orderBranch}
                      onChange={(e) => setOrderBranch(e.target.value)}
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

                {/* Add Items */}
                <div>
                  <label className="text-[13px] font-semibold text-gray-700 mb-1.5 block">
                    Add Items
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search products by name or SKU…"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-9 pr-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                    {productSearch && variantSearchResults.length > 0 && (
                      <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                        {variantSearchResults.map((row) => (
                          <button
                            key={row.key}
                            onClick={() => addProduct(row.parent, row.variant)}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 text-left"
                          >
                            <div>
                              <span className="font-medium text-gray-800">
                                {row.label}
                              </span>
                              <span className="ml-2 text-[11px] text-gray-400">
                                {row.sku}
                              </span>
                              {row.stockText && (
                                <span className="ml-2 text-[11px] text-blue-500">
                                  {row.stockText}
                                </span>
                              )}
                            </div>
                            <span className="text-gray-600 font-semibold">
                              {formatCurrency(row.price, currency)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                {orderItems.length > 0 && (
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/50">
                          <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                            Product
                          </th>
                          <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                            Qty
                          </th>
                          <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                            Price
                          </th>
                          <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                            Total
                          </th>
                          <th className="px-4 py-2.5 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {orderItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2.5">
                              <p className="font-medium text-gray-800">
                                {item.productName}
                              </p>
                              <p className="text-[11px] text-gray-400">
                                {item.sku}
                              </p>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() =>
                                    updateItemQty(idx, item.quantity - 1)
                                  }
                                  className="rounded-md border border-gray-200 px-1.5 py-0.5 text-gray-500 hover:bg-gray-100"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center font-medium">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    updateItemQty(idx, item.quantity + 1)
                                  }
                                  className="rounded-md border border-gray-200 px-1.5 py-0.5 text-gray-500 hover:bg-gray-100"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right text-gray-600">
                              {formatCurrency(item.unitPrice, currency)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-gray-800">
                              {formatCurrency(item.total, currency)}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <button
                                onClick={() => removeItem(idx)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Payment Details */}
                <div className="rounded-xl bg-gradient-to-br from-[hsl(222,47%,11%)] to-[hsl(224,50%,18%)] p-4">
                  <h4 className="text-sm font-bold text-white mb-3">
                    Payment Details
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-gray-400">
                        Payment Method
                      </label>
                      <select
                        value={orderPaymentMethod}
                        onChange={(e) => {
                          const nextMethod = e.target.value;
                          setOrderPaymentMethod(nextMethod);
                          if (nextMethod === "credit") {
                            setOrderStatus("pending");
                          }
                        }}
                        className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                      >
                        <option value="cash" className="text-gray-900">
                          Cash
                        </option>
                        <option value="card" className="text-gray-900">
                          Card
                        </option>
                        <option value="mobile_money" className="text-gray-900">
                          Mobile Money
                        </option>
                        {!isWalkInOrder && (
                          <option value="credit" className="text-gray-900">
                            Credit
                          </option>
                        )}
                      </select>
                      {isWalkInOrder && (
                        <p className="mt-1 text-[11px] text-amber-300">
                          Credit is available for saved customers only.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-400">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={orderDueDate}
                        onChange={(e) => setOrderDueDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-400">
                        Amount Paid ({currency})
                      </label>
                      <input
                        type="number"
                        value={orderAmountPaid}
                        onChange={(e) => setOrderAmountPaid(e.target.value)}
                        placeholder={orderTotal.toString()}
                        className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[13px] font-semibold text-gray-700 mb-1.5 block">
                    Notes (optional)
                  </label>
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    rows={2}
                    className={inputClass}
                    placeholder="Add any notes about this order…"
                  />
                </div>
              </div>

              {/* Right: Order Summary */}
              <div className="lg:col-span-2 border-l border-gray-100 px-5 py-5 space-y-5 bg-gray-50/30">
                <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
                  <h4 className="text-sm font-bold text-gray-800">
                    Order Summary
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Items</span>
                      <span className="font-medium text-gray-700">
                        {orderItems.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="font-medium text-gray-700">
                        {formatCurrency(orderSubtotal, currency)}
                      </span>
                    </div>
                    {orderTax > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tax</span>
                        <span className="text-gray-700">
                          {formatCurrency(orderTax, currency)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold">
                      <span className="text-gray-900">Total</span>
                      <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                        {formatCurrency(orderTotal, currency)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  <h4 className="text-sm font-bold text-gray-800 mb-2">
                    Order Status
                  </h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOrderStatus("completed")}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${orderStatus === "completed" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
                    >
                      Completed
                    </button>
                    <button
                      onClick={() => setOrderStatus("pending")}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${orderStatus === "pending" ? "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
                    >
                      Pending
                    </button>
                  </div>
                </div>

                {orderCustomer && (
                  <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <h4 className="text-sm font-bold text-gray-800 mb-2">
                      Customer
                    </h4>
                    <p className="text-sm text-gray-600">
                      {selectedOrderCustomer?.name || "—"}
                    </p>
                    <p className="text-[12px] text-gray-400">
                      {selectedOrderCustomer?.phone || ""}
                    </p>
                    {(selectedOrderCustomer?.outstandingBalance || 0) > 0 && (
                      <p className="mt-2 text-[12px] font-semibold text-amber-700">
                        Outstanding:{" "}
                        {formatCurrency(
                          selectedOrderCustomer?.outstandingBalance || 0,
                          currency,
                        )}
                      </p>
                    )}
                  </div>
                )}
                {!orderCustomer && (orderWalkInName || orderWalkInPhone) && (
                  <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <h4 className="text-sm font-bold text-gray-800 mb-2">
                      Walk-in Contact
                    </h4>
                    <p className="text-sm text-gray-600">
                      {orderWalkInName || "Unnamed Walk-in"}
                    </p>
                    {orderWalkInPhone && (
                      <p className="text-[12px] text-gray-400">
                        {orderWalkInPhone}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveOrder}
                disabled={savingOrder || orderItems.length === 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 hover:shadow-lg disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {savingOrder ? "Creating..." : "Create Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showOrderCustomerModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowOrderCustomerModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-base font-bold text-gray-800">Add Customer</h3>
            <p className="mt-1 text-xs text-gray-400">
              Create customer while building this sales order.
            </p>
            <div className="mt-4 space-y-3">
              <input
                value={newOrderCustomerName}
                onChange={(e) => setNewOrderCustomerName(e.target.value)}
                placeholder="Customer name *"
                className={inputClass}
              />
              <input
                value={newOrderCustomerPhone}
                onChange={(e) => setNewOrderCustomerPhone(e.target.value)}
                placeholder="Phone"
                className={inputClass}
              />
              <input
                value={newOrderCustomerEmail}
                onChange={(e) => setNewOrderCustomerEmail(e.target.value)}
                placeholder="Email"
                className={inputClass}
              />
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setShowOrderCustomerModal(false)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={quickCreateOrderCustomer}
                disabled={!newOrderCustomerName.trim() || creatingOrderCustomer}
                className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {creatingOrderCustomer ? "Saving..." : "Save Customer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
