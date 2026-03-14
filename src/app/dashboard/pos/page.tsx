"use client";
import { useState, useEffect, useMemo } from "react";
import type { ComponentType } from "react";
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  CheckCircle2,
  Banknote,
  CreditCard,
  Smartphone,
  Package,
  User,
  Receipt,
  Printer,
  ChevronRight,
  Layers,
  Building2,
  CalendarClock,
  MessageCircle,
  ArrowUpDown,
  Clock,
  ImageIcon,
} from "lucide-react";
import {
  printHtml,
  formatCurrency,
  escapeHtml,
  getPrintBrandingMarkup,
  getPrintFooterMarkup,
} from "@/lib/utils";
import { useSession } from "../layout";

type SortOption =
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc"
  | "newest"
  | "stock-low";

interface Product {
  _id: string;
  name: string;
  sku: string;
  price: number;
  image?: string;
  category?: { _id: string; name: string };
  stock?: number;
  createdAt?: string;
  hasVariants?: boolean;
  variants?: {
    name: string;
    sku: string;
    price: number;
    stock: number;
    imei?: string;
  }[];
}
interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  outstandingBalance?: number;
  creditLimit?: number;
}
interface CartItem extends Product {
  quantity: number;
  lineKey: string;
  variantName?: string;
  variantSku?: string;
}

type PaymentMethod =
  | "cash"
  | "card"
  | "mobile_money"
  | "split"
  | "bank_transfer"
  | "credit";

const PAYMENT_OPTIONS: {
  key: PaymentMethod;
  label: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { key: "cash", label: "Cash", icon: Banknote },
  { key: "card", label: "Card", icon: CreditCard },
  { key: "mobile_money", label: "M-Pesa", icon: Smartphone },
  { key: "split", label: "Split", icon: ArrowUpDown },
  { key: "bank_transfer", label: "Bank", icon: Building2 },
  { key: "credit", label: "Credit", icon: CalendarClock },
];

type SplitMethod = "cash" | "card" | "mobile_money" | "bank_transfer";

type SplitEntry = {
  method: SplitMethod;
  amount: string;
  reference: string;
};

