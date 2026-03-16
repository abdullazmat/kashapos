"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import Barcode from "react-barcode";
import QRCode from "qrcode";
import {
  BadgeCheck,
  Barcode as BarcodeIcon,
  CheckCircle2,
  Download,
  Printer,
  QrCode,
  RefreshCw,
  Save,
  ScanLine,
  Search,
  Settings,
  Wand2,
} from "lucide-react";
import {
  BARCODE_FORMATS,
  ensureBarcodeValue,
  normalizeBarcodeFormat,
  toReactBarcodeFormat,
  type BarcodeFormat,
} from "@/lib/barcode";
import {
  readDeviceBarcodePrinter,
  writeDeviceBarcodePrinter,
} from "@/lib/barcode-client";

type ActiveTab = "generate" | "print" | "settings" | "history";

interface ProductItem {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  barcodeFormat?: string;
  price: number;
}

interface HistoryItem {
  _id: string;
  createdAt: string;
  scannedBy: string;
  barcodeValue: string;
  productFound: string;
  action: string;
  location: string;
  context: string;
  result: string;
  module: string;
}

interface LabelDraft {
  productId: string;
  productName: string;
  sku: string;
  price: number;
  barcode: string;
  format: BarcodeFormat;
  copies: number;
  showName: boolean;
  showPrice: boolean;
  showSku: boolean;
}

interface BarcodeSettingsState {
  barcodeDefaultFormat: BarcodeFormat;
  barcodeAutoGenerateOnProductCreate: boolean;
  barcodeUseSkuAsDefaultValue: boolean;
  barcodeAllowManualOverride: boolean;
  barcodePrefix: string;
  barcodeDefaultLabelSize: string;
  barcodeDefaultPaperSize: string;
  barcodeDefaultPrinterType: string;
  barcodeShowPriceOnLabelsByDefault: boolean;
  barcodeScanSound: boolean;
  barcodeFailedScanAlert: boolean;
  barcodeDefaultFontSize: string;
  barcodeDefaultHeightMm: number;
  barcodeMarginTopMm: number;
  barcodeMarginRightMm: number;
  barcodeMarginBottomMm: number;
  barcodeMarginLeftMm: number;
}

const TABS: Array<{
  key: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "generate", label: "Generate Barcodes", icon: BarcodeIcon },
  { key: "print", label: "Print Labels", icon: Printer },
  { key: "settings", label: "Barcode Settings", icon: Settings },
  { key: "history", label: "Scan History", icon: ScanLine },
];

const DEFAULT_SETTINGS: BarcodeSettingsState = {
  barcodeDefaultFormat: "Code 128",
  barcodeAutoGenerateOnProductCreate: true,
  barcodeUseSkuAsDefaultValue: true,
  barcodeAllowManualOverride: true,
  barcodePrefix: "",
  barcodeDefaultLabelSize: "40x25",
  barcodeDefaultPaperSize: "A4",
  barcodeDefaultPrinterType: "thermal",
  barcodeShowPriceOnLabelsByDefault: false,
  barcodeScanSound: true,
  barcodeFailedScanAlert: true,
  barcodeDefaultFontSize: "medium",
  barcodeDefaultHeightMm: 26,
  barcodeMarginTopMm: 8,
  barcodeMarginRightMm: 8,
  barcodeMarginBottomMm: 8,
  barcodeMarginLeftMm: 8,
};

const DEVICE_PRINTER_OPTIONS = [
  { value: "browser", label: "Browser Print Dialog" },
  { value: "xprinter-xp-360b", label: "Xprinter XP-360B" },
  { value: "xprinter-xp-420b", label: "Xprinter XP-420B" },
  { value: "hprt-lp100", label: "HPRT LP100" },
  { value: "zebra-zd220", label: "Zebra ZD220" },
  { value: "generic-58mm", label: "Generic 58mm Thermal" },
];

function mmToPixels(mm: number) {
  return Math.round(mm * 3.7795275591);
}

function sizeToMm(value: string) {
  if (value === "30x20") return { width: 30, height: 20 };
  if (value === "40x25") return { width: 40, height: 25 };
  if (value === "50x30") return { width: 50, height: 30 };
  if (value === "58x40") return { width: 58, height: 40 };
  return { width: 40, height: 25 };
}

