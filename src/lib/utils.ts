import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

type CurrencyRate = {
  code: string;
  rate: number;
  lastUpdatedAt?: string | Date;
};

type CurrencyDisplayConfig = {
  ledgerCurrency?: string;
  referenceCurrency?: string;
  rates?: CurrencyRate[];
};

const USD_BASE_RATES: Record<string, number> = {
  USD: 1,
  UGX: 3700,
  KES: 129,
  EUR: 0.92,
  GBP: 0.79,
  TZS: 2550,
  RWF: 1280,
  NGN: 1550,
  ZAR: 18.4,
  GHS: 15.6,
};

type PrintBrandingConfig = {
  businessName?: string;
  logo?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  physicalAddress?: string;
  phoneNumber?: string;
  emailAddress?: string;
};

declare global {
  interface Window {
    __MEKA_CURRENCY_CONFIG__?: CurrencyDisplayConfig;
    __MEKA_PRINT_BRANDING__?: PrintBrandingConfig;
  }
}

const DEFAULT_LEDGER_CURRENCY = "UGX";

function normalizeCurrencyCode(currency?: string) {
  return (currency || DEFAULT_LEDGER_CURRENCY).trim().toUpperCase();
}

function getCurrencyDisplayConfig(): CurrencyDisplayConfig {
  if (typeof window === "undefined") {
    return {
      ledgerCurrency: DEFAULT_LEDGER_CURRENCY,
      referenceCurrency: DEFAULT_LEDGER_CURRENCY,
      rates: getDefaultCurrencyRates(DEFAULT_LEDGER_CURRENCY),
    };
  }

  return {
    ledgerCurrency:
      window.__MEKA_CURRENCY_CONFIG__?.ledgerCurrency ||
      DEFAULT_LEDGER_CURRENCY,
    referenceCurrency:
      window.__MEKA_CURRENCY_CONFIG__?.referenceCurrency ||
      DEFAULT_LEDGER_CURRENCY,
    rates: window.__MEKA_CURRENCY_CONFIG__?.rates || [],
  };
}

export function getDefaultCurrencyRates(
  baseCurrency = DEFAULT_LEDGER_CURRENCY,
) {
  const normalizedBase = normalizeCurrencyCode(baseCurrency);
  const baseRate = USD_BASE_RATES[normalizedBase] || USD_BASE_RATES.UGX;

  return Object.entries(USD_BASE_RATES)
    .filter(([code]) => code !== normalizedBase)
    .map(([code, rate]) => ({
      code,
      rate: rate / baseRate,
    }));
}

function resolveCurrencyRate(
  currency: string,
  config: CurrencyDisplayConfig,
): number {
  const normalizedCurrency = normalizeCurrencyCode(currency);
  const referenceCurrency = normalizeCurrencyCode(config.referenceCurrency);

  if (normalizedCurrency === referenceCurrency) {
    return 1;
  }

  return (
    config.rates?.find(
      (rate) => normalizeCurrencyCode(rate.code) === normalizedCurrency,
    )?.rate || 0
  );
}

export function setCurrencyDisplayConfig(config: CurrencyDisplayConfig) {
  if (typeof window === "undefined") return;

  window.__MEKA_CURRENCY_CONFIG__ = {
    ledgerCurrency: normalizeCurrencyCode(
      config.ledgerCurrency || DEFAULT_LEDGER_CURRENCY,
    ),
    referenceCurrency: normalizeCurrencyCode(
      config.referenceCurrency || DEFAULT_LEDGER_CURRENCY,
    ),
    rates: (config.rates || []).map((rate) => ({
      ...rate,
      code: normalizeCurrencyCode(rate.code),
    })),
  };
}

export function convertCurrencyAmount(
  amount: number,
  targetCurrency: string,
  config: CurrencyDisplayConfig = getCurrencyDisplayConfig(),
): number {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return 0;

  const ledgerCurrency = normalizeCurrencyCode(config.ledgerCurrency);
  const referenceCurrency = normalizeCurrencyCode(config.referenceCurrency);
  const normalizedTarget = normalizeCurrencyCode(targetCurrency);

  if (ledgerCurrency === normalizedTarget) {
    return numericAmount;
  }

  const sourceRate = resolveCurrencyRate(ledgerCurrency, config);
  const targetRate = resolveCurrencyRate(normalizedTarget, config);

  const amountInReference =
    ledgerCurrency === referenceCurrency
      ? numericAmount
      : sourceRate > 0
        ? numericAmount / sourceRate
        : numericAmount;

  if (normalizedTarget === referenceCurrency) {
    return amountInReference;
  }

  return targetRate > 0 ? amountInReference * targetRate : numericAmount;
}

export function setPrintBrandingConfig(config: PrintBrandingConfig) {
  if (typeof window === "undefined") return;
  window.__MEKA_PRINT_BRANDING__ = config;
}