export default function POSTerminalPage() {
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
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>(
    [],
  );
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [expandedProductId, setExpandedProductId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [creditDueDate, setCreditDueDate] = useState("");
  const [bankReference, setBankReference] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [cardType, setCardType] = useState("");
  const [mobileMoneyProvider, setMobileMoneyProvider] = useState<
    "mtn" | "airtel" | "mpesa"
  >("mtn");
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState("");
  const [mobileMoneyReference, setMobileMoneyReference] = useState("");
  const [splitPayments, setSplitPayments] = useState<SplitEntry[]>([
    { method: "cash", amount: "", reference: "" },
    { method: "card", amount: "", reference: "" },
  ]);
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankBranchCode, setBankBranchCode] = useState("");
  const [transferDate, setTransferDate] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [showSort, setShowSort] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [lastSale, setLastSale] = useState<{
    saleNumber: string;
    total: number;
    items: { name: string; quantity: number; total: number }[];
    paymentMethod: string;
    customerName?: string;
    amountPaid: number;
    change: number;
    creditDueDate?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [saleError, setSaleError] = useState("");

  const isWalkInCustomer = !selectedCustomer;
  const isCreditWithoutCustomer =
    paymentMethod === "credit" && !selectedCustomer;

  const splitTotal = useMemo(
    () =>
      splitPayments.reduce(
        (sum, payment) => sum + (parseFloat(payment.amount) || 0),
        0,
      ),
    [splitPayments],
  );

  function formatCardNumber(value: string) {
    return value
      .replace(/\D/g, "")
      .substring(0, 16)
      .replace(/(.{4})/g, "$1 ")
      .trim();
  }

  function isBackdated(dateValue: string) {
    if (!dateValue) return false;
    const selected = new Date(dateValue);
    const today = new Date();
    selected.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return selected < today;
  }

  useEffect(() => {
    fetchData();
    const intervalId = window.setInterval(fetchData, 45000);
    return () => window.clearInterval(intervalId);
  }, []);

  async function fetchData() {
    try {
      const [pRes, catRes, custRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories"),
        fetch("/api/customers"),
      ]);
      const pData = await pRes.json();
      const catData = await catRes.json();
      const custData = await custRes.json();
      setProducts(pData.products || []);
      setCategories(catData.categories || []);
      setCustomers(custData.customers || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = useMemo(() => {
    const query = search.toLowerCase();
    const filtered = products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        (p.variants || []).some(
          (variant) =>
            variant.name.toLowerCase().includes(query) ||
            variant.sku.toLowerCase().includes(query),
        );
      const matchCat =
        selectedCategory === "all" || p.category?._id === selectedCategory;
      return matchSearch && matchCat;
    });
    // Sort
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "newest":
          return (b.createdAt || "").localeCompare(a.createdAt || "");
        case "stock-low":
          return (a.stock ?? 999) - (b.stock ?? 999);
        default:
          return 0;
      }
    });
  }, [products, search, selectedCategory, sortBy]);

  const cartTotal = useMemo(
    () => cart.reduce((s, i) => s + i.price * i.quantity, 0),
    [cart],
  );
  const orderItems = useMemo(
    () =>
      cart.map((item) => ({
        id: item.lineKey,
        name: item.name,
        qty: item.quantity,
        price: item.price,
        lineTotal: item.price * item.quantity,
      })),
    [cart],
  );
  const orderSubtotal = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [orderItems],
  );
  const orderTax = useMemo(() => orderSubtotal * 0.18, [orderSubtotal]);
  const orderGrandTotal = orderSubtotal + orderTax;
  const cartCount = useMemo(
    () => cart.reduce((s, i) => s + i.quantity, 0),
    [cart],
  );
  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) ||
        customer.phone.toLowerCase().includes(query) ||
        customer.email.toLowerCase().includes(query),
    );
  }, [customerSearch, customers]);

  function addToCart(
    product: Product,
    variant?: {
      name: string;
      sku: string;
      price: number;
      stock: number;
      imei?: string;
    },
  ) {
    const lineKey = `${product._id}:${variant?.sku || "base"}`;
    const displayName = variant
      ? `${product.name} - ${variant.name}`
      : product.name;
    const linePrice = variant?.price ?? product.price;
    const lineSku = variant?.sku || product.sku;

    setCart((prev) => {
      const existing = prev.find((i) => i.lineKey === lineKey);
      if (existing)
        return prev.map((i) =>
          i.lineKey === lineKey ? { ...i, quantity: i.quantity + 1 } : i,
        );
      return [
        ...prev,
        {
          ...product,
          name: displayName,
          sku: lineSku,
          price: linePrice,
          quantity: 1,
          lineKey,
          variantName: variant?.name,
          variantSku: variant?.sku,
        },
      ];
    });
    setExpandedProductId("");
  }

  function updateQty(lineKey: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) =>
          i.lineKey === lineKey ? { ...i, quantity: i.quantity + delta } : i,
        )
        .filter((i) => i.quantity > 0),
    );
  }

  function removeItem(lineKey: string) {
    setCart((prev) => prev.filter((i) => i.lineKey !== lineKey));
  }

  async function quickCreateCustomer() {
    if (!newCustomerName.trim() || creatingCustomer) return;
    setCreatingCustomer(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCustomerName.trim(),
          phone: newCustomerPhone.trim(),
          email: newCustomerEmail.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaleError(data.error || "Failed to create customer");
        return;
      }

      const created = data.customer || data;
      setCustomers((prev) => [created, ...prev]);
      setSelectedCustomer(created._id);
      setWalkInName("");
      setWalkInPhone("");
      setShowCreateCustomerModal(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerEmail("");
      setSaleError("");
    } catch {
      setSaleError("Failed to create customer");
    } finally {
      setCreatingCustomer(false);
    }
  }

  function openPayment() {
    if (cart.length === 0) return;
    setSaleError("");
    setAmountPaid(cartTotal.toFixed(2));
    setCreditDueDate("");
    setBankReference("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
    setCardholderName("");
    setCardType("");
    setMobileMoneyProvider("mtn");
    setMobileMoneyPhone("");
    setMobileMoneyReference("");
    setSplitPayments([
      { method: "cash", amount: "", reference: "" },
      { method: "card", amount: "", reference: "" },
    ]);
    setBankName("");
    setBankAccountNumber("");
    setBankBranchCode("");
    setTransferDate("");
    setShowPayment(true);
  }

  async function completeSale() {
    if (processing) return;

    const validateOrder = () => {
      const errors: string[] = [];

      // Issue #1: Walk-in + credit block
      if (paymentMethod === "credit" && !selectedCustomer) {
        errors.push("Credit sales require a saved customer profile");
      }

      // Issue #3: Backdated due-date block
      if (paymentMethod === "credit" && isBackdated(creditDueDate)) {
        errors.push("Due date cannot be in the past");
      }

      // Issue #2: Currency support guard
      if (!supportedCurrencies.has(String(currency).toUpperCase())) {
        errors.push("Selected currency is not supported");
      }

      if (paymentMethod === "card") {
        const digits = cardNumber.replace(/\D/g, "");
        if (
          digits.length < 12 ||
          !cardExpiry.trim() ||
          cardCvv.trim().length < 3
        ) {
          errors.push(
            "Card number, expiry, and CVV are required for card payment",
          );
        }
      }

      if (paymentMethod === "mobile_money" && !mobileMoneyPhone.trim()) {
        errors.push("Phone number is required for mobile money payment");
      }

      if (
        paymentMethod === "bank_transfer" &&
        (!bankName.trim() || !bankAccountNumber.trim() || !bankReference.trim())
      ) {
        errors.push(
          "Bank name, account number, and transfer reference are required",
        );
      }

      if (paymentMethod === "split") {
        const validSplitEntries = splitPayments.filter(
          (row) => row.method && (parseFloat(row.amount) || 0) > 0,
        );
        if (validSplitEntries.length < 2) {
          errors.push("Split payment requires at least two payment methods");
        }
        if (Math.abs(splitTotal - cartTotal) > 0.01) {
          errors.push(
            "Split payment amounts must add up to the total amount due",
          );
        }
      }

      if (errors.length > 0) {
        setSaleError(errors.join(" "));
        return false;
      }

      return true;
    };

    if (!validateOrder()) return;

    const parsedAmountPaid = Number.parseFloat(amountPaid);
    const resolvedAmountPaid =
      paymentMethod === "credit"
        ? Math.max(0, Number.isFinite(parsedAmountPaid) ? parsedAmountPaid : 0)
        : paymentMethod === "split"
          ? splitTotal
          : Number.isFinite(parsedAmountPaid)
            ? parsedAmountPaid
            : cartTotal;

    const splitPaymentPayload = splitPayments
      .filter((row) => (parseFloat(row.amount) || 0) > 0)
      .map((row) => ({
        method: row.method,
        amount: parseFloat(row.amount) || 0,
        reference: row.reference.trim() || undefined,
      }));

    setProcessing(true);
    setSaleError("");
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((i) => ({
            productId: i._id,
            productName: i.name,
            sku: i.sku,
            quantity: i.quantity,
            unitPrice: i.price,
            total: i.price * i.quantity,
          })),
          customerId: selectedCustomer || undefined,
          walkInName: selectedCustomer ? undefined : walkInName.trim(),
          walkInPhone: selectedCustomer ? undefined : walkInPhone.trim(),
          paymentMethod,
          subtotal: cartTotal,
          totalTax: 0,
          total: cartTotal,
          amountPaid: resolvedAmountPaid,
          ...(paymentMethod === "mobile_money" && {
            mobileMoneyProvider:
              mobileMoneyProvider === "airtel" ? "airtel" : "mtn",
            mobileMoneyRef: mobileMoneyReference.trim() || undefined,
            mobileMoneyPhone: mobileMoneyPhone.trim() || undefined,
          }),
          paymentDetails: {
            ...(paymentMethod === "card" && {
              cardNumber,
              cardExpiry,
              cardCvv,
              cardholderName,
              cardType,
            }),
            ...(paymentMethod === "mobile_money" && {
              mobileMoneyProvider:
                mobileMoneyProvider === "airtel" ? "airtel" : "mtn",
              mobileMoneyRef: mobileMoneyReference,
              mobileMoneyPhone,
            }),
            ...(paymentMethod === "bank_transfer" && {
              bankName,
              bankAccountNumber,
              bankBranchCode,
              bankReference,
              transferDate,
            }),
            ...(paymentMethod === "split" && {
              splitPayments: splitPaymentPayload,
            }),
          },
          status: paymentMethod === "credit" ? "pending" : "completed",
          ...(paymentMethod === "credit" &&
            creditDueDate && { dueDate: creditDueDate }),
          ...(paymentMethod === "bank_transfer" &&
            bankReference && { reference: bankReference }),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchData();
        setLastSale({
          saleNumber: data.sale?.orderNumber || "N/A",
          total: cartTotal,
          items: cart.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            total: item.price * item.quantity,
          })),
          paymentMethod,
          customerName: selectedCustomerRecord?.name || walkInName.trim(),
          amountPaid: resolvedAmountPaid,
          change: paymentMethod === "cash" ? Math.max(0, change) : 0,
          creditDueDate: paymentMethod === "credit" ? creditDueDate : undefined,
        });
        setShowPayment(false);
        setShowComplete(true);
        setCart([]);
        setSelectedCustomer("");
        setWalkInName("");
        setWalkInPhone("");
        setPaymentMethod("cash");
        setAmountPaid("");
        setSaleError("");
      } else {
        setSaleError(data.error || "Failed to complete sale");
      }
    } catch {
      setSaleError("Failed to complete sale. Please try again.");
    } finally {
      setProcessing(false);
    }
  }

  function newSale() {
    setShowComplete(false);
    setLastSale(null);
    setSaleError("");
  }

  function closeCompleteModal() {
    setShowComplete(false);
    setSaleError("");
  }

  function printReceipt() {
    if (!lastSale) return;

    const paymentLabel =
      lastSale.paymentMethod === "mobile_money"
        ? "Mobile Money"
        : lastSale.paymentMethod[0].toUpperCase() +
          lastSale.paymentMethod.slice(1);

    printHtml(
      `Receipt ${lastSale.saleNumber}`,
      `
        <div class="receipt">
          ${getPrintBrandingMarkup({
            title: "Sale Receipt",
            subtitle: `${lastSale.saleNumber} • ${new Date().toLocaleString("en-UG")}`,
          })}
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${lastSale.items
                .map(
                  (item) => `
                    <tr>
                      <td>${escapeHtml(item.name)}</td>
                      <td>${item.quantity}</td>
                      <td>${formatCurrency(item.total, currency)}</td>
                    </tr>`,
                )
                .join("")}
            </tbody>
          </table>
          <div class="summary">
            <div class="summary-row"><span>Customer</span><span>${escapeHtml(lastSale.customerName || "Walk-in")}</span></div>
            <div class="summary-row"><span>Payment</span><span>${paymentLabel}</span></div>
            <div class="summary-row"><span>Amount Paid</span><span>${formatCurrency(lastSale.amountPaid, currency)}</span></div>
            <div class="summary-row"><span>Change</span><span>${formatCurrency(lastSale.change, currency)}</span></div>
            <div class="summary-row total"><span>Total</span><span>${formatCurrency(lastSale.total, currency)}</span></div>
          </div>
          ${getPrintFooterMarkup()}
        </div>
      `,
    );
  }

  const change = parseFloat(amountPaid) - cartTotal;
  const selectedCustomerRecord = customers.find(
    (customer) => customer._id === selectedCustomer,
  );
  const selectedCustomerOutstanding =
    selectedCustomerRecord?.outstandingBalance || 0;
  const availablePaymentOptions = useMemo(
    () =>
      isWalkInCustomer
        ? PAYMENT_OPTIONS.filter((option) => option.key !== "credit")
        : PAYMENT_OPTIONS,
    [isWalkInCustomer],
  );

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center rounded-[28px] border border-gray-200/70 bg-gradient-to-br from-gray-50 to-gray-100 shadow-sm">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-gray-200 border-t-orange-500" />
          <p className="text-sm font-medium text-gray-500">
            Loading POS Terminal…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] overflow-hidden rounded-[28px] border border-gray-200/70 bg-gradient-to-br from-gray-50 to-gray-100/80 shadow-sm">
      {/* ── Left: Products ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="flex items-center gap-3 border-b border-gray-200/80 bg-white/80 px-5 py-3 backdrop-blur-sm">
          <div className="flex h-10 flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/80 px-3 transition-colors focus-within:border-orange-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-500/20">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products by name or SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSort(!showSort)}
              className="flex h-10 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-600 transition-colors hover:bg-gray-50"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              Sort
            </button>
            {showSort && (
              <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
                {(
                  [
                    { key: "name-asc", label: "Name A→Z" },
                    { key: "name-desc", label: "Name Z→A" },
                    { key: "price-asc", label: "Price: Low→High" },
                    { key: "price-desc", label: "Price: High→Low" },
                    { key: "newest", label: "Newest First" },
                    { key: "stock-low", label: "Low Stock First" },
                  ] as { key: SortOption; label: string }[]
                ).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => {
                      setSortBy(opt.key);
                      setShowSort(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${sortBy === opt.key ? "font-semibold text-orange-600 bg-orange-50" : "text-gray-700"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-3.5 py-2 text-white shadow-md shadow-orange-500/20">
            <ShoppingCart className="h-4 w-4" />
            <span className="text-sm font-bold">{cartCount}</span>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto border-b border-gray-100 bg-white/60 px-5 py-2.5 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              selectedCategory === "all"
                ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Layers className="h-3 w-3" />
            All
          </button>
          {categories.map((c) => (
            <button
              key={c._id}
              onClick={() => setSelectedCategory(c._id)}
              className={`shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                selectedCategory === c._id
                  ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                <Package className="h-7 w-7 text-gray-400" />
              </div>
              <p className="font-medium text-gray-500">No products found</p>
              <p className="text-[13px] text-gray-400">
                Try adjusting your search or category filter
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filteredProducts.map((p) => {
                const inCartQty = cart
                  .filter((i) => i._id === p._id)
                  .reduce((sum, item) => sum + item.quantity, 0);
                return (
                  <button
                    key={p._id}
                    onClick={() => {
                      if (p.hasVariants && (p.variants?.length || 0) > 0) {
                        setExpandedProductId((current) =>
                          current === p._id ? "" : p._id,
                        );
                        return;
                      }
                      addToCart(p);
                    }}
                    className={`group relative flex flex-col rounded-2xl border bg-white p-3 text-left transition-all hover:shadow-lg hover:shadow-gray-200/60 ${
                      inCartQty > 0
                        ? "border-orange-300 ring-2 ring-orange-500/20"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    {/* Product Image */}
                    <div className="mb-2.5 flex h-20 items-center justify-center rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          className="h-full w-full rounded-xl object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-gray-300 transition-transform group-hover:scale-110" />
                      )}
                    </div>

                    <p className="text-[13px] font-semibold leading-tight text-gray-800 line-clamp-2">
                      {p.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-400">{p.sku}</p>
                    {p.hasVariants && (p.variants?.length || 0) > 0 && (
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-500">
                        {p.variants?.length} variants - tap to expand
                      </p>
                    )}

                    <div className="mt-auto flex items-end justify-between pt-2">
                      <span className="text-[15px] font-bold text-orange-600">
                        {formatCurrency(p.price, currency)}
                      </span>
                      {typeof p.stock === "number" && (
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                            p.stock <= 5
                              ? "bg-red-50 text-red-600"
                              : "bg-gray-50 text-gray-400"
                          }`}
                        >
                          {p.stock}
                        </span>
                      )}
                    </div>

                    {inCartQty > 0 && (
                      <div className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-[11px] font-bold text-white shadow-md shadow-orange-500/30">
                        {inCartQty}
                      </div>
                    )}

                    {expandedProductId === p._id &&
                      p.hasVariants &&
                      (p.variants?.length || 0) > 0 && (
                        <div className="mt-2 space-y-1 rounded-xl border border-blue-100 bg-blue-50/40 p-2">
                          {p.variants?.map((variant) => (
                            <button
                              key={`${p._id}-${variant.sku}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                addToCart(p, variant);
                              }}
                              className="flex w-full items-center justify-between rounded-lg border border-blue-100 bg-white px-2 py-1.5 text-left hover:border-orange-300 hover:bg-orange-50/30"
                            >
                              <span className="text-[11px] font-semibold text-gray-700">
                                {variant.name}
                                {variant.imei ? ` (IMEI ${variant.imei})` : ""}
                              </span>
                              <span className="text-[11px] text-gray-500">
                                {formatCurrency(variant.price, currency)} -{" "}
                                {variant.stock}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Cart Sidebar ── */}
      <div className="flex w-[360px] flex-col border-l border-gray-200/80 bg-white">
        {/* Cart Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 shadow-md shadow-orange-500/20">
              <Receipt className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">Current Sale</h2>
              <p className="text-[11px] text-gray-400">
                {cart.length} item{cart.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-red-500 transition-colors hover:bg-red-50"
            >
              Clear
            </button>
          )}
        </div>

        {/* Customer Selector */}
        <div className="border-b border-gray-100 px-5 py-3">
          <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            <User className="h-3 w-3" />
            Customer
          </label>
          <input
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            placeholder="Search customer by name, phone..."
            className="mb-2 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-700 transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
          <select
            value={selectedCustomer}
            onChange={(e) => {
              const nextCustomer = e.target.value;
              setSelectedCustomer(nextCustomer);

              if (nextCustomer) {
                setWalkInName("");
                setWalkInPhone("");
              } else if (paymentMethod === "credit") {
                setPaymentMethod("cash");
                setCreditDueDate("");
              }
            }}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-700 transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          >
            <option value="">Walk-in Customer</option>
            {filteredCustomers.map((c) => (
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
            onClick={() => setShowCreateCustomerModal(true)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
          >
            <Plus className="h-3.5 w-3.5" />
            Add New Customer
          </button>
          {!selectedCustomer && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                placeholder="Walk-in name"
                className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-700 transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
              <input
                value={walkInPhone}
                onChange={(e) => setWalkInPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-700 transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          )}
          {selectedCustomer && selectedCustomerRecord && (
            <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[12px] text-blue-700">
              {selectedCustomerOutstanding > 0
                ? `Existing credit due: ${formatCurrency(selectedCustomerOutstanding, currency)}`
                : "No existing credit due"}
            </div>
          )}
          {!selectedCustomer && (
            <p className="mt-2 text-[11px] text-amber-700">
              Credit is available for saved customers only.
            </p>
          )}
        </div>

        {/* Reactive order table */}
        <div className="border-b border-gray-100 px-5 py-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Order Table
          </p>
          <div className="max-h-36 overflow-y-auto rounded-xl border border-gray-100">
            <table className="w-full text-[11px]">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-2 py-1.5 text-left font-semibold">Item</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Qty</th>
                  <th className="px-2 py-1.5 text-right font-semibold">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {orderItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-2 py-3 text-center text-gray-400"
                    >
                      No items selected
                    </td>
                  </tr>
                ) : (
                  orderItems.map((item) => (
                    <tr key={item.id} className="border-t border-gray-50">
                      <td className="px-2 py-1.5 text-gray-700">{item.name}</td>
                      <td className="px-2 py-1.5 text-right text-gray-600">
                        {item.qty}
                      </td>
                      <td className="px-2 py-1.5 text-right font-medium text-gray-800">
                        {formatCurrency(item.lineTotal, currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-2 space-y-1 text-[11px]">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{formatCurrency(orderSubtotal, currency)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Tax (18%)</span>
              <span>{formatCurrency(orderTax, currency)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-700">
              <span>Total</span>
              <span>{formatCurrency(orderGrandTotal, currency)}</span>
            </div>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50">
                <ShoppingCart className="h-7 w-7 text-gray-300" />
              </div>
              <p className="font-medium text-gray-400">Cart is empty</p>
              <p className="text-center text-[12px] text-gray-300">
                Tap products on the left to add them
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 px-4 py-2">
              {cart.map((item) => (
                <div
                  key={item.lineKey}
                  className="group flex items-start gap-3 py-3"
                >
                  {/* Item icon */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-50 to-amber-50">
                    <Package className="h-4 w-4 text-orange-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="truncate text-[13px] font-semibold text-gray-800">
                      {item.name}
                    </p>
                    <p className="text-[12px] text-gray-400">
                      {formatCurrency(item.price, currency)} × {item.quantity}
                    </p>
                  </div>

                  {/* Qty controls */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(item.lineKey, -1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-7 text-center text-xs font-bold text-gray-700">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(item.lineKey, 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Total + Delete */}
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[13px] font-bold text-gray-800">
                      {formatCurrency(item.price * item.quantity, currency)}
                    </span>
                    <button
                      onClick={() => removeItem(item.lineKey)}
                      className="text-gray-300 opacity-0 transition-all hover:text-red-500 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Footer */}
        <div className="border-t border-gray-200 bg-gray-50/50 px-5 py-4">
          <div className="mb-3 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>{formatCurrency(cartTotal, currency)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Tax</span>
              <span>{formatCurrency(0, currency)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2">
              <span className="text-[15px] font-bold text-gray-800">Total</span>
              <span className="text-[15px] font-bold text-orange-600">
                {formatCurrency(cartTotal, currency)}
              </span>
            </div>
          </div>

          <button
            onClick={openPayment}
            disabled={cart.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:shadow-xl hover:shadow-orange-500/30 disabled:opacity-40 disabled:shadow-none"
          >
            <Banknote className="h-4 w-4" />
            Charge {formatCurrency(cartTotal, currency)}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showCreateCustomerModal && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowCreateCustomerModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-base font-bold text-gray-800">Add Customer</h3>
            <p className="mt-1 text-xs text-gray-400">
              Create customer without leaving the POS terminal.
            </p>
            <div className="mt-4 space-y-3">
              <input
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="Customer name *"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-800 focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
              <input
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                placeholder="Phone"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-800 focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
              <input
                value={newCustomerEmail}
                onChange={(e) => setNewCustomerEmail(e.target.value)}
                placeholder="Email"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-800 focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setShowCreateCustomerModal(false)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={quickCreateCustomer}
                disabled={!newCustomerName.trim() || creatingCustomer}
                className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {creatingCustomer ? "Saving..." : "Save Customer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Modal ── */}
      {showPayment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/20">
                  <Banknote className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-800">Payment</h3>
                  <p className="text-[12px] text-gray-400">
                    Complete this transaction
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPayment(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {saleError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {saleError}
                </div>
              )}

              {/* Total Display */}
              <div className="rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 p-5 text-center text-white shadow-lg shadow-orange-500/20">
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-orange-100">
                  Amount Due
                </p>
                <p className="text-3xl font-extrabold">
                  {formatCurrency(cartTotal, currency)}
                </p>
              </div>

              {/* Payment Method */}
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Payment Method
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {availablePaymentOptions.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => setPaymentMethod(m.key)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 transition-all ${
                        paymentMethod === m.key
                          ? m.key === "credit"
                            ? "border-amber-500 bg-amber-50 text-amber-700 shadow-sm"
                            : "border-orange-500 bg-orange-50 text-orange-700 shadow-sm"
                          : "border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <m.icon className="h-5 w-5" />
                      <span className="text-[10px] font-semibold">
                        {m.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Credit: must select customer & due date */}
              {paymentMethod === "credit" && (
                <div className="space-y-3">
                  {isCreditWithoutCustomer && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      Credit sales require a saved customer profile.
                    </div>
                  )}
                  {selectedCustomerRecord && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                      <p className="text-sm font-semibold text-blue-700">
                        Customer Credit Profile
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-blue-800">
                        <div>
                          Outstanding:{" "}
                          {formatCurrency(
                            selectedCustomerRecord.outstandingBalance || 0,
                            currency,
                          )}
                        </div>
                        <div>
                          Credit Limit:{" "}
                          {selectedCustomerRecord.creditLimit
                            ? formatCurrency(
                                selectedCustomerRecord.creditLimit,
                                currency,
                              )
                            : "Not set"}
                        </div>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={creditDueDate}
                      onChange={(e) => setCreditDueDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                    {isBackdated(creditDueDate) && (
                      <p className="mt-1 text-[11px] text-red-600">
                        Due date cannot be in the past.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {paymentMethod === "card" && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Card Number
                    </label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) =>
                        setCardNumber(formatCardNumber(e.target.value))
                      }
                      placeholder="XXXX XXXX XXXX XXXX"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Expiry (MM/YY)
                      </label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        CVV
                      </label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={(e) =>
                          setCardCvv(
                            e.target.value.replace(/\D/g, "").slice(0, 4),
                          )
                        }
                        placeholder="***"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Cardholder Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={cardholderName}
                        onChange={(e) => setCardholderName(e.target.value)}
                        placeholder="Name on card"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Card Type (Optional)
                      </label>
                      <input
                        type="text"
                        value={cardType}
                        onChange={(e) => setCardType(e.target.value)}
                        placeholder="Visa / Mastercard"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === "mobile_money" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Network
                      </label>
                      <select
                        value={mobileMoneyProvider}
                        onChange={(e) =>
                          setMobileMoneyProvider(
                            e.target.value as "mtn" | "airtel" | "mpesa",
                          )
                        }
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      >
                        <option value="mtn">MTN MoMo</option>
                        <option value="airtel">Airtel Money</option>
                        <option value="mpesa">M-Pesa</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={mobileMoneyPhone}
                        onChange={(e) => setMobileMoneyPhone(e.target.value)}
                        placeholder="e.g. 2567XXXXXXXX"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Reference / Transaction ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={mobileMoneyReference}
                      onChange={(e) => setMobileMoneyReference(e.target.value)}
                      placeholder="Reference"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                </div>
              )}

              {/* Bank transfer reference */}
              {paymentMethod === "bank_transfer" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. Stanbic"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Account Number
                      </label>
                      <input
                        type="text"
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value)}
                        placeholder="Account number"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Branch Code (Optional)
                      </label>
                      <input
                        type="text"
                        value={bankBranchCode}
                        onChange={(e) => setBankBranchCode(e.target.value)}
                        placeholder="Branch code"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Transfer Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={transferDate}
                        onChange={(e) => setTransferDate(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Bank Reference / Transaction ID
                    </label>
                    <input
                      type="text"
                      value={bankReference}
                      onChange={(e) => setBankReference(e.target.value)}
                      placeholder="e.g. TXN-12345"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === "split" && (
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Split Payment Methods
                  </p>
                  {splitPayments.map((row, idx) => (
                    <div
                      key={`${row.method}-${idx}`}
                      className="grid grid-cols-[1fr_1fr_auto] gap-2"
                    >
                      <select
                        value={row.method}
                        onChange={(e) => {
                          const next = [...splitPayments];
                          next[idx] = {
                            ...row,
                            method: e.target.value as SplitMethod,
                          };
                          setSplitPayments(next);
                        }}
                        className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-800"
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="mobile_money">Mobile Money</option>
                        <option value="bank_transfer">Bank</option>
                      </select>
                      <input
                        type="number"
                        min={0}
                        value={row.amount}
                        onChange={(e) => {
                          const next = [...splitPayments];
                          next[idx] = { ...row, amount: e.target.value };
                          setSplitPayments(next);
                        }}
                        placeholder="Amount"
                        className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-800"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setSplitPayments((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                        className="rounded-xl border border-red-200 px-3 py-2.5 text-xs font-semibold text-red-600"
                        disabled={splitPayments.length <= 2}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setSplitPayments((prev) => [
                        ...prev,
                        { method: "cash", amount: "", reference: "" },
                      ])
                    }
                    className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600"
                  >
                    Add Method
                  </button>
                  <div className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
                    Split total: {formatCurrency(splitTotal, currency)} /{" "}
                    {formatCurrency(cartTotal, currency)}
                  </div>
                </div>
              )}

              {/* Amount Paid */}
              {paymentMethod !== "split" && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {paymentMethod === "credit"
                      ? "Amount Paid Now (Optional)"
                      : paymentMethod === "cash"
                        ? "Amount Received"
                        : "Amount"}
                  </label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    min={0}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-center text-lg font-bold text-gray-800 transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                  {paymentMethod === "cash" &&
                    change >= 0 &&
                    parseFloat(amountPaid) > 0 && (
                      <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-2.5">
                        <span className="text-sm font-medium text-emerald-700">
                          Change
                        </span>
                        <span className="text-lg font-bold text-emerald-600">
                          {formatCurrency(change, currency)}
                        </span>
                      </div>
                    )}
                  {paymentMethod === "credit" && (
                    <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-50 px-4 py-2.5">
                      <span className="text-sm font-medium text-amber-700">
                        Remaining Balance
                      </span>
                      <span className="text-lg font-bold text-amber-700">
                        {formatCurrency(
                          Math.max(
                            0,
                            cartTotal - (parseFloat(amountPaid) || 0),
                          ),
                          currency,
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setShowPayment(false)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={completeSale}
                disabled={
                  processing ||
                  (paymentMethod === "cash" && change < 0) ||
                  (paymentMethod === "credit" &&
                    (isCreditWithoutCustomer ||
                      !creditDueDate ||
                      isBackdated(creditDueDate))) ||
                  (paymentMethod === "split" &&
                    Math.abs(splitTotal - cartTotal) > 0.01)
                }
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg disabled:opacity-50"
              >
                {processing ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {processing ? "Processing…" : "Complete Sale"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sale Complete Modal ── */}
      {showComplete && lastSale && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeCompleteModal();
            }
          }}
        >
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl">
            <button
              onClick={closeCompleteModal}
              className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close sale complete dialog"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Success Icon */}
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-500 shadow-xl shadow-emerald-500/30">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>

            <h3 className="mb-1 text-xl font-bold text-gray-800">
              Sale Complete!
            </h3>
            <p className="mb-5 text-sm text-gray-400">
              Transaction processed successfully
            </p>

            <div className="mb-6 rounded-xl bg-gray-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Sale #{lastSale.saleNumber}
              </p>
              <p className="mt-1 text-2xl font-extrabold text-orange-600">
                {formatCurrency(lastSale.total, currency)}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={printReceipt}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              <button
                onClick={closeCompleteModal}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to POS
              </button>
              {lastSale.customerName && (
                <button
                  onClick={() => {
                    const text = encodeURIComponent(
                      `Receipt: ${lastSale.saleNumber}\nTotal: ${formatCurrency(lastSale.total, currency)}\nPayment: ${lastSale.paymentMethod}\nDate: ${new Date().toLocaleDateString("en-UG")}\n\nItems:\n${lastSale.items.map((i) => `• ${i.name} x${i.quantity} = ${formatCurrency(i.total, currency)}`).join("\n")}\n\nThank you for your purchase!`,
                    );
                    window.open(`https://wa.me/?text=${text}`, "_blank");
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 transition-colors hover:bg-green-100"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </button>
              )}
              <button
                onClick={newSale}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg"
              >
                <Plus className="h-4 w-4" />
                New Sale
              </button>
            </div>

            {lastSale.paymentMethod === "credit" && lastSale.creditDueDate && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5">
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-700">
                  Credit Sale — Due:{" "}
                  {new Date(lastSale.creditDueDate).toLocaleDateString(
                    "en-UG",
                    { year: "numeric", month: "short", day: "numeric" },
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