function flattenDrafts(drafts: LabelDraft[]) {
  const out: LabelDraft[] = [];
  for (const draft of drafts) {
    const copies = Math.max(1, Number(draft.copies) || 1);
    for (let i = 0; i < copies; i += 1) {
      out.push({ ...draft, copies: 1 });
    }
  }
  return out;
}

function LabelPreview({
  draft,
  heightMm,
}: {
  draft: LabelDraft;
  heightMm: number;
}) {
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    if (draft.format !== "QR Code") {
      setQrDataUrl("");
      return;
    }

    let cancelled = false;
    void QRCode.toDataURL(draft.barcode, {
      margin: 1,
      width: 140,
      errorCorrectionLevel: "M",
    }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [draft.barcode, draft.format]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex min-h-28 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-2">
        {draft.format === "QR Code" ? (
          qrDataUrl ? (
            <Image
              src={qrDataUrl}
              alt={`QR ${draft.productName}`}
              width={96}
              height={96}
              className="h-24 w-24"
              unoptimized
            />
          ) : (
            <div className="h-24 w-24 animate-pulse rounded bg-gray-200" />
          )
        ) : (
          <Barcode
            value={draft.barcode}
            format={toReactBarcodeFormat(draft.format)}
            height={Math.max(22, mmToPixels(heightMm) / 4)}
            width={1.2}
            margin={0}
            fontSize={12}
            displayValue
          />
        )}
        {draft.showName && (
          <p className="text-[11px] font-semibold text-gray-700">
            {draft.productName}
          </p>
        )}
        {draft.showSku && (
          <p className="text-[10px] text-gray-500">SKU: {draft.sku}</p>
        )}
        {draft.showPrice && (
          <p className="text-[10px] text-gray-500">
            UGX {draft.price.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}

export default function BarcodeManagerPage() {
  const searchParams = useSearchParams();
  const tabParam = String(searchParams.get("tab") || "generate").toLowerCase();
  const activeTab: ActiveTab =
    tabParam === "print" || tabParam === "settings" || tabParam === "history"
      ? (tabParam as ActiveTab)
      : "generate";

  const preselectProductId = searchParams.get("productId") || "";
  const prefillSearch = searchParams.get("search") || "";
  const prefillCopies = Math.max(1, Number(searchParams.get("copies") || 1));

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState(prefillSearch);
  const [message, setMessage] = useState("");

  const [selectedProductId, setSelectedProductId] = useState("");
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>("Code 128");
  const [barcodeValue, setBarcodeValue] = useState("");
  const [showNameOnLabel, setShowNameOnLabel] = useState(true);
  const [showPriceOnLabel, setShowPriceOnLabel] = useState(false);
  const [showSkuOnLabel, setShowSkuOnLabel] = useState(true);
  const [labelsToPrint, setLabelsToPrint] = useState(1);
  const [savingSingle, setSavingSingle] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkFormat, setBulkFormat] = useState<BarcodeFormat>("Code 128");
  const [bulkBusy, setBulkBusy] = useState(false);

  const [labelQueue, setLabelQueue] = useState<LabelDraft[]>([]);
  const [deviceDefaultPrinter, setDeviceDefaultPrinter] = useState("browser");

  const [settings, setSettings] =
    useState<BarcodeSettingsState>(DEFAULT_SETTINGS);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [scanValue, setScanValue] = useState("");
  const [scanContext, setScanContext] = useState("pos");
  const [loggingScan, setLoggingScan] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((item) => item._id === selectedProductId) || null,
    [products, selectedProductId],
  );

  const missingProducts = useMemo(
    () => products.filter((item) => !String(item.barcode || "").trim()),
    [products],
  );

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const params = new URLSearchParams({ limit: "500" });
      if (search.trim()) params.set("search", search.trim());
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`/api/products?${params.toString()}`, {
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed to load products");
        return;
      }
      setProducts(data.products || []);
    } catch {
      setMessage("Failed to load products. Please refresh and try again.");
    } finally {
      setLoadingProducts(false);
    }
  }, [search]);

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (!res.ok) return;

      const raw = (data.settings || {}) as Record<string, unknown>;
      const next: BarcodeSettingsState = {
        barcodeDefaultFormat: normalizeBarcodeFormat(
          String(raw.barcodeDefaultFormat || "Code 128"),
        ),
        barcodeAutoGenerateOnProductCreate:
          typeof raw.barcodeAutoGenerateOnProductCreate === "boolean"
            ? raw.barcodeAutoGenerateOnProductCreate
            : true,
        barcodeUseSkuAsDefaultValue:
          typeof raw.barcodeUseSkuAsDefaultValue === "boolean"
            ? raw.barcodeUseSkuAsDefaultValue
            : true,
        barcodeAllowManualOverride:
          typeof raw.barcodeAllowManualOverride === "boolean"
            ? raw.barcodeAllowManualOverride
            : true,
        barcodePrefix: String(raw.barcodePrefix || ""),
        barcodeDefaultLabelSize: String(raw.barcodeDefaultLabelSize || "40x25"),
        barcodeDefaultPaperSize: String(raw.barcodeDefaultPaperSize || "A4"),
        barcodeDefaultPrinterType: String(
          raw.barcodeDefaultPrinterType || "thermal",
        ),
        barcodeShowPriceOnLabelsByDefault:
          typeof raw.barcodeShowPriceOnLabelsByDefault === "boolean"
            ? raw.barcodeShowPriceOnLabelsByDefault
            : false,
        barcodeScanSound:
          typeof raw.barcodeScanSound === "boolean"
            ? raw.barcodeScanSound
            : true,
        barcodeFailedScanAlert:
          typeof raw.barcodeFailedScanAlert === "boolean"
            ? raw.barcodeFailedScanAlert
            : true,
        barcodeDefaultFontSize: String(raw.barcodeDefaultFontSize || "medium"),
        barcodeDefaultHeightMm: Number(raw.barcodeDefaultHeightMm || 26),
        barcodeMarginTopMm: Number(raw.barcodeMarginTopMm || 8),
        barcodeMarginRightMm: Number(raw.barcodeMarginRightMm || 8),
        barcodeMarginBottomMm: Number(raw.barcodeMarginBottomMm || 8),
        barcodeMarginLeftMm: Number(raw.barcodeMarginLeftMm || 8),
      };
      setSettings(next);
      setBarcodeFormat(next.barcodeDefaultFormat);
      setBulkFormat(next.barcodeDefaultFormat);
      setShowPriceOnLabel(next.barcodeShowPriceOnLabelsByDefault);
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/barcodes/history?limit=100");
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed to load scan history");
        return;
      }
      setHistory(data.logs || []);
    } catch {
      setMessage("Failed to load scan history");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (activeTab === "history") {
      void loadHistory();
    }
  }, [activeTab, loadHistory]);

  useEffect(() => {
    if (!preselectProductId) return;
    setSelectedProductId(preselectProductId);
  }, [preselectProductId]);

  useEffect(() => {
    if (!prefillSearch) return;
    setSearch(prefillSearch);
  }, [prefillSearch]);

  useEffect(() => {
    setLabelsToPrint(prefillCopies);
  }, [prefillCopies]);

  useEffect(() => {
    setDeviceDefaultPrinter(readDeviceBarcodePrinter());
  }, []);

  useEffect(() => {
    if (!selectedProduct) return;
    const resolvedFormat = normalizeBarcodeFormat(
      selectedProduct.barcodeFormat || settings.barcodeDefaultFormat,
    );
    setBarcodeFormat(resolvedFormat);

    const initialValue =
      selectedProduct.barcode && selectedProduct.barcode.trim()
        ? selectedProduct.barcode
        : ensureBarcodeValue(
            resolvedFormat,
            settings.barcodeUseSkuAsDefaultValue ? selectedProduct.sku : "",
            selectedProduct.sku,
          );

    setBarcodeValue(initialValue);
  }, [
    selectedProduct,
    settings.barcodeDefaultFormat,
    settings.barcodeUseSkuAsDefaultValue,
  ]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.trim().toLowerCase();
    return products.filter((item) => {
      return (
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        String(item.barcode || "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [products, search]);

  const buildQueueFromSavedBarcodes = useCallback((): LabelDraft[] => {
    const source = search.trim() ? filteredProducts : products;

    return source
      .filter((item) => String(item.barcode || "").trim())
      .slice(0, 200)
      .map((item) => ({
        productId: item._id,
        productName: item.name,
        sku: item.sku,
        price: Number(item.price || 0),
        barcode: String(item.barcode || "").trim(),
        format: normalizeBarcodeFormat(
          item.barcodeFormat || settings.barcodeDefaultFormat,
        ),
        copies: Math.max(1, labelsToPrint),
        showName: showNameOnLabel,
        showPrice: showPriceOnLabel,
        showSku: showSkuOnLabel,
      }));
  }, [
    filteredProducts,
    labelsToPrint,
    products,
    search,
    settings.barcodeDefaultFormat,
    showNameOnLabel,
    showPriceOnLabel,
    showSkuOnLabel,
  ]);

  const generateForSelected = () => {
    if (!selectedProduct) return;
    const seed = settings.barcodeUseSkuAsDefaultValue
      ? selectedProduct.sku
      : `${selectedProduct.sku}-${Date.now()}`;
    setBarcodeValue(ensureBarcodeValue(barcodeFormat, "", seed));
  };

  const saveSingleBarcode = async () => {
    if (!selectedProduct || !barcodeValue.trim()) return;
    setSavingSingle(true);
    setMessage("");
    try {
      const payload = {
        barcode: ensureBarcodeValue(
          barcodeFormat,
          barcodeValue,
          selectedProduct.sku,
        ),
        barcodeFormat,
      };
      const res = await fetch(`/api/products/${selectedProduct._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed to save barcode");
        return;
      }

      const savedValue = payload.barcode;
      setBarcodeValue(savedValue);
      setMessage(`Saved barcode for ${selectedProduct.name}`);

      setLabelQueue((prev) => [
        {
          productId: selectedProduct._id,
          productName: selectedProduct.name,
          sku: selectedProduct.sku,
          price: selectedProduct.price,
          barcode: savedValue,
          format: barcodeFormat,
          copies: Math.max(1, labelsToPrint),
          showName: showNameOnLabel,
          showPrice: showPriceOnLabel,
          showSku: showSkuOnLabel,
        },
        ...prev.filter((item) => item.productId !== selectedProduct._id),
      ]);

      void loadProducts();
    } catch {
      setMessage("Failed to save barcode");
    } finally {
      setSavingSingle(false);
    }
  };

  const runBulkGeneration = async () => {
    if (selectedIds.length === 0) {
      setMessage("Select at least one product without barcode");
      return;
    }

    setBulkBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/barcodes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: selectedIds,
          format: bulkFormat,
          useSkuAsSeed: settings.barcodeUseSkuAsDefaultValue,
          labelOptions: {
            copies: labelsToPrint,
            showName: showNameOnLabel,
            showPrice: showPriceOnLabel,
            showSku: showSkuOnLabel,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Bulk generation failed");
        return;
      }

      const generated = (data.generated || []) as Array<
        Record<string, unknown>
      >;
      setLabelQueue((prev) => [
        ...generated.map((item) => ({
          productId: String(item.productId || ""),
          productName: String(item.productName || ""),
          sku: String(item.sku || ""),
          price: Number(item.price || 0),
          barcode: String(item.barcode || ""),
          format: normalizeBarcodeFormat(String(item.format || bulkFormat)),
          copies: Math.max(1, labelsToPrint),
          showName: showNameOnLabel,
          showPrice: showPriceOnLabel,
          showSku: showSkuOnLabel,
        })),
        ...prev,
      ]);

      setMessage(
        `Generated ${Number(data.generatedCount || 0)} barcodes. Ready to print.`,
      );
      setSelectedIds([]);
      void loadProducts();
    } catch {
      setMessage("Bulk generation failed");
    } finally {
      setBulkBusy(false);
    }
  };

  const saveBarcodeSettings = async () => {
    setSavingSettings(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed to save settings");
        return;
      }
      setMessage("Barcode settings saved");
    } catch {
      setMessage("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const logScanEvent = async () => {
    if (!scanValue.trim()) return;
    setLoggingScan(true);
    setMessage("");
    try {
      const res = await fetch("/api/barcodes/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: scanValue.trim(),
          context: scanContext,
          module:
            scanContext === "pos"
              ? "sales"
              : scanContext === "receiving"
                ? "purchases"
                : "stock",
          scanAction: "product_lookup",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed to log scan");
        return;
      }
      setScanValue("");
      setMessage("Scan event logged");
      await loadHistory();
    } catch {
      setMessage("Failed to log scan");
    } finally {
      setLoggingScan(false);
    }
  };

  const printAllLabels = () => {
    if (flattenedLabels.length === 0) {
      const fallbackQueue = buildQueueFromSavedBarcodes();

      if (fallbackQueue.length > 0) {
        setLabelQueue(fallbackQueue);
        setMessage(
          `Loaded ${fallbackQueue.length} saved barcode labels into the queue. Opening print preview...`,
        );
        window.setTimeout(() => {
          window.print();
        }, 0);
        return;
      }

      setMessage(
        "No labels found to print. Generate/save barcodes first, or search products with existing barcodes and try again.",
      );
      return;
    }

    setMessage("");
    window.print();
  };

  const exportAsJson = () => {
    const blob = new Blob([JSON.stringify(labelQueue, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `barcode-labels-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const labelSize = sizeToMm(settings.barcodeDefaultLabelSize);
  const flattenedLabels = flattenDrafts(labelQueue);

  return (
    <div className="barcode-page-root space-y-6">
      <style>{`
        .barcode-print-sheet {
          position: fixed;
          left: -200vw;
          top: 0;
          width: 100%;
          opacity: 0;
          pointer-events: none;
        }

        @media print {
          @page {
            size: auto;
            margin: 0;
          }

          html,
          body {
            margin: 0;
            padding: 0;
          }

          .barcode-page-root > :not(.barcode-print-sheet) {
            display: none !important;
          }

          .barcode-print-sheet {
            position: static;
            left: 0;
            top: 0;
            width: 100%;
            opacity: 1;
            pointer-events: auto;
            page-break-inside: avoid;
            padding: ${settings.barcodeMarginTopMm}mm ${settings.barcodeMarginRightMm}mm ${settings.barcodeMarginBottomMm}mm ${settings.barcodeMarginLeftMm}mm;
          }
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/20">
            <BarcodeIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Barcode Manager
            </h1>
            <p className="text-sm text-gray-500">
              Generate, print, configure, and track barcode usage.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              void loadProducts();
              if (activeTab === "history") void loadHistory();
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            onClick={printAllLabels}
            className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20"
          >
            <Printer className="h-4 w-4" /> Print Labels
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {message}
        </div>
      )}

      <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-100 bg-white p-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <Link
              key={tab.key}
              href={`/dashboard/barcodes?tab=${tab.key}`}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-orange-500 text-white shadow"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon className="h-4 w-4" /> {tab.label}
            </Link>
          );
        })}
      </div>

      {activeTab === "generate" && (
        <div className="grid gap-5 xl:grid-cols-3">
          <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 xl:col-span-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Search Product
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, SKU, barcode"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-9 py-2.5 text-sm"
              />
            </div>

            <div className="max-h-96 overflow-y-auto rounded-xl border border-gray-100">
              {loadingProducts ? (
                <div className="p-4 text-sm text-gray-500">
                  Loading products...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-4 text-sm text-gray-400">
                  No products found
                </div>
              ) : (
                filteredProducts.map((item) => (
                  <button
                    key={item._id}
                    onClick={() => setSelectedProductId(item._id)}
                    className={`w-full border-b border-gray-50 px-3 py-2.5 text-left last:border-b-0 ${
                      selectedProductId === item._id
                        ? "bg-orange-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-800">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {item.sku}{" "}
                      {item.barcode ? `• ${item.barcode}` : "• No barcode"}
                    </p>
                  </button>
                ))
              )}
            </div>

            <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-3 text-xs text-orange-700">
              Missing barcodes in loaded products:{" "}
              <span className="font-semibold">{missingProducts.length}</span>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 xl:col-span-2">
            {!selectedProduct ? (
              <div className="flex min-h-72 items-center justify-center text-sm text-gray-400">
                Select a product to generate or edit barcode.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {selectedProduct.name}
                    </h2>
                    <p className="text-xs text-gray-500">
                      SKU: {selectedProduct.sku}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                    <BadgeCheck className="h-3.5 w-3.5" /> Single Product
                    Generation
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      Barcode Format
                    </label>
                    <select
                      value={barcodeFormat}
                      onChange={(event) =>
                        setBarcodeFormat(
                          normalizeBarcodeFormat(event.target.value),
                        )
                      }
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
                    >
                      {BARCODE_FORMATS.map((format) => (
                        <option key={format} value={format}>
                          {format}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      Number Of Labels
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={labelsToPrint}
                      onChange={(event) =>
                        setLabelsToPrint(
                          Math.max(1, Number(event.target.value) || 1),
                        )
                      }
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Barcode Value
                  </label>
                  <input
                    value={barcodeValue}
                    onChange={(event) => {
                      if (settings.barcodeAllowManualOverride)
                        setBarcodeValue(event.target.value);
                    }}
                    disabled={!settings.barcodeAllowManualOverride}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-sm"
                  />
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={showNameOnLabel}
                      onChange={(event) =>
                        setShowNameOnLabel(event.target.checked)
                      }
                    />
                    Show Product Name
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={showPriceOnLabel}
                      onChange={(event) =>
                        setShowPriceOnLabel(event.target.checked)
                      }
                    />
                    Show Price
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={showSkuOnLabel}
                      onChange={(event) =>
                        setShowSkuOnLabel(event.target.checked)
                      }
                    />
                    Show SKU
                  </label>
                </div>

                <LabelPreview
                  draft={{
                    productId: selectedProduct._id,
                    productName: selectedProduct.name,
                    sku: selectedProduct.sku,
                    price: selectedProduct.price,
                    barcode: ensureBarcodeValue(
                      barcodeFormat,
                      barcodeValue,
                      selectedProduct.sku,
                    ),
                    format: barcodeFormat,
                    copies: labelsToPrint,
                    showName: showNameOnLabel,
                    showPrice: showPriceOnLabel,
                    showSku: showSkuOnLabel,
                  }}
                  heightMm={settings.barcodeDefaultHeightMm}
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={generateForSelected}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <Wand2 className="h-4 w-4" /> Generate Value
                  </button>
                  <button
                    onClick={saveSingleBarcode}
                    disabled={savingSingle || !barcodeValue.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />{" "}
                    {savingSingle ? "Saving..." : "Save Barcode"}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 xl:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Bulk Barcode Generation
                </h3>
                <p className="text-sm text-gray-500">
                  Select products without barcodes and generate all at once.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={bulkFormat}
                  onChange={(event) =>
                    setBulkFormat(normalizeBarcodeFormat(event.target.value))
                  }
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  {BARCODE_FORMATS.map((format) => (
                    <option key={format} value={format}>
                      {format}
                    </option>
                  ))}
                </select>
                <button
                  onClick={runBulkGeneration}
                  disabled={bulkBusy || selectedIds.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow disabled:opacity-60"
                >
                  <Wand2 className="h-4 w-4" />{" "}
                  {bulkBusy ? "Generating..." : "Generate All"}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left">
                      <input
                        type="checkbox"
                        checked={
                          missingProducts.length > 0 &&
                          selectedIds.length === missingProducts.length
                        }
                        onChange={(event) =>
                          setSelectedIds(
                            event.target.checked
                              ? missingProducts.map((item) => item._id)
                              : [],
                          )
                        }
                      />
                    </th>
                    <th className="px-3 py-2 text-left">Product</th>
                    <th className="px-3 py-2 text-left">SKU</th>
                    <th className="px-3 py-2 text-left">Current Barcode</th>
                  </tr>
                </thead>
                <tbody>
                  {missingProducts.map((item) => (
                    <tr key={item._id} className="border-t border-gray-100">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item._id)}
                          onChange={(event) => {
                            setSelectedIds((prev) => {
                              if (event.target.checked)
                                return [...prev, item._id];
                              return prev.filter((id) => id !== item._id);
                            });
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-800">
                        {item.name}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-500">
                        {item.sku}
                      </td>
                      <td className="px-3 py-2 text-gray-400">No barcode</td>
                    </tr>
                  ))}
                  {missingProducts.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-8 text-center text-sm text-gray-400"
                      >
                        All loaded products already have barcodes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "print" && (
        <div className="space-y-5">
          <div className="grid gap-4 rounded-2xl border border-gray-100 bg-white p-5 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Label Size
              </label>
              <select
                value={settings.barcodeDefaultLabelSize}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    barcodeDefaultLabelSize: event.target.value,
                  }))
                }
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
              >
                <option value="30x20">30mm x 20mm</option>
                <option value="40x25">40mm x 25mm</option>
                <option value="50x30">50mm x 30mm</option>
                <option value="58x40">58mm x 40mm</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Paper Size
              </label>
              <select
                value={settings.barcodeDefaultPaperSize}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    barcodeDefaultPaperSize: event.target.value,
                  }))
                }
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
              >
                <option value="A4">A4 Sheet</option>
                <option value="58mm">58mm Thermal Roll</option>
                <option value="80mm">80mm Thermal Roll</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Printer Type
              </label>
              <select
                value={settings.barcodeDefaultPrinterType}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    barcodeDefaultPrinterType: event.target.value,
                  }))
                }
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
              >
                <option value="thermal">Thermal Label Printer</option>
                <option value="inkjet">Standard Inkjet / Laser</option>
                <option value="pdf">PDF Export</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                This Device Printer
              </label>
              <select
                value={deviceDefaultPrinter}
                onChange={(event) => {
                  setDeviceDefaultPrinter(event.target.value);
                  writeDeviceBarcodePrinter(event.target.value);
                }}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
              >
                {DEVICE_PRINTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Barcode Height (mm)
              </label>
              <input
                type="range"
                min={18}
                max={60}
                value={settings.barcodeDefaultHeightMm}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    barcodeDefaultHeightMm: Number(event.target.value) || 26,
                  }))
                }
                className="mt-2 w-full"
              />
              <p className="text-xs text-gray-500">
                {settings.barcodeDefaultHeightMm} mm
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={printAllLabels}
              className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow"
            >
              <Printer className="h-4 w-4" /> Print Preview
            </button>
            <button
              onClick={exportAsJson}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700"
            >
              <Download className="h-4 w-4" /> Export Queue
            </button>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <h3 className="mb-3 text-base font-bold text-gray-900">
              Print Preview
            </h3>
            {labelQueue.length === 0 ? (
              <p className="text-sm text-gray-500">
                No generated labels yet. Generate or save barcodes first.
              </p>
            ) : (
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(120, mmToPixels(labelSize.width))}px, 1fr))`,
                }}
              >
                {labelQueue.map((draft) => (
                  <LabelPreview
                    key={`${draft.productId}-${draft.barcode}`}
                    draft={draft}
                    heightMm={settings.barcodeDefaultHeightMm}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4 text-sm text-orange-800">
            <p className="font-semibold">Thermal Printer Compatibility Notes</p>
            <p className="mt-1">
              Supported workflow for Xprinter XP-360B/XP-420B, HPRT LP100, Zebra
              ZD220, and generic 58mm printers. The selected device printer is
              stored only on this browser/device. Keep PDF export as fallback.
            </p>
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="space-y-5 rounded-2xl border border-gray-100 bg-white p-5">
          {loadingSettings ? (
            <p className="text-sm text-gray-500">Loading settings...</p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    System Default Format
                  </label>
                  <select
                    value={settings.barcodeDefaultFormat}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        barcodeDefaultFormat: normalizeBarcodeFormat(
                          event.target.value,
                        ),
                      }))
                    }
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
                  >
                    {BARCODE_FORMATS.map((format) => (
                      <option key={format} value={format}>
                        {format}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Default Font Size
                  </label>
                  <select
                    value={settings.barcodeDefaultFontSize}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        barcodeDefaultFontSize: event.target.value,
                      }))
                    }
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Barcode Prefix
                  </label>
                  <input
                    value={settings.barcodePrefix}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        barcodePrefix: event.target.value,
                      }))
                    }
                    placeholder="Optional prefix, e.g. SOL"
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Device Default Printer
                  </label>
                  <select
                    value={deviceDefaultPrinter}
                    onChange={(event) => {
                      setDeviceDefaultPrinter(event.target.value);
                      writeDeviceBarcodePrinter(event.target.value);
                    }}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
                  >
                    {DEVICE_PRINTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Saved per device, not per account.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={settings.barcodeAutoGenerateOnProductCreate}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        barcodeAutoGenerateOnProductCreate:
                          event.target.checked,
                      }))
                    }
                  />
                  Auto-generate barcode on product create
                </label>
                <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={settings.barcodeUseSkuAsDefaultValue}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        barcodeUseSkuAsDefaultValue: event.target.checked,
                      }))
                    }
                  />
                  Use product SKU as default barcode value
                </label>
                <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={settings.barcodeAllowManualOverride}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        barcodeAllowManualOverride: event.target.checked,
                      }))
                    }
                  />
                  Allow manual barcode overrides
                </label>
                <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={settings.barcodeShowPriceOnLabelsByDefault}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        barcodeShowPriceOnLabelsByDefault: event.target.checked,
                      }))
                    }
                  />
                  Show price on labels by default
                </label>
                <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={settings.barcodeScanSound}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        barcodeScanSound: event.target.checked,
                      }))
                    }
                  />
                  Barcode scan sound
                </label>
                <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={settings.barcodeFailedScanAlert}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        barcodeFailedScanAlert: event.target.checked,
                      }))
                    }
                  />
                  Failed scan alert
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Top Margin (mm)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={settings.barcodeMarginTopMm}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        barcodeMarginTopMm: Math.max(
                          0,
                          Number(event.target.value) || 0,
                        ),
                      }))
                    }
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Right Margin (mm)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={settings.barcodeMarginRightMm}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        barcodeMarginRightMm: Math.max(
                          0,
                          Number(event.target.value) || 0,
                        ),
                      }))
                    }
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Bottom Margin (mm)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={settings.barcodeMarginBottomMm}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        barcodeMarginBottomMm: Math.max(
                          0,
                          Number(event.target.value) || 0,
                        ),
                      }))
                    }
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Left Margin (mm)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={settings.barcodeMarginLeftMm}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        barcodeMarginLeftMm: Math.max(
                          0,
                          Number(event.target.value) || 0,
                        ),
                      }))
                    }
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <button
                  onClick={saveBarcodeSettings}
                  disabled={savingSettings}
                  className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />{" "}
                  {savingSettings ? "Saving..." : "Save Barcode Settings"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-5">
          <div className="grid gap-3 rounded-2xl border border-gray-100 bg-white p-5 md:grid-cols-[1fr_180px_140px]">
            <input
              value={scanValue}
              onChange={(event) => setScanValue(event.target.value)}
              placeholder="Scan barcode value"
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
            />
            <select
              value={scanContext}
              onChange={(event) => setScanContext(event.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
            >
              <option value="pos">POS terminal</option>
              <option value="stock">Stock operation</option>
              <option value="receiving">Goods receiving</option>
            </select>
            <button
              onClick={logScanEvent}
              disabled={loggingScan || !scanValue.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow disabled:opacity-60"
            >
              <QrCode className="h-4 w-4" />{" "}
              {loggingScan ? "Logging..." : "Log Scan"}
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Date &amp; Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Barcode Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Product Found
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Scanned By
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingHistory ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-gray-500"
                    >
                      Loading scan history...
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-gray-400"
                    >
                      No scan events yet.
                    </td>
                  </tr>
                ) : (
                  history.map((item) => (
                    <tr key={item._id} className="border-t border-gray-100">
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {item.barcodeValue}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-700">
                        {item.productFound}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${item.result === "not_found" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
                        >
                          <CheckCircle2 className="h-3 w-3" /> {item.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {item.location}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {item.scannedBy}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="barcode-print-sheet" aria-hidden="true">
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(120, mmToPixels(labelSize.width))}px, 1fr))`,
          }}
        >
          {flattenedLabels.map((draft, idx) => (
            <div
              key={`${draft.productId}-${idx}`}
              className="rounded border border-gray-300 p-2"
            >
              <LabelPreview
                draft={draft}
                heightMm={settings.barcodeDefaultHeightMm}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