export function getPrintBrandingConfig(): PrintBrandingConfig {
  if (typeof window === "undefined") {
    return {};
  }

  return window.__MEKA_PRINT_BRANDING__ || {};
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getPrintBrandingMarkup(options?: {
  title?: string;
  subtitle?: string;
}) {
  const branding = getPrintBrandingConfig();
  const resolvedLogo = (() => {
    const value = (branding.logo || "").trim();
    if (!value) return "";
    if (/^(https?:|data:|blob:)/i.test(value)) return value;
    if (typeof window === "undefined") return value;
    return new URL(value, window.location.origin).toString();
  })();
  const lines = [
    branding.receiptHeader,
    branding.physicalAddress,
    [branding.phoneNumber, branding.emailAddress].filter(Boolean).join(" • "),
  ].filter(Boolean) as string[];

  return `
    <div class="brand-header">
      <div class="brand-header-main">
        ${resolvedLogo ? `<img class="brand-logo" src="${resolvedLogo}" alt="${escapeHtml(branding.businessName || "Business logo")}" />` : ""}
        <div class="brand-copy">
          <h1>${escapeHtml(branding.businessName || "Meka PoS")}</h1>
          ${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
        </div>
      </div>
      ${options?.title ? `<div class="document-header"><h2>${escapeHtml(options.title)}</h2>${options.subtitle ? `<p>${escapeHtml(options.subtitle)}</p>` : ""}</div>` : ""}
    </div>
  `;
}

export function getPrintFooterMarkup() {
  const footer = getPrintBrandingConfig().receiptFooter?.trim();
  if (!footer) return "";
  return `<div class="brand-footer">${escapeHtml(footer)}</div>`;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "UGX"): string {
  const convertedAmount = convertCurrencyAmount(amount, currency);
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(convertedAmount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  const rand = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `ORD-${y}${m}${d}-${rand}`;
}

export function generateInvoiceNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const rand = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `INV-${y}${m}-${rand}`;
}

export function generateSKU(category: string, name: string): string {
  const cat = category.substring(0, 3).toUpperCase();
  const nm = name.substring(0, 3).toUpperCase();
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `${cat}-${nm}-${rand}`;
}

export function generateBarcode(): string {
  return Math.floor(Math.random() * 9000000000000 + 1000000000000).toString();
}

export function calculateTax(amount: number, taxRate: number): number {
  return Math.round(amount * (taxRate / 100));
}

export function calculateDiscount(
  amount: number,
  discount: number,
  type: "percentage" | "fixed",
): number {
  if (type === "percentage") {
    return Math.round(amount * (discount / 100));
  }
  return discount;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function downloadCsv(
  filename: string,
  rows: Array<Record<string, string | number | null | undefined>>,
) {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const escapeCsv = (value: string | number | null | undefined) => {
    const stringValue =
      value === null || value === undefined ? "" : String(value);
    if (
      stringValue.includes(",") ||
      stringValue.includes("\n") ||
      stringValue.includes('"')
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCsv(row[header])).join(","),
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function printHtml(title: string, body: string) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return false;

  printWindow.document.open();
  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          .receipt { max-width: 420px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; }
          .brand-header { margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb; }
          .brand-header-main { display: flex; align-items: center; gap: 16px; }
          .brand-logo { width: 56px; height: 56px; object-fit: contain; border-radius: 12px; border: 1px solid #f3f4f6; }
          .brand-copy h1 { margin: 0; font-size: 22px; }
          .brand-copy p { margin: 4px 0 0; color: #6b7280; font-size: 12px; }
          .document-header { margin-top: 16px; }
          .document-header h2 { margin: 0; font-size: 18px; }
          .document-header p { margin: 6px 0 0; color: #6b7280; font-size: 12px; }
          .center { text-align: center; }
          .muted { color: #6b7280; font-size: 12px; }
          .total { font-size: 24px; font-weight: 700; color: #0f766e; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
          th { text-align: left; color: #6b7280; font-size: 12px; text-transform: uppercase; }
          td:last-child, th:last-child { text-align: right; }
          .summary { margin-top: 16px; }
          .summary-row { display: flex; justify-content: space-between; padding: 4px 0; }
          .brand-footer { margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center; }
        </style>
      </head>
      <body>${body}</body>
    </html>
  `);
  printWindow.document.close();

  let didPrint = false;
  const runPrint = () => {
    if (didPrint) return;
    didPrint = true;
    printWindow.focus();
    printWindow.print();
  };

  printWindow.addEventListener("afterprint", () => {
    printWindow.close();
  });

  if (printWindow.document.readyState === "complete") {
    runPrint();
  } else {
    printWindow.addEventListener("load", runPrint, { once: true });
    window.setTimeout(runPrint, 250);
  }

  return true;
}
