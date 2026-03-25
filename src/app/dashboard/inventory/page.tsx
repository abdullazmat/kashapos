"use client";

import {
  Fragment,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Barcode from "react-barcode";
import {
  Package,
  Plus,
  Search,
  Edit,
  Copy,
  Download,
  Upload,
  Trash2,
  Tag,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Layers,
  ImagePlus,
  RotateCcw,
  AlertTriangle,
  Barcode as BarcodeIcon,
  Printer,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  BARCODE_FORMATS,
  ensureBarcodeValue,
  normalizeBarcodeFormat,
  toReactBarcodeFormat,
  type BarcodeFormat,
} from "@/lib/barcode";
import { useSession } from "../layout";

function randomNumericString(length: number) {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => String(value % 10)).join("");
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  barcode: string;
  barcodeFormat?: string;
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
  categoryAttributes?: Record<string, unknown>;
  hasVariants?: boolean;
  variants?: {
    name: string;
    sku: string;
    barcode?: string;
    imei?: string;
    price: number;
    costPrice: number;
    stock: number;
  }[];
}

interface Category {
  _id: string;
  name: string;
  slug: string;
}

type DynamicFieldType = "text" | "number" | "date" | "select" | "toggle";

type DynamicFieldConfig = {
  key: string;
  label: string;
  type: DynamicFieldType;
  options?: string[];
  placeholder?: string;
};

const CATEGORY_FIELD_MAP: Record<string, DynamicFieldConfig[]> = {
  APPAREL: [
    { key: "sizes", label: "Sizes", type: "text", placeholder: "XS,S,M,L" },
    { key: "colors", label: "Colors", type: "text", placeholder: "Black,Blue" },
    { key: "material", label: "Material", type: "text" },
    { key: "brand", label: "Brand", type: "text" },
    {
      key: "gender",
      label: "Gender",
      type: "select",
      options: ["unisex", "male", "female", "kids"],
    },
    { key: "style", label: "Style/Type", type: "text" },
  ],
  FOOD: [
    {
      key: "ripeness",
      label: "Ripeness / State",
      type: "select",
      options: ["raw", "ripe", "fresh", "frozen", "processed"],
    },
    { key: "storageCondition", label: "Storage Condition", type: "text" },
    { key: "expiryDate", label: "Expiry Date", type: "date" },
    { key: "weight", label: "Weight", type: "text" },
    { key: "origin", label: "Origin", type: "text" },
    { key: "allergens", label: "Allergens", type: "text" },
    { key: "organic", label: "Organic", type: "toggle" },
    { key: "halal", label: "Halal", type: "toggle" },
  ],
  BEVERAGE: [
    { key: "volume", label: "Volume", type: "text" },
    {
      key: "temperature",
      label: "Serve Temperature",
      type: "select",
      options: ["cold", "ambient", "warm", "hot"],
    },
    { key: "brand", label: "Brand", type: "text" },
    { key: "expiryDate", label: "Expiry Date", type: "date" },
    { key: "alcoholic", label: "Alcoholic", type: "toggle" },
    { key: "carbonated", label: "Carbonated", type: "toggle" },
  ],
  ELECTRONICS: [
    { key: "brand", label: "Brand", type: "text" },
    { key: "model", label: "Model Number", type: "text" },
    {
      key: "storage",
      label: "Storage Options",
      type: "text",
      placeholder: "128GB,256GB,512GB",
    },
    {
      key: "colors",
      label: "Colors",
      type: "text",
      placeholder: "Black,White,Blue",
    },
    {
      key: "imeiOptional",
      label: "Capture IMEI (optional)",
      type: "toggle",
    },
    { key: "warrantyMonths", label: "Warranty (months)", type: "number" },
    {
      key: "condition",
      label: "Condition",
      type: "select",
      options: ["new", "refurbished", "used"],
    },
    { key: "voltage", label: "Voltage", type: "text" },
    { key: "finish", label: "Color / Finish", type: "text" },
  ],
  FURNITURE: [
    { key: "material", label: "Material", type: "text" },
    { key: "finish", label: "Color / Finish", type: "text" },
    { key: "dimensions", label: "Dimensions (LxWxH)", type: "text" },
    { key: "weight", label: "Weight", type: "text" },
    { key: "requiresAssembly", label: "Requires Assembly", type: "toggle" },
  ],
  GENERAL: [
    { key: "brand", label: "Brand", type: "text" },
    {
      key: "condition",
      label: "Condition",
      type: "select",
      options: ["new", "used", "refurbished"],
    },
    { key: "descriptionExtra", label: "Description", type: "text" },
  ],
};

