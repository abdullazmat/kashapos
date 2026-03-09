import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "UGX"): string {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
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
          .center { text-align: center; }
          .muted { color: #6b7280; font-size: 12px; }
          .total { font-size: 24px; font-weight: 700; color: #0f766e; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
          th { text-align: left; color: #6b7280; font-size: 12px; text-transform: uppercase; }
          td:last-child, th:last-child { text-align: right; }
          .summary { margin-top: 16px; }
          .summary-row { display: flex; justify-content: space-between; padding: 4px 0; }
        </style>
      </head>
      <body>${body}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
  return true;
}
