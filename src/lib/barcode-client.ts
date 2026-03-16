import type { BarcodeFormat } from "@/lib/barcode";

const DEVICE_PRINTER_STORAGE_KEY = "meka-barcode-device-printer";

interface BarcodeVariantLike {
  name?: string;
  sku?: string;
  barcode?: string;
  price?: number;
  stock?: number;
  imei?: string;
}

interface BarcodeProductLike {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  barcodeFormat?: string;
  price?: number;
  stock?: number;
  variants?: BarcodeVariantLike[];
}

export interface BarcodeProductMatch<TProduct extends BarcodeProductLike> {
  product: TProduct;
  variant?: BarcodeVariantLike;
}

function normalizeBarcodeValue(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function findBarcodeMatch<TProduct extends BarcodeProductLike>(
  products: TProduct[],
  barcode: string,
): BarcodeProductMatch<TProduct> | null {
  const target = normalizeBarcodeValue(barcode);
  if (!target) return null;

  for (const product of products) {
    if (normalizeBarcodeValue(product.barcode || "") === target) {
      return { product };
    }

    for (const variant of product.variants || []) {
      if (normalizeBarcodeValue(variant.barcode || "") === target) {
        return { product, variant };
      }
    }
  }

  return null;
}

export async function logBarcodeScanEvent(payload: {
  value: string;
  context: string;
  source?: string;
  module?: string;
  scanAction?: string;
  result?: "found" | "not_found";
  productId?: string;
  productName?: string;
  productSku?: string;
  locationId?: string;
  locationName?: string;
}) {
  await fetch("/api/barcodes/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function playBarcodeTone(kind: "success" | "error") {
  if (typeof window === "undefined") return;
  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextCtor) return;

  const ctx = new AudioContextCtor();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator.type = kind === "success" ? "sine" : "square";
  oscillator.frequency.value = kind === "success" ? 880 : 240;
  gainNode.gain.value = kind === "success" ? 0.04 : 0.06;
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  const now = ctx.currentTime;
  oscillator.start(now);
  oscillator.stop(now + (kind === "success" ? 0.09 : 0.16));
  oscillator.onended = () => {
    void ctx.close();
  };
}

export function readDeviceBarcodePrinter() {
  if (typeof window === "undefined") return "browser";
  return window.localStorage.getItem(DEVICE_PRINTER_STORAGE_KEY) || "browser";
}

export function writeDeviceBarcodePrinter(value: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEVICE_PRINTER_STORAGE_KEY, value);
}

export function getBarcodePreviewSummary(format: BarcodeFormat, value: string) {
  return `${format} • ${String(value || "").trim() || "Pending"}`;
}