function resolveCategoryKey(name?: string) {
  const normalized = (name || "").toLowerCase();
  if (normalized.includes("apparel") || normalized.includes("cloth")) {
    return "APPAREL";
  }
  if (normalized.includes("food")) return "FOOD";
  if (normalized.includes("beverage") || normalized.includes("drink")) {
    return "BEVERAGE";
  }
  if (normalized.includes("electronic")) return "ELECTRONICS";
  if (normalized.includes("furniture")) return "FURNITURE";
  return "GENERAL";
}

function toTagTokens(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .map((item) => item.toLowerCase());
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.toLowerCase());
  }

  return [];
}

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
}

function escapeCsvCell(value: unknown) {
  const raw = String(value ?? "");
  const escaped = raw.replace(/"/g, '""');
  return /[",\n]/.test(raw) ? `"${escaped}"` : escaped;
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }

  cells.push(current.trim());
  return cells;
}

export default function InventoryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
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
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<any[]>([]);
  const [stockFilter, setStockFilter] = useState<
    "all" | "in-stock" | "low" | "out"
  >("all");
  const [sizeFilter, setSizeFilter] = useState("all");
  const [colorFilter, setColorFilter] = useState("all");
  const [materialFilter, setMaterialFilter] = useState("all");
  const [storageFilter, setStorageFilter] = useState("all");
  const [expandedProducts, setExpandedProducts] = useState<string[]>([]);
  const [quickBarcodeProduct, setQuickBarcodeProduct] =
    useState<Product | null>(null);
  const [quickBarcodeFormat, setQuickBarcodeFormat] =
    useState<BarcodeFormat>("Code 128");
  const [quickBarcodeValue, setQuickBarcodeValue] = useState("");
  const [quickLabelCopies, setQuickLabelCopies] = useState(1);
  const [quickShowName, setQuickShowName] = useState(true);
  const [quickShowPrice, setQuickShowPrice] = useState(false);
  const [quickShowSku, setQuickShowSku] = useState(true);
  const [savingQuickBarcode, setSavingQuickBarcode] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

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
    categoryAttributes: {} as Record<string, unknown>,
  });
  const [catForm, setCatForm] = useState({
    name: "",
    slug: "",
    description: "",
  });
  const [unitForm, setUnitForm] = useState({
    name: "",
    shortName: "",
  });

  useEffect(() => {
    const nextSearch = String(searchParams.get("search") || "").trim();
    if (nextSearch) {
      setSearch(nextSearch);
      setPage(1);
    }
  }, [searchParams]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const purchaseOrderId = searchParams.get("purchase_order_id");
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "20",
      ...(search && { search }),
      ...(filterCategory && { category: filterCategory }),
      ...(purchaseOrderId && { purchase_order_id: purchaseOrderId }),
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
  }, [page, search, filterCategory, searchParams]);

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

  const fetchUnits = useCallback(async () => {
    try {
      const res = await fetch("/api/units");
      if (res.ok) {
        const d = await res.json();
        setUnits(d || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchUnits();
  }, [fetchCategories, fetchUnits]);

  useEffect(() => {
    if (!quickBarcodeProduct) return;
    setQuickBarcodeValue((prev) =>
      ensureBarcodeValue(quickBarcodeFormat, prev, quickBarcodeProduct.sku),
    );
  }, [quickBarcodeFormat, quickBarcodeProduct]);

  const openAdd = () => {
    setEditing(null);
    const rand = randomNumericString(4);
    setForm({
      name: "",
      sku: `SKU-${rand}`,
      barcode: randomNumericString(13),
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
      categoryAttributes: {},
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
      categoryAttributes: p.categoryAttributes || {},
    });
    setShowModal(true);
  };

  const openCopy = (p: Product) => {
    setEditing(null);
    const rand = randomNumericString(4);
    setForm({
      name: `${p.name} Copy`,
      sku: `${p.sku}-COPY-${rand}`,
      barcode: randomNumericString(13),
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
      categoryAttributes: p.categoryAttributes || {},
    });
    setShowModal(true);
  };

  const openQuickBarcodePanel = (product: Product) => {
    const nextFormat = normalizeBarcodeFormat(
      product.barcodeFormat || "Code 128",
    );
    setQuickBarcodeProduct(product);
    setQuickBarcodeFormat(nextFormat);
    setQuickBarcodeValue(
      product.barcode || ensureBarcodeValue(nextFormat, "", product.sku),
    );
    setQuickLabelCopies(1);
    setQuickShowName(true);
    setQuickShowPrice(false);
    setQuickShowSku(true);
  };

  const saveQuickBarcode = async () => {
    if (!quickBarcodeProduct || !quickBarcodeValue.trim()) return;

    setSavingQuickBarcode(true);
    const normalized = ensureBarcodeValue(
      quickBarcodeFormat,
      quickBarcodeValue,
      quickBarcodeProduct.sku,
    );

    try {
      const res = await fetch(`/api/products/${quickBarcodeProduct._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: normalized,
          barcodeFormat: quickBarcodeFormat,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to save barcode");
        return;
      }

      setQuickBarcodeValue(normalized);
      await fetchProducts();
    } catch {
      alert("Failed to save barcode");
    } finally {
      setSavingQuickBarcode(false);
    }
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
      categoryAttributes: form.categoryAttributes,
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

  const exportInventory = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "5000",
        ...(search && { search }),
        ...(filterCategory && { category: filterCategory }),
      });

      const res = await fetch(`/api/products?${params}`);
      if (!res.ok) {
        alert("Failed to export inventory");
        return;
      }

      const data = await res.json();
      const rows: Product[] = data.products || [];

      const headers = [
        "name",
        "sku",
        "barcode",
        "category",
        "price",
        "costPrice",
        "unit",
        "taxRate",
        "description",
        "trackStock",
        "isActive",
        "image",
      ];

      const csv = [
        headers.join(","),
        ...rows.map((product) =>
          [
            product.name,
            product.sku,
            product.barcode,
            product.categoryId?.name || "",
            product.price,
            product.costPrice,
            product.unit,
            product.taxRate,
            product.description,
            product.trackStock,
            product.isActive,
            product.image || "",
          ]
            .map(escapeCsvCell)
            .join(","),
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `inventory-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Failed to export inventory");
    }
  }, [filterCategory, search]);

  const downloadImportTemplate = useCallback(() => {
    const headers = [
      "name",
      "sku",
      "barcode",
      "category",
      "price",
      "costPrice",
      "unit",
      "taxRate",
      "description",
      "trackStock",
      "isActive",
      "image",
    ];
    const sampleRow = [
      "Sample Product",
      "SKU-1001",
      "1234567890123",
      "General",
      "25000",
      "18000",
      "pcs",
      "18",
      "Sample imported item",
      "true",
      "true",
      "",
    ];

    const csv = [
      headers.join(","),
      sampleRow.map(escapeCsvCell).join(","),
    ].join("\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "inventory-import-template.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, []);

  const handleImportInventory = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      try {
        const content = await file.text();
        const lines = content
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);

        if (lines.length < 2) {
          alert("CSV is empty or missing data rows");
          return;
        }

        const headers = parseCsvLine(lines[0]).map((header) =>
          header.toLowerCase(),
        );
        const required = ["name", "sku", "price"];
        const missing = required.filter((key) => !headers.includes(key));
        if (missing.length > 0) {
          alert(`CSV missing required columns: ${missing.join(", ")}`);
          return;
        }

        const categoryMap = new Map(
          categories.map((category) => [
            category.name.toLowerCase(),
            category._id,
          ]),
        );

        let successCount = 0;
        let failedCount = 0;

        for (const line of lines.slice(1)) {
          const values = parseCsvLine(line);
          const row: Record<string, string> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || "";
          });

          const name = row.name?.trim();
          const sku = row.sku?.trim();
          if (!name || !sku) {
            failedCount += 1;
            continue;
          }

          const categoryId = row.category
            ? categoryMap.get(row.category.toLowerCase())
            : undefined;

          const payload = {
            name,
            slug: makeSlug(name),
            sku,
            barcode: row.barcode?.trim() || randomNumericString(13),
            price: Number(row.price || 0),
            costPrice: Number(row.costprice || 0),
            unit: row.unit?.trim() || "pcs",
            taxRate: Number(row.taxrate || 0),
            description: row.description || "",
            trackStock:
              String(row.trackstock || "true").toLowerCase() !== "false",
            isActive: String(row.isactive || "true").toLowerCase() !== "false",
            image: row.image?.trim() || undefined,
            categoryId,
          };

          const res = await fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (res.ok) successCount += 1;
          else failedCount += 1;
        }

        await fetchProducts();
        alert(
          `Import complete. Created: ${successCount}. Failed: ${failedCount}.`,
        );
      } catch (error) {
        console.error(error);
        alert("Failed to import inventory CSV");
      }
    },
    [categories, fetchProducts],
  );

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

  const saveUnit = async () => {
    const res = await fetch("/api/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(unitForm),
    });
    if (res.ok) {
      setShowUnitModal(false);
      setUnitForm({ name: "", shortName: "" });
      fetchUnits();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to save unit");
    }
  };

  const totalPages = Math.ceil(total / 20);
  const selectedCategory = categories.find((c) => c._id === form.categoryId);
  const categoryKey = resolveCategoryKey(selectedCategory?.name);
  const dynamicFields =
    CATEGORY_FIELD_MAP[categoryKey] || CATEGORY_FIELD_MAP.GENERAL;
  const cost = parseFloat(form.costPrice) || 0;
  const price = parseFloat(form.price) || 0;
  const pricingWarning =
    cost > 0 && price > 0 && cost > price
      ? "Selling price is below cost - this product will sell at a loss"
      : "";

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20";

  const zeroStockCount = products.filter((p) => (p.stock ?? 0) === 0).length;
  const attributeCatalog = useMemo(() => {
    const sizes = new Set<string>();
    const colors = new Set<string>();
    const materials = new Set<string>();
    const storages = new Set<string>();
    const knownColors = [
      "black",
      "white",
      "blue",
      "red",
      "green",
      "yellow",
      "purple",
      "pink",
      "gold",
      "silver",
      "gray",
      "grey",
      "lilac",
      "iceblue",
      "ice",
    ];

    for (const product of products) {
      const attrs = product.categoryAttributes || {};

      for (const token of toTagTokens(attrs.sizes)) sizes.add(token);
      for (const token of toTagTokens(attrs.colors)) colors.add(token);
      for (const token of toTagTokens(attrs.material)) materials.add(token);
      for (const token of toTagTokens(attrs.storage || attrs.storageOptions)) {
        storages.add(token);
      }

      if (product.variants?.length) {
        for (const variant of product.variants) {
          const tokens = variant.name.toLowerCase().split(/[^a-z0-9]+/g);
          const knownSizes = ["xs", "s", "m", "l", "xl", "xxl"];
          for (const token of tokens) {
            if (knownSizes.includes(token)) {
              sizes.add(token);
            }
            if (knownColors.includes(token)) {
              colors.add(token);
            }
            if (/^\d+(gb|tb)$/.test(token)) {
              storages.add(token);
            }
          }
        }
      }
    }

    return {
      sizes: Array.from(sizes).sort(),
      colors: Array.from(colors).sort(),
      materials: Array.from(materials).sort(),
      storages: Array.from(storages).sort(),
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const stock = product.stock ?? 0;
      const stockMatch =
        stockFilter === "all" ||
        (stockFilter === "in-stock" && stock > 10) ||
        (stockFilter === "low" && stock > 0 && stock <= 10) ||
        (stockFilter === "out" && stock === 0);

      if (!stockMatch) return false;

      const attrs = product.categoryAttributes || {};
      const sizes = new Set(toTagTokens(attrs.sizes));
      const colors = new Set(toTagTokens(attrs.colors));
      const materials = new Set(toTagTokens(attrs.material));
      const storages = new Set(
        toTagTokens(attrs.storage || attrs.storageOptions),
      );

      for (const variant of product.variants || []) {
        const tokens = variant.name.toLowerCase().split(/[^a-z0-9]+/g);
        for (const token of tokens) {
          if (["xs", "s", "m", "l", "xl", "xxl"].includes(token)) {
            sizes.add(token);
          }
          if (
            [
              "black",
              "white",
              "blue",
              "red",
              "green",
              "yellow",
              "purple",
              "pink",
              "gold",
              "silver",
              "gray",
              "grey",
              "lilac",
              "iceblue",
              "ice",
            ].includes(token)
          ) {
            colors.add(token);
          }
          if (/^\d+(gb|tb)$/.test(token)) {
            storages.add(token);
          }
        }
      }

      const sizeMatch = sizeFilter === "all" || sizes.has(sizeFilter);
      const colorMatch = colorFilter === "all" || colors.has(colorFilter);
      const materialMatch =
        materialFilter === "all" || materials.has(materialFilter);
      const storageMatch =
        storageFilter === "all" || storages.has(storageFilter);

      return sizeMatch && colorMatch && materialMatch && storageMatch;
    });
  }, [
    products,
    stockFilter,
    sizeFilter,
    colorFilter,
    materialFilter,
    storageFilter,
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
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
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImportInventory}
          />
          <button
            onClick={exportInventory}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow"
          >
            <Download className="h-4 w-4" /> Export
          </button>
          <button
            onClick={() => importInputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow"
          >
            <Upload className="h-4 w-4" /> Import
          </button>
          <button
            onClick={downloadImportTemplate}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow"
          >
            <Download className="h-4 w-4" /> CSV Template
          </button>
          <button
            onClick={() => setShowCatModal(true)}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow"
          >
            <Tag className="h-4 w-4" /> Categories
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg hover:shadow-orange-500/30"
          >
            <Plus className="h-4 w-4" /> Add Product
          </button>
        </div>
      </div>

      {searchParams.get("purchase_order_id") && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-orange-100 bg-orange-50/50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-orange-700">
            <Package className="h-4 w-4" />
            <span>Showing products from Purchase Order</span>
          </div>
          <button
            onClick={() => router.push("/dashboard/inventory")}
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-orange-600 hover:text-orange-700"
          >
            Clear Filter <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-50">
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
        <select
          value={sizeFilter}
          onChange={(e) => setSizeFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        >
          <option value="all">All Sizes</option>
          {attributeCatalog.sizes.map((size) => (
            <option key={`size-${size}`} value={size}>
              {size.toUpperCase()}
            </option>
          ))}
        </select>
        <select
          value={colorFilter}
          onChange={(e) => setColorFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        >
          <option value="all">All Colors</option>
          {attributeCatalog.colors.map((color) => (
            <option key={`color-${color}`} value={color}>
              {color}
            </option>
          ))}
        </select>
        <select
          value={materialFilter}
          onChange={(e) => setMaterialFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        >
          <option value="all">All Materials</option>
          {attributeCatalog.materials.map((material) => (
            <option key={`material-${material}`} value={material}>
              {material}
            </option>
          ))}
        </select>
        <select
          value={storageFilter}
          onChange={(e) => setStorageFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        >
          <option value="all">All Storage</option>
          {attributeCatalog.storages.map((storage) => (
            <option key={`storage-${storage}`} value={storage}>
              {storage.toUpperCase()}
            </option>
          ))}
        </select>
        {(search ||
          filterCategory ||
          stockFilter !== "all" ||
          sizeFilter !== "all" ||
          colorFilter !== "all" ||
          materialFilter !== "all" ||
          storageFilter !== "all") && (
          <button
            onClick={() => {
              setSearch("");
              setFilterCategory("");
              setStockFilter("all");
              setSizeFilter("all");
              setColorFilter("all");
              setMaterialFilter("all");
              setStorageFilter("all");
              setPage(1);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        )}
      </div>

      {zeroStockCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" />
          {zeroStockCount} product{zeroStockCount > 1 ? "s" : ""} currently out
          of stock.
        </div>
      )}

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
                  Margin %
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
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-blue-500" />
                      <span className="text-sm text-gray-400">
                        Loading products...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
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
                filteredProducts.map((p) => (
                  <Fragment key={p._id}>
                    <tr
                      className="group transition-colors hover:bg-gray-50/80"
                      onClick={() => {
                        if (!p.hasVariants || !(p.variants?.length || 0))
                          return;
                        setExpandedProducts((prev) =>
                          prev.includes(p._id)
                            ? prev.filter((id) => id !== p._id)
                            : [...prev, p._id],
                        );
                      }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {p.hasVariants && (p.variants?.length || 0) > 0 && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setExpandedProducts((prev) =>
                                  prev.includes(p._id)
                                    ? prev.filter((id) => id !== p._id)
                                    : [...prev, p._id],
                                );
                              }}
                              className="rounded-md border border-gray-200 bg-white p-1 text-gray-500 hover:bg-gray-50"
                              title="Toggle variants"
                            >
                              {expandedProducts.includes(p._id) ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                          {p.image ? (
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden border border-gray-100">
                              <Image
                                src={p.image}
                                alt={p.name}
                                width={36}
                                height={36}
                                className="h-full w-full object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-gray-100 to-gray-200">
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
                            {p.hasVariants && (p.variants?.length || 0) > 0 && (
                              <div className="mt-1 text-[11px] font-medium text-blue-600">
                                {p.variants?.length} variants
                              </div>
                            )}
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
                        {p.price > 0 ? (
                          <span
                            className={`text-xs font-semibold ${(p.price - p.costPrice) / p.price >= 0.2 ? "text-emerald-600" : "text-amber-600"}`}
                          >
                            {(
                              ((p.price - p.costPrice) / p.price) *
                              100
                            ).toFixed(1)}
                            %
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
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
                        <div className="flex items-center justify-end gap-1 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              openCopy(p);
                            }}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                            title="Create copy"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              openQuickBarcodePanel(p);
                            }}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-orange-50 hover:text-orange-600"
                            title="Generate and print barcode"
                          >
                            <BarcodeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              openEdit(p);
                            }}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteProduct(p._id);
                            }}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedProducts.includes(p._id) &&
                      p.hasVariants &&
                      (p.variants?.length || 0) > 0 && (
                        <tr className="bg-blue-50/30">
                          <td colSpan={9} className="px-5 py-3">
                            <div className="overflow-hidden rounded-xl border border-blue-100 bg-white">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-blue-50 text-blue-900/70">
                                    <th className="px-3 py-2 text-left font-semibold">
                                      Variant
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold">
                                      SKU
                                    </th>
                                    <th className="px-3 py-2 text-right font-semibold">
                                      Cost
                                    </th>
                                    <th className="px-3 py-2 text-right font-semibold">
                                      Price
                                    </th>
                                    <th className="px-3 py-2 text-right font-semibold">
                                      Stock
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold">
                                      IMEI
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {p.variants?.map((variant) => (
                                    <tr
                                      key={`${p._id}-${variant.sku}`}
                                      className="border-t border-blue-50"
                                    >
                                      <td className="px-3 py-2 text-gray-700">
                                        {variant.name}
                                      </td>
                                      <td className="px-3 py-2 font-mono text-gray-500">
                                        {variant.sku}
                                      </td>
                                      <td className="px-3 py-2 text-right text-gray-600">
                                        {formatCurrency(
                                          variant.costPrice,
                                          currency,
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-right font-semibold text-gray-700">
                                        {formatCurrency(
                                          variant.price,
                                          currency,
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                        <span
                                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                            variant.stock <= 0
                                              ? "bg-red-50 text-red-700"
                                              : variant.stock <= 10
                                                ? "bg-amber-50 text-amber-700"
                                                : "bg-emerald-50 text-emerald-700"
                                          }`}
                                        >
                                          {variant.stock}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-gray-500">
                                        {variant.imei || "-"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                  </Fragment>
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
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${page === p ? "bg-linear-to-r from-orange-500 to-amber-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}
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

      {quickBarcodeProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setQuickBarcodeProduct(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-orange-500 to-amber-600 shadow-md shadow-orange-500/20">
                  <BarcodeIcon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">Barcode Panel</h2>
                  <p className="text-xs text-gray-500">
                    {quickBarcodeProduct.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQuickBarcodeProduct(null)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="text-[12px] font-semibold text-gray-700">
                    Format
                  </label>
                  <select
                    value={quickBarcodeFormat}
                    onChange={(event) =>
                      setQuickBarcodeFormat(
                        normalizeBarcodeFormat(event.target.value),
                      )
                    }
                    className={inputClass}
                  >
                    {BARCODE_FORMATS.map((format) => (
                      <option key={format} value={format}>
                        {format}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-gray-700">
                    Copies
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={quickLabelCopies}
                    onChange={(event) =>
                      setQuickLabelCopies(
                        Math.max(1, Number(event.target.value) || 1),
                      )
                    }
                    className={inputClass}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() =>
                      setQuickBarcodeValue(
                        ensureBarcodeValue(
                          quickBarcodeFormat,
                          "",
                          quickBarcodeProduct.sku,
                        ),
                      )
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Generate New Value
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[12px] font-semibold text-gray-700">
                  Barcode Value
                </label>
                <input
                  value={quickBarcodeValue}
                  onChange={(event) => setQuickBarcodeValue(event.target.value)}
                  className={`${inputClass} font-mono`}
                />
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={quickShowName}
                    onChange={(event) => setQuickShowName(event.target.checked)}
                  />
                  Show name
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={quickShowPrice}
                    onChange={(event) =>
                      setQuickShowPrice(event.target.checked)
                    }
                  />
                  Show price
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={quickShowSku}
                    onChange={(event) => setQuickShowSku(event.target.checked)}
                  />
                  Show SKU
                </label>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="inline-flex rounded-lg bg-white p-3">
                  {quickBarcodeFormat === "QR Code" ? (
                    <p className="text-sm text-gray-500">
                      QR preview is available in Barcode Manager. This quick
                      panel renders 1D barcodes for fast inventory edits.
                    </p>
                  ) : (
                    <Barcode
                      value={ensureBarcodeValue(
                        quickBarcodeFormat,
                        quickBarcodeValue,
                        quickBarcodeProduct.sku,
                      )}
                      format={toReactBarcodeFormat(quickBarcodeFormat)}
                      width={1.3}
                      height={70}
                      margin={0}
                      displayValue
                    />
                  )}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {quickShowName && <p>{quickBarcodeProduct.name}</p>}
                  {quickShowSku && <p>SKU: {quickBarcodeProduct.sku}</p>}
                  {quickShowPrice && (
                    <p>{formatCurrency(quickBarcodeProduct.price, currency)}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={saveQuickBarcode}
                  disabled={savingQuickBarcode || !quickBarcodeValue.trim()}
                  className="rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow disabled:opacity-60"
                >
                  {savingQuickBarcode ? "Saving..." : "Save Barcode"}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Printer className="h-4 w-4" /> Print Label
                </button>
                <a
                  href={`/dashboard/barcodes?tab=generate&productId=${quickBarcodeProduct._id}`}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Open Full Barcode Manager
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/20">
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
                {pricingWarning && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-700">
                    {pricingWarning}
                  </div>
                )}
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
                        className="flex h-10.5 w-10.5 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-orange-600"
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
                    <div className="flex gap-2 mt-1.5">
                      <select
                        value={form.unit}
                        onChange={(e) =>
                          setForm({ ...form, unit: e.target.value })
                        }
                        className="flex-1 rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      >
                        {units.map((u, i) => (
                          <option key={u._id || i} value={u.shortName}>
                            {u.name} ({u.shortName})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowUnitModal(true)}
                        className="flex h-10.5 w-10.5 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-orange-600"
                        title="Add new unit"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3.5">
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-blue-700">
                    Category Fields: {selectedCategory?.name || "General"}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {dynamicFields.map((field) => {
                      const value = form.categoryAttributes[field.key];

                      if (field.type === "toggle") {
                        return (
                          <label
                            key={field.key}
                            className="flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-gray-700"
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(value)}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  categoryAttributes: {
                                    ...form.categoryAttributes,
                                    [field.key]: e.target.checked,
                                  },
                                })
                              }
                              className="h-4 w-4 rounded border-gray-300 text-orange-600"
                            />
                            {field.label}
                          </label>
                        );
                      }

                      if (field.type === "select") {
                        return (
                          <div key={field.key}>
                            <label className="text-[13px] font-semibold text-gray-700">
                              {field.label}
                            </label>
                            <select
                              value={String(value || "")}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  categoryAttributes: {
                                    ...form.categoryAttributes,
                                    [field.key]: e.target.value,
                                  },
                                })
                              }
                              className={inputClass}
                            >
                              <option value="">Select</option>
                              {(field.options || []).map((option) => (
                                <option
                                  key={`${field.key}-${option}`}
                                  value={option}
                                >
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      }

                      return (
                        <div key={field.key}>
                          <label className="text-[13px] font-semibold text-gray-700">
                            {field.label}
                          </label>
                          <input
                            type={
                              field.type === "date"
                                ? "date"
                                : field.type === "number"
                                  ? "number"
                                  : "text"
                            }
                            value={String(value || "")}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                categoryAttributes: {
                                  ...form.categoryAttributes,
                                  [field.key]:
                                    field.type === "number"
                                      ? Number(e.target.value || 0)
                                      : e.target.value,
                                },
                              })
                            }
                            placeholder={field.placeholder}
                            className={inputClass}
                          />
                        </div>
                      );
                    })}
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
                        <Image
                          src={form.image}
                          alt="Product"
                          width={80}
                          height={80}
                          className="h-full w-full object-cover"
                          unoptimized
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
                className="rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg"
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
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-purple-600 shadow-md shadow-violet-500/20">
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
                      <div className="h-2 w-2 rounded-full bg-linear-to-r from-orange-400 to-amber-500" />
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
                    className="w-full rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg disabled:opacity-50 disabled:shadow-none"
                  >
                    Add Category
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Unit Modal */}
      {showUnitModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowUnitModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-orange-500 to-amber-600 shadow-md shadow-orange-500/20">
                  <Package className="h-4 w-4 text-white" />
                </div>
                <h2 className="font-bold text-gray-900">Add Unit</h2>
              </div>
              <button
                onClick={() => setShowUnitModal(false)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-[13px] font-semibold text-gray-700">
                  Unit Name *
                </label>
                <input
                  value={unitForm.name}
                  onChange={(e) =>
                    setUnitForm({ ...unitForm, name: e.target.value })
                  }
                  placeholder="e.g. Kilograms"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-[13px] font-semibold text-gray-700">
                  Short Name *
                </label>
                <input
                  value={unitForm.shortName}
                  onChange={(e) =>
                    setUnitForm({ ...unitForm, shortName: e.target.value })
                  }
                  placeholder="e.g. kg"
                  className={inputClass}
                />
              </div>
              <button
                onClick={saveUnit}
                disabled={!unitForm.name || !unitForm.shortName}
                className="w-full rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg disabled:opacity-50"
              >
                Create Unit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
