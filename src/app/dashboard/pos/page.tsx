"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRef } from "react";
import type { ComponentType } from "react";
import Link from "next/link";
import {
  AlertTriangle,
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
  History,
  Key,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  printHtml,
  formatCurrency,
  escapeHtml,
  getPrintBrandingMarkup,
  getPrintFooterMarkup,
  subscribeToStockSync,
} from "@/lib/utils";
import { openCashDrawer, openDrawerViaPrint } from "@/lib/hardware-client";
import {
  apiRequest,
  getApiErrorMessage,
  unwrapApiResponse,
} from "@/lib/api-client";
import {
  findBarcodeMatch,
  logBarcodeScanEvent,
  playBarcodeTone,
} from "@/lib/barcode-client";
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
  barcode?: string;
  barcodeFormat?: string;
  price: number;
  image?: string;
  category?: { _id: string; name: string };
  stock?: number;
  createdAt?: string;
  hasVariants?: boolean;
  variants?: {
    name: string;
    sku: string;
    barcode?: string;
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
  totalPurchases?: number;
  outstandingBalance?: number;
  creditLimit?: number;
  paymentStatus?: "cleared" | "partial" | "overdue";
  lastPaymentDate?: string;
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
  { key: "mobile_money", label: "Mobile Money", icon: Smartphone },
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

type ProductVariant = {
  name?: string;
  sku?: string;
  barcode?: string;
  price?: number;
  stock?: number;
  imei?: string;
};

type VariantAttributeKey = "color" | "size" | "material" | "storage";

const COLOR_TOKENS = [
  "black",
  "white",
  "blue",
  "red",
  "green",
  "yellow",
  "pink",
  "purple",
  "gray",
  "grey",
  "brown",
  "orange",
  "navy",
  "beige",
  "cream",
  "maroon",
  "gold",
  "silver",
  "lilac",
  "iceblue",
  "ice",
];

const MATERIAL_TOKENS = [
  "cotton",
  "linen",
  "wool",
  "polyester",
  "denim",
  "silk",
  "leather",
  "nylon",
  "rayon",
  "spandex",
  "fleece",
  "satin",
  "jersey",
];

const SIZE_TOKENS = [
  "xxxs",
  "xxs",
  "xs",
  "s",
  "m",
  "l",
  "xl",
  "xxl",
  "xxxl",
  "3xl",
  "4xl",
  "5xl",
];

function toTitleCase(value: string) {
  if (!value) return value;
  if (/^[0-9]+(gb|tb)$/i.test(value)) return value.toUpperCase();
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function parseVariantAttributes(name: string) {
  const tokens = name
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
  const attributes: Partial<Record<VariantAttributeKey, string>> = {};

  const size = tokens.find(
    (token) => SIZE_TOKENS.includes(token) || /^\d{2,3}$/.test(token),
  );
  if (size) attributes.size = size;

  const color = tokens.find((token) => COLOR_TOKENS.includes(token));
  if (color) attributes.color = color;

  const material = tokens.find((token) => MATERIAL_TOKENS.includes(token));
  if (material) attributes.material = material;

  const storage = tokens.find((token) => /^\d+(gb|tb)$/i.test(token));
  if (storage) attributes.storage = storage.toLowerCase();

  return attributes;
}

export default function POSTerminalPage() {
  const { tenant, user } = useSession();

  const formatInputNumber = (val: string) => {
    if (!val) return "";
    const parts = val.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };
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
  const [walkInEmail, setWalkInEmail] = useState("");
  const [expandedProductId, setExpandedProductId] = useState("");
  const [variantPickerProductId, setVariantPickerProductId] = useState("");
  const [variantSelections, setVariantSelections] = useState<
    Partial<Record<VariantAttributeKey, string>>
  >({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [creditDueDate, setCreditDueDate] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [bankReference, setBankReference] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [cardType, setCardType] = useState("");
  const [mobileMoneyProvider, setMobileMoneyProvider] = useState<
    "mtn" | "airtel"
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
  const [mobilePanel, setMobilePanel] = useState<"products" | "sale">(
    "products",
  );
  const [isCustomerSectionOpen, setIsCustomerSectionOpen] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [lastSale, setLastSale] = useState<{
    saleId?: string;
    saleNumber: string;
    total: number;
    items: { name: string; quantity: number; total: number }[];
    paymentMethod: string;
    customerName?: string;
    amountPaid: number;
    change: number;
    creditDueDate?: string;
    paymentGatewayUrl?: string;
    paymentGatewayMessage?: string;
    paymentGatewayProvider?: string;
    paymentGatewayStatus?: string;
    paymentGatewayReference?: string;
    paymentPending?: boolean;
    verificationType?: "gateway" | "manual";
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [recheckingPayment, setRecheckingPayment] = useState(false);
  const [saleError, setSaleError] = useState("");
  const [scannerAlert, setScannerAlert] = useState<{
    tone: "success" | "error";
    message: string;
    value: string;
  } | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const cartSidebarRef = useRef<HTMLDivElement | null>(null);
  const scanIntervalsRef = useRef<number[]>([]);
  const lastScannerKeyAtRef = useRef<number>(0);

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

  const fetchData = useCallback(async () => {
    try {
      const [pData, catData, custData] = await Promise.all([
        apiRequest<{ products: Product[] }>("/api/products"),
        apiRequest<{ categories: { _id: string; name: string }[] }>(
          "/api/categories",
        ),
        apiRequest<{ customers: Customer[] }>("/api/customers"),
      ]);
      setProducts(pData.products || []);
      setCategories(catData.categories || []);
      setCustomers(custData.customers || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const intervalId = window.setInterval(fetchData, 10000);
    const handleWindowFocus = () => {
      fetchData();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchData();
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const unsubscribeStockSync = subscribeToStockSync(() => {
      fetchData();
    });

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      unsubscribeStockSync();
    };
  }, [fetchData]);

  useEffect(() => {
    if (showPayment || showComplete || showCreateCustomerModal) return;
    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 60);
    return () => window.clearTimeout(timer);
  }, [
    showPayment,
    showComplete,
    showCreateCustomerModal,
    variantPickerProductId,
  ]);

  useEffect(() => {
    if (!scannerAlert) return;
    const timer = window.setTimeout(() => setScannerAlert(null), 4000);
    return () => window.clearTimeout(timer);
  }, [scannerAlert]);

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

  function getStockCapForLine(product: Product, variant?: ProductVariant) {
    if (variant && typeof variant.stock === "number") return variant.stock;
    if (!variant && typeof product.stock === "number") return product.stock;
    return undefined;
  }

  function getStockCapForCartItem(item: CartItem) {
    const source = products.find((product) => product._id === item._id);
    if (!source) return undefined;
    if (item.variantSku) {
      const sourceVariant = source.variants?.find(
        (variant) => variant.sku === item.variantSku,
      );
      return typeof sourceVariant?.stock === "number"
        ? sourceVariant.stock
        : undefined;
    }
    return typeof source.stock === "number" ? source.stock : undefined;
  }

  function addToCart(product: Product, variant?: ProductVariant) {
    const variantSku = variant?.sku?.trim();
    const lineKey = `${product._id}:${variantSku || "base"}`;
    const displayName = variant
      ? `${product.name} - ${variant.name || "Variant"}`
      : product.name;
    const linePrice = variant?.price ?? product.price;
    const lineSku = variantSku || product.sku;
    const stockCap = getStockCapForLine(product, variant);
    let stockError = "";

    setCart((prev) => {
      const existing = prev.find((i) => i.lineKey === lineKey);
      const existingQty = existing?.quantity || 0;

      if (typeof stockCap === "number" && existingQty >= stockCap) {
        stockError =
          stockCap <= 0
            ? `"${displayName}" is out of stock.`
            : `Only ${stockCap} in stock for "${displayName}".`;
        return prev;
      }

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
          variantName: variant?.name || undefined,
          variantSku: variantSku || undefined,
        },
      ];
    });

    if (stockError) {
      setSaleError(stockError);
      return;
    }

    setSaleError("");
    setExpandedProductId("");
  }

  function resetScannerTiming() {
    scanIntervalsRef.current = [];
    lastScannerKeyAtRef.current = 0;
  }

  function clearSearchInput() {
    setSearch("");
    if (searchInputRef.current) {
      searchInputRef.current.value = "";
      searchInputRef.current.focus();
    }
  }

  function isLikelyScannerInput(value: string, intervals: number[]) {
    const trimmedValue = value.trim();
    if (trimmedValue.length < 4) return false;

    const expectedSamples = Math.min(trimmedValue.length - 1, 6);
    const recentIntervals = intervals.slice(-expectedSamples);
    if (recentIntervals.length < Math.min(trimmedValue.length - 1, 3)) {
      return false;
    }

    const averageGap =
      recentIntervals.reduce((sum, gap) => sum + gap, 0) /
      recentIntervals.length;
    const maxGap = Math.max(...recentIntervals);

    return averageGap < 35 && maxGap < 80;
  }

  async function handleBarcodeScan(rawValue: string) {
    const value = rawValue.trim();
    if (!value) return;

    const match = findBarcodeMatch(products, value);

    if (match) {
      addToCart(match.product, match.variant);
      clearSearchInput();
      setScannerAlert({
        tone: "success",
        value,
        message: `Added ${match.variant?.name || match.product.name} to the sale.`,
      });
      if (tenant?.settings?.barcodeScanSound !== false) {
        playBarcodeTone("success");
      }
      void logBarcodeScanEvent({
        value,
        context: "pos",
        source: "scanner",
        module: "sales",
        scanAction: "added_to_sale",
        result: "found",
        productId: match.product._id,
        productName: match.variant?.name
          ? `${match.product.name} - ${match.variant.name}`
          : match.product.name,
        productSku: match.variant?.sku || match.product.sku,
        locationId: user?.branchId,
      }).catch(() => {
        /* ignore */
      });
      return;
    }

    clearSearchInput();
    setScannerAlert({
      tone: "error",
      value,
      message: `Product not found for barcode ${value}.`,
    });
    if (tenant?.settings?.barcodeFailedScanAlert !== false) {
      playBarcodeTone("error");
    }
    void logBarcodeScanEvent({
      value,
      context: "pos",
      source: "scanner",
      module: "sales",
      scanAction: "not_found",
      result: "not_found",
      locationId: user?.branchId,
    }).catch(() => {
      /* ignore */
    });
  }

  function setQty(lineKey: string, value: number) {
    let stockError = "";
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.lineKey !== lineKey) return i;
          const nextQty = Math.max(0, value);
          const stockCap = getStockCapForCartItem(i);
          if (typeof stockCap === "number" && nextQty > stockCap) {
            stockError =
              stockCap <= 0
                ? `"${i.name}" is out of stock.`
                : `Only ${stockCap} in stock for "${i.name}".`;
            return i;
          }
          return { ...i, quantity: nextQty };
        })
        .filter((i) => i.quantity > 0),
    );

    if (stockError) {
      setSaleError(stockError);
      return;
    }
    setSaleError("");
  }

  function updateQty(lineKey: string, delta: number) {
    const item = cart.find((i) => i.lineKey === lineKey);
    if (item) {
      setQty(lineKey, item.quantity + delta);
    }
  }

  function removeItem(lineKey: string) {
    setCart((prev) => prev.filter((i) => i.lineKey !== lineKey));
  }

  async function quickCreateCustomer() {
    if (!newCustomerName.trim() || creatingCustomer) return;
    setCreatingCustomer(true);
    try {
      const created = await apiRequest<Customer | { customer: Customer }>(
        "/api/customers",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newCustomerName.trim(),
            phone: newCustomerPhone.trim(),
            email: newCustomerEmail.trim(),
          }),
        },
      );

      const customer =
        "customer" in created ? created.customer : (created as Customer);

      setCustomers((prev) => [customer, ...prev]);
      setSelectedCustomer(customer._id);
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
    if (isWalkInCustomer && paymentMethod === "credit") {
      setPaymentMethod("cash");
    }
    setAmountPaid(orderGrandTotal.toFixed(2));
    setWalkInEmail(selectedCustomerRecord?.email || walkInEmail || "");
    setCreditDueDate("");
    setCreditNote("");
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

  const variantPickerProduct = useMemo(
    () => products.find((product) => product._id === variantPickerProductId),
    [products, variantPickerProductId],
  );

  const variantOptionsByAttribute = useMemo(() => {
    const source = variantPickerProduct?.variants || [];
    const options: Record<VariantAttributeKey, Set<string>> = {
      color: new Set<string>(),
      size: new Set<string>(),
      material: new Set<string>(),
      storage: new Set<string>(),
    };

    for (const variant of source) {
      const attrs = parseVariantAttributes(variant.name || "");
      for (const key of Object.keys(attrs) as VariantAttributeKey[]) {
        const value = attrs[key];
        if (value) options[key].add(value);
      }
    }

    return {
      color: Array.from(options.color),
      size: Array.from(options.size),
      material: Array.from(options.material),
      storage: Array.from(options.storage),
    };
  }, [variantPickerProduct]);

  const resolvedVariantForPicker = useMemo(() => {
    if (!variantPickerProduct?.variants?.length) return null;

    const matches = variantPickerProduct.variants.filter((variant) => {
      const attrs = parseVariantAttributes(variant.name || "");
      return (Object.keys(variantSelections) as VariantAttributeKey[]).every(
        (key) =>
          !variantSelections[key] || attrs[key] === variantSelections[key],
      );
    });

    return matches[0] || variantPickerProduct.variants[0];
  }, [variantPickerProduct, variantSelections]);

  useEffect(() => {
    if (!variantPickerProduct?.variants?.length) {
      setVariantSelections({});
      return;
    }

    const firstVariantAttrs = parseVariantAttributes(
      variantPickerProduct.variants[0].name || "",
    );
    setVariantSelections((previous) => ({
      ...firstVariantAttrs,
      ...previous,
    }));
  }, [variantPickerProduct]);

  async function completeSale() {
    if (processing) return;

    const validateOrder = () => {
      const errors: string[] = [];

      // Issue #1: Walk-in + credit block
      if (paymentMethod === "credit" && !selectedCustomer) {
        errors.push("Credit sales require a saved customer profile");
      }

      if (creditLimitExceeded) {
        errors.push(
          `This credit sale exceeds the customer's limit by ${formatCurrency(creditLimitOverage, currency)}`,
        );
      }

      // Issue #3: Backdated due-date block
      if (paymentMethod === "credit" && isBackdated(creditDueDate)) {
        errors.push("Due date cannot be in the past");
      }

      // Issue #2: Currency support guard
      if (!supportedCurrencies.has(String(currency).toUpperCase())) {
        errors.push("Selected currency is not supported");
      }

      for (const item of cart) {
        const stockCap = getStockCapForCartItem(item);
        if (typeof stockCap === "number" && item.quantity > stockCap) {
          errors.push(
            stockCap <= 0
              ? `${item.name} is now out of stock`
              : `${item.name} has only ${stockCap} in stock`,
          );
        }
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
        if (Math.abs(splitTotal - orderGrandTotal) > 0.01) {
          errors.push(
            "Split payment amounts must add up to the total amount due",
          );
        }
      }

      if (errors.length > 0) {
        setSaleError(errors.join(" "));
        toast.error("Fix the payment fields before continuing.");
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
            : orderGrandTotal;

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
          paymentContactEmail:
            selectedCustomerRecord?.email || walkInEmail.trim() || undefined,
          paymentMethod,
          subtotal: orderSubtotal,
          totalTax: orderTax,
          total: orderGrandTotal,
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
          ...(paymentMethod === "credit" &&
            creditNote.trim() && { creditNote: creditNote.trim() }),
          ...(paymentMethod === "bank_transfer" &&
            bankReference && { reference: bankReference }),
        }),
      });
      const payload = (await res.json()) as unknown;
      const data = unwrapApiResponse<{
        sale?: {
          _id?: string;
          orderNumber?: string;
          paymentDetails?: {
            checkoutUrl?: string;
            gatewayProvider?: string;
            gatewayReference?: string;
            gatewayStatus?: string;
            gatewayError?: string;
          };
          status?: string;
        };
        paymentGateway?: {
          checkoutUrl?: string;
          provider?: string;
          message?: string;
        };
        paymentVerificationRequired?: boolean;
        verificationType?: "gateway" | "manual";
      }>(payload);
      if (res.ok) {
        await fetchData();
        const paymentPending = Boolean(
          data.paymentVerificationRequired ||
          data.paymentGateway?.checkoutUrl ||
          data.sale?.status === "pending",
        );
        // Proactive: Open drawer on cash completion
        if (paymentMethod === "cash" || paymentMethod === "split") {
          void openCashDrawer().catch(() => openDrawerViaPrint());
        }

        setLastSale({
          saleId: data.sale?._id,
          saleNumber: data.sale?.orderNumber || "N/A",
          total: orderGrandTotal,
          items: cart.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            total: item.price * item.quantity,
          })),
          paymentMethod,
          customerName: selectedCustomerRecord?.name || walkInName.trim(),
          amountPaid: paymentPending ? 0 : resolvedAmountPaid,
          change: paymentPending
            ? 0
            : paymentMethod === "cash"
              ? Math.max(0, change)
              : 0,
          creditDueDate: paymentMethod === "credit" ? creditDueDate : undefined,
          paymentGatewayUrl:
            data.paymentGateway?.checkoutUrl ||
            data.sale?.paymentDetails?.checkoutUrl,
          paymentGatewayMessage: data.paymentGateway?.message,
          paymentGatewayProvider:
            data.paymentGateway?.provider ||
            data.sale?.paymentDetails?.gatewayProvider,
          paymentGatewayStatus: data.sale?.paymentDetails?.gatewayStatus,
          paymentGatewayReference: data.sale?.paymentDetails?.gatewayReference,
          paymentPending,
          verificationType: data.verificationType,
        });
        if (paymentPending) {
          if (data.verificationType === "manual") {
            toast.success("Sale saved pending payment verification.");
          } else {
            toast.success(
              "Payment link created. Open it to complete the transaction.",
            );
          }
        } else {
          toast.success("Sale completed successfully.");
        }
        setShowPayment(false);
        setShowComplete(true);
        setCart([]);
        setSelectedCustomer("");
        setWalkInName("");
        setWalkInPhone("");
        setWalkInEmail("");
        setPaymentMethod("cash");
        setAmountPaid("");
        setSaleError("");
      } else {
        setSaleError(getApiErrorMessage(payload, "Failed to complete sale"));
        toast.error(getApiErrorMessage(payload, "Failed to complete sale"));
      }
    } catch {
      setSaleError("Failed to complete sale. Please try again.");
      toast.error("Failed to complete sale. Please try again.");
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

  async function handleOpenDrawer() {
    try {
      const waitToast = toast.loading("Connecting to drawer...");
      try {
        await openCashDrawer();
        toast.success("Drawer opened", { id: waitToast });
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Failed to open via Serial",
          {
            id: waitToast,
          },
        );
        // Fallback: Driver-based kick via print
        openDrawerViaPrint();
      }
    } catch {
      toast.error("An error occurred. Check browser permissions.");
    }
  }

  async function recheckPesapalStatus() {
    if (
      !lastSale ||
      recheckingPayment ||
      lastSale.paymentGatewayProvider !== "pesapal" ||
      !lastSale.saleId
    ) {
      return;
    }

    setRecheckingPayment(true);

    try {
      const params = new URLSearchParams({ saleId: lastSale.saleId });
      const res = await fetch(
        `/api/integrations/pesapal/recheck?${params.toString()}`,
      );
      const payload = await res.json();

      if (!res.ok || !payload.success) {
        toast.error(payload.message || "Failed to recheck Pesapal status");
        return;
      }

      const completed = Boolean(payload.completed);
      const statusCode = String(payload.statusCode || "");
      const message = payload.message || "Pesapal status checked";

      setLastSale((current) =>
        current
          ? {
              ...current,
              paymentPending: !completed,
              amountPaid: completed ? current.total : current.amountPaid,
              change: completed ? 0 : current.change,
              paymentGatewayMessage: message,
              paymentGatewayStatus: statusCode,
              paymentGatewayProvider: "pesapal",
            }
          : current,
      );

      if (completed) {
        toast.success(message);
      } else if (statusCode.toUpperCase() === "FAILED") {
        toast.error(message);
      } else {
        toast(message);
      }

      await fetchData();
    } catch {
      toast.error("Failed to recheck Pesapal status");
    } finally {
      setRecheckingPayment(false);
    }
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

  const change = (parseFloat(amountPaid) || 0) - orderGrandTotal;
  const selectedCustomerRecord = customers.find(
    (customer) => customer._id === selectedCustomer,
  );
  const selectedCustomerOutstanding =
    selectedCustomerRecord?.outstandingBalance || 0;
  const selectedCustomerCreditLimit = selectedCustomerRecord?.creditLimit || 0;
  const projectedCreditBalance =
    paymentMethod === "credit"
      ? selectedCustomerOutstanding +
        Math.max(0, orderGrandTotal - (parseFloat(amountPaid) || 0))
      : selectedCustomerOutstanding;
  const creditLimitExceeded =
    paymentMethod === "credit" &&
    selectedCustomerCreditLimit > 0 &&
    projectedCreditBalance > selectedCustomerCreditLimit;
  const creditLimitOverage = Math.max(
    0,
    projectedCreditBalance - selectedCustomerCreditLimit,
  );
  const availablePaymentOptions = PAYMENT_OPTIONS;
  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomer(customerId);
    const nextCustomer = customers.find(
      (customer) => customer._id === customerId,
    );
    if (nextCustomer) {
      setCustomerSearch(nextCustomer.name);
      setWalkInName("");
      setWalkInPhone("");
      setWalkInEmail("");
    }

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches
    ) {
      setIsCustomerSectionOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center rounded-[28px] border border-gray-200/70 bg-linear-to-br from-gray-50 to-gray-100 shadow-sm">
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
    <div className="flex min-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-[28px] border border-gray-200/70 bg-linear-to-br from-gray-50 to-gray-100/80 shadow-sm lg:h-[calc(100vh-7rem)] lg:flex-row">
      <div className="flex items-center gap-2 border-b border-gray-200/80 bg-white/90 px-4 py-2.5 lg:hidden">
        <button
          type="button"
          onClick={() => setMobilePanel("products")}
          className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
            mobilePanel === "products"
              ? "bg-linear-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          Products
        </button>
        <button
          type="button"
          onClick={() => setMobilePanel("sale")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
            mobilePanel === "sale"
              ? "bg-linear-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          <span>Current Sale</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
            {cartCount}
          </span>
        </button>
      </div>
      {/* ── Left: Products ── */}
      <div
        className={`${mobilePanel === "sale" ? "hidden" : "flex"} flex-1 flex-col overflow-hidden lg:flex`}
      >
        {scannerAlert && (
          <div
            className={`mx-4 mt-4 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${scannerAlert.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}
          >
            <div className="flex items-start gap-3">
              {scannerAlert.tone === "success" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4" />
              )}
              <div>
                <p className="font-semibold">{scannerAlert.message}</p>
                <p className="mt-1 text-xs opacity-80">
                  Scanner input is auto-detected when characters arrive in under
                  50ms each.
                </p>
              </div>
            </div>
            {scannerAlert.tone === "error" && (
              <Link
                href={`/dashboard/inventory?search=${encodeURIComponent(scannerAlert.value)}`}
                className="rounded-xl border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                Add To Inventory
              </Link>
            )}
          </div>
        )}

        {/* Top Bar */}
        <div className="relative z-30 flex items-center gap-3 border-b border-gray-200/80 bg-white/80 px-5 py-3 backdrop-blur-sm">
          <div className="flex h-10 flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/80 px-3 transition-colors focus-within:border-orange-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-500/20">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search products by name, SKU, or scan barcode…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  const currentValue = event.currentTarget.value.trim();
                  const isScannerInput = isLikelyScannerInput(
                    currentValue,
                    scanIntervalsRef.current,
                  );

                  if (isScannerInput) {
                    event.preventDefault();
                    void handleBarcodeScan(currentValue);
                    resetScannerTiming();
                    return;
                  }

                  resetScannerTiming();
                  return;
                }

                if (
                  event.key.length === 1 &&
                  !event.altKey &&
                  !event.ctrlKey &&
                  !event.metaKey
                ) {
                  const now = performance.now();
                  if (lastScannerKeyAtRef.current > 0) {
                    scanIntervalsRef.current = [
                      ...scanIntervalsRef.current.slice(-18),
                      now - lastScannerKeyAtRef.current,
                    ];
                  }
                  lastScannerKeyAtRef.current = now;
                  return;
                }

                if (event.key === "Backspace" || event.key === "Escape") {
                  resetScannerTiming();
                }
              }}
              onBlur={(event) => {
                if (showPayment || showComplete || showCreateCustomerModal)
                  return;
                const nextTarget = event.relatedTarget;
                if (
                  nextTarget instanceof Node &&
                  cartSidebarRef.current?.contains(nextTarget)
                )
                  return;
                window.setTimeout(() => searchInputRef.current?.focus(), 40);
              }}
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
          <div className="relative z-40">
            <button
              onClick={() => setShowSort(!showSort)}
              className="flex h-10 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-600 transition-colors hover:bg-gray-50"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              Sort
            </button>
            {showSort && (
              <div className="absolute right-0 top-full z-90 mt-1 w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
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

          <button
            type="button"
            onClick={() => setMobilePanel("sale")}
            className="flex items-center gap-1.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-3.5 py-2 text-white shadow-md shadow-orange-500/20 transition-transform hover:scale-[1.02]"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="text-sm font-bold">{cartCount}</span>
          </button>
        </div>

        <div className="border-b border-gray-100 bg-white/70 px-5 py-2 text-xs text-gray-500">
          USB HID, Bluetooth HID, and serial scanners can stay on the product
          search field. Repeated scans increment quantity instead of creating
          duplicate lines.
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto border-b border-gray-100 bg-white/60 px-5 py-2.5 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              selectedCategory === "all"
                ? "bg-linear-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20"
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
                  ? "bg-linear-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20"
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
                const hasVariants = (p.variants?.length || 0) > 0;
                const baseLineKey = `${p._id}:base`;
                const baseInCartQty =
                  cart.find((item) => item.lineKey === baseLineKey)?.quantity ||
                  0;
                const baseStockRemaining =
                  typeof p.stock === "number"
                    ? p.stock - baseInCartQty
                    : undefined;
                const sellableVariantCount = hasVariants
                  ? (p.variants || []).filter((variant) => {
                      const variantLineKey = `${p._id}:${variant.sku}`;
                      const variantInCartQty =
                        cart.find((item) => item.lineKey === variantLineKey)
                          ?.quantity || 0;
                      return variant.stock - variantInCartQty > 0;
                    }).length
                  : 0;
                const isOutOfStock = hasVariants
                  ? sellableVariantCount === 0
                  : typeof baseStockRemaining === "number" &&
                    baseStockRemaining <= 0;
                return (
                  <button
                    key={p._id}
                    disabled={isOutOfStock}
                    onClick={() => {
                      if (hasVariants) {
                        setExpandedProductId((current) =>
                          current === p._id ? "" : p._id,
                        );
                        setVariantPickerProductId((current) =>
                          current === p._id ? "" : p._id,
                        );
                        return;
                      }
                      setVariantPickerProductId("");
                      addToCart(p);
                    }}
                    className={`group relative flex flex-col rounded-2xl border bg-white p-3 text-left transition-all ${
                      isOutOfStock
                        ? "cursor-not-allowed border-red-200 bg-red-50/20 opacity-75"
                        : "hover:shadow-lg hover:shadow-gray-200/60"
                    } ${
                      inCartQty > 0
                        ? "border-orange-300 ring-2 ring-orange-500/20"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    {/* Product Image */}
                    <div className="mb-2.5 flex h-20 items-center justify-center rounded-xl bg-linear-to-br from-gray-50 to-gray-100 overflow-hidden">
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
                    {hasVariants && (
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-500">
                        {p.variants?.length} variants - tap to expand
                      </p>
                    )}

                    <div className="mt-auto flex items-end justify-between pt-2">
                      <span className="text-[15px] font-bold text-orange-600">
                        {formatCurrency(p.price, currency)}
                      </span>
                      {isOutOfStock ? (
                        <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                          Out
                        </span>
                      ) : hasVariants ? (
                        <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
                          {sellableVariantCount} in stock
                        </span>
                      ) : typeof baseStockRemaining === "number" ? (
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                            baseStockRemaining <= 5
                              ? "bg-red-50 text-red-600"
                              : "bg-gray-50 text-gray-400"
                          }`}
                        >
                          {baseStockRemaining}
                        </span>
                      ) : null}
                    </div>

                    {isOutOfStock && (
                      <div className="mt-1 rounded-md bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600">
                        Out of stock
                      </div>
                    )}

                    {inCartQty > 0 && (
                      <div className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-linear-to-br from-orange-500 to-amber-600 text-[11px] font-bold text-white shadow-md shadow-orange-500/30">
                        {inCartQty}
                      </div>
                    )}

                    {expandedProductId === p._id && hasVariants && (
                      <div className="mt-2 space-y-1 rounded-xl border border-blue-100 bg-blue-50/40 p-2">
                        {p.variants?.map((variant) => {
                          const variantLineKey = `${p._id}:${variant.sku}`;
                          const variantInCartQty =
                            cart.find((item) => item.lineKey === variantLineKey)
                              ?.quantity || 0;
                          const variantRemaining =
                            variant.stock - variantInCartQty;
                          const variantOutOfStock = variantRemaining <= 0;

                          return (
                            <button
                              key={`${p._id}-${variant.sku}`}
                              disabled={variantOutOfStock}
                              onClick={(event) => {
                                event.stopPropagation();
                                addToCart(p, variant);
                              }}
                              className={`flex w-full items-center justify-between rounded-lg border px-2 py-1.5 text-left ${
                                variantOutOfStock
                                  ? "cursor-not-allowed border-red-100 bg-red-50/40 text-red-400"
                                  : "border-blue-100 bg-white hover:border-orange-300 hover:bg-orange-50/30"
                              }`}
                            >
                              <span className="text-[11px] font-semibold text-gray-700">
                                {variant.name}
                                {variant.imei ? ` (IMEI ${variant.imei})` : ""}
                              </span>
                              <span className="text-[11px] text-gray-500">
                                {formatCurrency(variant.price, currency)} -{" "}
                                {variantOutOfStock ? "Out" : variantRemaining}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {variantPickerProduct &&
            (variantPickerProduct.variants?.length || 0) > 0 && (
              <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">
                      {variantPickerProduct.name} - choose variant
                    </h3>
                    <p className="text-sm text-gray-500">
                      Select available color, size, material, or storage.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVariantPickerProductId("")}
                    className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>

                {(
                  Object.keys(
                    variantOptionsByAttribute,
                  ) as VariantAttributeKey[]
                )
                  .filter((key) => variantOptionsByAttribute[key].length > 0)
                  .map((key) => (
                    <div key={key} className="mb-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                        {key}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {variantOptionsByAttribute[key].map((option) => (
                          <button
                            key={`${key}-${option}`}
                            type="button"
                            onClick={() =>
                              setVariantSelections((previous) => ({
                                ...previous,
                                [key]: option,
                              }))
                            }
                            className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition-colors ${
                              variantSelections[key] === option
                                ? "border-orange-400 bg-orange-50 text-orange-700"
                                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {toTitleCase(option)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                {resolvedVariantForPicker && (
                  <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2.5">
                    <span className="text-sm font-semibold text-blue-800">
                      {resolvedVariantForPicker.name}
                    </span>
                    <span className="text-xs font-medium text-blue-700">
                      SKU: {resolvedVariantForPicker.sku}
                    </span>
                    <span className="text-xs font-medium text-blue-700">
                      Stock:{" "}
                      {(() => {
                        const lineKey = `${variantPickerProduct._id}:${resolvedVariantForPicker.sku}`;
                        const inCartQty =
                          cart.find((item) => item.lineKey === lineKey)
                            ?.quantity || 0;
                        const remaining =
                          resolvedVariantForPicker.stock - inCartQty;
                        return remaining <= 0 ? "Out" : remaining;
                      })()}
                    </span>
                    <span className="text-sm font-bold text-orange-700">
                      {formatCurrency(resolvedVariantForPicker.price, currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        addToCart(
                          variantPickerProduct,
                          resolvedVariantForPicker,
                        )
                      }
                      disabled={(() => {
                        const lineKey = `${variantPickerProduct._id}:${resolvedVariantForPicker.sku}`;
                        const inCartQty =
                          cart.find((item) => item.lineKey === lineKey)
                            ?.quantity || 0;
                        return resolvedVariantForPicker.stock - inCartQty <= 0;
                      })()}
                      className="ml-auto rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Add Variant
                    </button>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>

      {/* ── Right: Cart Sidebar ── */}
      <div
        ref={cartSidebarRef}
        className={`${mobilePanel === "products" ? "hidden" : "flex"} min-h-[42vh] max-h-[calc(100vh-12rem)] w-full flex-col overflow-hidden border-t border-gray-200/80 bg-white lg:flex lg:min-h-0 lg:max-h-none lg:w-90 lg:border-l lg:border-t-0`}
      >
        {/* Cart Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-orange-500 to-amber-600 shadow-md shadow-orange-500/20">
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
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
            >
              Clear
            </button>
          )}
        </div>

        {/* Customer Selector */}
        <div className="border-b border-gray-100 px-5 py-3">
          <div className="mb-1.5 flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              <User className="h-3 w-3" />
              Customer
            </label>
            <button
              type="button"
              onClick={() => setIsCustomerSectionOpen((previous) => !previous)}
              className="rounded-md border border-gray-200 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40 lg:hidden"
            >
              {isCustomerSectionOpen ? "Hide" : "Show"}
            </button>
          </div>

          <div className={isCustomerSectionOpen ? "block" : "hidden lg:block"}>
            <input
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search customer by name, phone..."
              className="mb-2 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-700 transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
            <div className="max-h-44 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-sm scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer("");
                  setCustomerSearch("");
                  setWalkInName("");
                  setWalkInPhone("");
                  setWalkInEmail("");
                  if (paymentMethod === "credit") {
                    setPaymentMethod("cash");
                    setCreditDueDate("");
                  }
                }}
                className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${!selectedCustomer ? "bg-orange-50 text-orange-700" : "text-gray-700 hover:bg-gray-50"}`}
              >
                <span>Walk-in Customer</span>
                {!selectedCustomer && (
                  <span className="text-[11px] font-semibold">Selected</span>
                )}
              </button>
              {filteredCustomers.length === 0 ? (
                <div className="px-3 py-3 text-xs text-gray-400">
                  No customers found.
                </div>
              ) : (
                filteredCustomers.map((c) => {
                  const active = selectedCustomer === c._id;
                  return (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => handleSelectCustomer(c._id)}
                      className={`mb-1 flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors ${active ? "bg-orange-50 text-orange-700" : "text-gray-700 hover:bg-gray-50"}`}
                    >
                      <span className="text-sm font-medium">{c.name}</span>
                      <span className="text-[11px] text-gray-400">
                        {c.phone || c.email || "No contact details"}
                        {(c.outstandingBalance || 0) > 0
                          ? ` • Bal ${formatCurrency(c.outstandingBalance || 0, currency)}`
                          : ""}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
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
                <input
                  value={walkInEmail}
                  onChange={(e) => setWalkInEmail(e.target.value)}
                  placeholder="Email for payment link"
                  className="col-span-2 rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-700 transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
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

          {!isCustomerSectionOpen && (
            <p className="text-[11px] text-gray-400 lg:hidden">
              Customer panel collapsed for more checkout space.
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
        <div className="min-h-0 flex-1 overflow-y-auto">
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
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-orange-50 to-amber-50">
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
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        setQty(item.lineKey, parseFloat(e.target.value) || 0)
                      }
                      className="w-12 border-none bg-transparent text-center text-xs font-bold text-gray-700 focus:outline-none focus:ring-0"
                      step="any"
                      min="0"
                    />
                    <button
                      onClick={() => updateQty(item.lineKey, 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50"
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
                      className="text-gray-400 opacity-100 transition-all hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
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
              <span>{formatCurrency(orderSubtotal, currency)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Tax</span>
              <span>{formatCurrency(orderTax, currency)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2">
              <span className="text-[15px] font-bold text-gray-800">Total</span>
              <span className="text-[15px] font-bold text-orange-600">
                {formatCurrency(orderGrandTotal, currency)}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleOpenDrawer}
              title="Open Cash Drawer (No Sale)"
              className="flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 h-12 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600 hover:shadow-sm"
            >
              <Key className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={openPayment}
              disabled={cart.length === 0}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:shadow-xl hover:shadow-orange-500/30 disabled:opacity-40 disabled:shadow-none"
            >
              <Banknote className="h-4 w-4" />
              Charge {formatCurrency(orderGrandTotal, currency)}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {showCreateCustomerModal && (
        <div
          className="fixed inset-0 z-65 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-all"
          onClick={() => setShowCreateCustomerModal(false)}
        >
          <div
            className="w-full max-w-md flex flex-col max-h-full overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl scrollbar-hide"
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
                className="flex-1 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {creatingCustomer ? "Saving..." : "Save Customer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Modal ── */}
      {showPayment && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-sm p-2 sm:p-4 transition-all">
          <div className="flex max-h-full w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl overflow-hidden animate-fade-zoom-in">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/20">
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

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              {saleError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {saleError}
                </div>
              )}

              {/* Total Display */}
              <div className="rounded-xl bg-linear-to-br from-orange-500 to-amber-600 p-4 sm:p-5 text-center text-white shadow-lg shadow-orange-500/20">
                <p className="mb-1 text-[10px] sm:text-xs font-medium uppercase tracking-wider text-orange-100">
                  Amount Due
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold">
                  {formatCurrency(orderGrandTotal, currency)}
                </p>
              </div>

              {(paymentMethod === "card" ||
                paymentMethod === "mobile_money") && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <p className="font-semibold text-slate-800">
                    Payment contact
                  </p>
                  <p className="mt-1 text-[12px] text-slate-500">
                    {selectedCustomerRecord?.email || walkInEmail
                      ? `Gateway checkout will use ${selectedCustomerRecord?.email || walkInEmail}.`
                      : "Add an email before charging a card or mobile money payment. The sale will fall back to manual recording if no email is provided."}
                  </p>
                </div>
              )}

              {(paymentMethod === "card" ||
                paymentMethod === "mobile_money") && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Payment Email
                  </label>
                  <input
                    type="email"
                    value={walkInEmail}
                    onChange={(e) => setWalkInEmail(e.target.value)}
                    placeholder="customer@email.com"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
              )}

              {/* Payment Method */}
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {availablePaymentOptions.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => {
                        setPaymentMethod(m.key);
                        if (m.key !== "split" && m.key !== "credit") {
                          setAmountPaid(orderGrandTotal.toString());
                        } else if (m.key === "credit") {
                          setAmountPaid("");
                        }
                      }}
                      className={`flex flex-col items-center gap-1 rounded-xl border-2 px-1 py-2.5 transition-all ${
                        paymentMethod === m.key
                          ? m.key === "credit"
                            ? "border-amber-500 bg-amber-50 text-amber-700 shadow-sm"
                            : "border-orange-500 bg-orange-50 text-orange-700 shadow-sm"
                          : "border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <m.icon className="h-4 w-4 sm:h-5 sm:w-5" />
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
                          <span
                            className={
                              (selectedCustomerRecord.outstandingBalance || 0) >
                              0
                                ? "font-semibold text-red-600"
                                : "font-semibold"
                            }
                          >
                            {formatCurrency(
                              selectedCustomerRecord.outstandingBalance || 0,
                              currency,
                            )}
                          </span>
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
                        <div>
                          Total Purchases:{" "}
                          {selectedCustomerRecord.totalPurchases || 0}
                        </div>
                        <div>
                          Last Payment:{" "}
                          {selectedCustomerRecord.lastPaymentDate
                            ? new Date(
                                selectedCustomerRecord.lastPaymentDate,
                              ).toLocaleDateString("en-UG")
                            : "—"}
                        </div>
                        <div className="col-span-2">
                          Payment Status:{" "}
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              selectedCustomerRecord.paymentStatus === "overdue"
                                ? "bg-red-100 text-red-700"
                                : selectedCustomerRecord.paymentStatus ===
                                    "partial"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {selectedCustomerRecord.paymentStatus || "cleared"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {creditLimitExceeded && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      This credit sale would exceed the customer&apos;s credit
                      limit by{" "}
                      <span className="font-semibold">
                        {formatCurrency(creditLimitOverage, currency)}
                      </span>
                      .
                    </div>
                  )}
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Due Date (Optional)
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
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Credit Note (Optional)
                    </label>
                    <textarea
                      value={creditNote}
                      onChange={(e) => setCreditNote(e.target.value)}
                      rows={2}
                      placeholder="Reason or reference for credit"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === "card" && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
                    Card payments are verified on the Pesapal checkout page. The
                    POS only creates the secure payment link.
                  </div>
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
                            e.target.value as "mtn" | "airtel",
                          )
                        }
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      >
                        <option value="mtn">MTN MoMo</option>
                        <option value="airtel">Airtel Money</option>
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
                        type="text"
                        value={formatInputNumber(row.amount)}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/,/g, "");
                          if (clean === "" || /^\d*\.?\d*$/.test(clean)) {
                            const next = [...splitPayments];
                            next[idx] = { ...row, amount: clean };
                            setSplitPayments(next);
                          }
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
                        className="rounded-xl border border-red-200 px-3 py-2.5 text-xs font-semibold text-red-600 disabled:opacity-50"
                        disabled={splitPayments.length <= 1}
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
                    {formatCurrency(orderGrandTotal, currency)}
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
                    type="text"
                    value={formatInputNumber(amountPaid)}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/,/g, "");
                      if (clean === "" || /^\d*\.?\d*$/.test(clean)) {
                        setAmountPaid(clean);
                      }
                    }}
                    placeholder="0"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-center text-lg font-bold text-gray-800 transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                  {paymentMethod === "cash" && (
                    <div
                      className={`mt-3 flex items-center justify-between rounded-xl px-4 py-2.5 ${change >= 0 ? "bg-emerald-50" : "bg-red-50"}`}
                    >
                      <span
                        className={`text-sm font-medium ${change >= 0 ? "text-emerald-700" : "text-red-700"}`}
                      >
                        {change >= 0 ? "Change" : "Balance Due"}
                      </span>
                      <span
                        className={`text-lg font-bold ${change >= 0 ? "text-emerald-600" : "text-red-600"}`}
                      >
                        {formatCurrency(Math.abs(change), currency)}
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
                            orderGrandTotal - (parseFloat(amountPaid) || 0),
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
            <div className="shrink-0 flex gap-3 border-t border-gray-100 px-6 py-4 bg-gray-50/30">
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
                      creditLimitExceeded ||
                      isBackdated(creditDueDate))) ||
                  (paymentMethod === "split" &&
                    Math.abs(splitTotal - orderGrandTotal) > 0.01)
                }
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg disabled:opacity-50"
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
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-all"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeCompleteModal();
            }
          }}
        >
          <div className="relative w-full max-w-sm flex flex-col max-h-full overflow-y-auto rounded-2xl bg-white p-8 text-center shadow-2xl scrollbar-hide animate-fade-zoom-in">
            <button
              onClick={closeCompleteModal}
              className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close sale complete dialog"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Success Icon */}
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-emerald-400 to-green-500 shadow-xl shadow-emerald-500/30">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>

            <h3 className="mb-1 text-xl font-bold text-gray-800">
              {lastSale.paymentPending ? "Payment Pending" : "Sale Complete!"}
            </h3>
            <p className="mb-5 text-sm text-gray-400">
              {lastSale.paymentPending
                ? lastSale.paymentGatewayUrl
                  ? "Open the payment link to finish the transaction"
                  : "This sale is saved and waiting for verification."
                : "Transaction processed successfully"}
            </p>

            <div className="mb-6 rounded-xl bg-gray-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Sale #{lastSale.saleNumber}
              </p>
              <p className="mt-1 text-2xl font-extrabold text-orange-600">
                {formatCurrency(lastSale.total, currency)}
              </p>
            </div>

            {lastSale.paymentPending && !lastSale.paymentGatewayUrl && (
              <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 p-4 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">
                  Verification Required
                </p>
                <p className="mt-1 text-sm text-amber-700">
                  This payment is saved as pending and will complete after
                  verification.
                </p>
              </div>
            )}

            {lastSale.paymentPending && lastSale.paymentGatewayUrl && (
              <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-500">
                  Gateway Checkout
                </p>
                <p className="mt-1 text-sm text-blue-700">
                  {lastSale.paymentGatewayMessage ||
                    "Open the payment link to finish the transaction."}
                </p>
                <button
                  onClick={() =>
                    window.open(
                      lastSale.paymentGatewayUrl,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                  className="mt-3 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Open Payment Link
                </button>
                {lastSale.paymentGatewayProvider === "pesapal" &&
                  lastSale.saleId && (
                    <button
                      onClick={recheckPesapalStatus}
                      disabled={recheckingPayment}
                      className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${recheckingPayment ? "animate-spin" : ""}`}
                      />
                      {recheckingPayment
                        ? "Rechecking..."
                        : "Recheck Pesapal Status"}
                    </button>
                  )}
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={newSale}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg"
              >
                <Plus className="h-4 w-4" />
                New Sale
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={printReceipt}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>
                <button
                  onClick={handleOpenDrawer}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  <Key className="h-4 w-4" />
                  Drawer
                </button>
                <button
                  onClick={closeCompleteModal}
                  className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to POS
                </button>
              </div>

              {lastSale.customerName && (
                <button
                  onClick={() => {
                    const text = encodeURIComponent(
                      `Receipt: ${lastSale.saleNumber}\nTotal: ${formatCurrency(lastSale.total, currency)}\nPayment: ${lastSale.paymentMethod}\nDate: ${new Date().toLocaleDateString("en-UG")}\n\nItems:\n${lastSale.items.map((i) => `• ${i.name} x${i.quantity} = ${formatCurrency(i.total, currency)}`).join("\n")}\n\nThank you for your purchase!`,
                    );
                    window.open(`https://wa.me/?text=${text}`, "_blank");
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 transition-colors hover:bg-green-100"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </button>
              )}
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
