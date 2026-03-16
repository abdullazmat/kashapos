export const BARCODE_FORMATS = [
  "EAN-13",
  "EAN-8",
  "Code 128",
  "Code 39",
  "QR Code",
  "UPC-A",
] as const;

export type BarcodeFormat = (typeof BARCODE_FORMATS)[number];

export function buildBarcodeSeed(
  prefix: string | undefined,
  sku: string | undefined,
) {
  const cleanPrefix = String(prefix || "").trim();
  const cleanSku = String(sku || "").trim();
  if (cleanPrefix && cleanSku) return `${cleanPrefix}-${cleanSku}`;
  return cleanPrefix || cleanSku;
}

function randomDigits(length: number) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += Math.floor(Math.random() * 10).toString();
  }
  return out;
}

function cleanDigits(value: string) {
  return (value || "").replace(/\D/g, "");
}

function cleanAlphaNumeric(value: string) {
  return (value || "").replace(/[^a-zA-Z0-9\-\. \$\/\+%]/g, "");
}

function ean13CheckDigit(value12: string) {
  const digits = value12.split("").map((digit) => Number(digit));
  const sum = digits.reduce(
    (acc, digit, index) => acc + digit * (index % 2 === 0 ? 1 : 3),
    0,
  );
  return (10 - (sum % 10)) % 10;
}

function ean8CheckDigit(value7: string) {
  const digits = value7.split("").map((digit) => Number(digit));
  const sum = digits.reduce(
    (acc, digit, index) => acc + digit * (index % 2 === 0 ? 3 : 1),
    0,
  );
  return (10 - (sum % 10)) % 10;
}

function upcaCheckDigit(value11: string) {
  const digits = value11.split("").map((digit) => Number(digit));
  let odd = 0;
  let even = 0;
  digits.forEach((digit, index) => {
    if (index % 2 === 0) odd += digit;
    else even += digit;
  });
  const sum = odd * 3 + even;
  return (10 - (sum % 10)) % 10;
}

export function normalizeBarcodeFormat(
  value: string | undefined,
): BarcodeFormat {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (normalized === "EAN-13") return "EAN-13";
  if (normalized === "EAN-8") return "EAN-8";
  if (normalized === "CODE 128" || normalized === "CODE128") return "Code 128";
  if (normalized === "CODE 39" || normalized === "CODE39") return "Code 39";
  if (
    normalized === "QR CODE" ||
    normalized === "QRCODE" ||
    normalized === "QR"
  ) {
    return "QR Code";
  }
  if (normalized === "UPC-A" || normalized === "UPCA") return "UPC-A";
  return "Code 128";
}

export function toReactBarcodeFormat(
  format: BarcodeFormat,
): "EAN13" | "EAN8" | "CODE128" | "CODE39" | "UPC" {
  switch (format) {
    case "EAN-13":
      return "EAN13";
    case "EAN-8":
      return "EAN8";
    case "Code 39":
      return "CODE39";
    case "UPC-A":
      return "UPC";
    default:
      return "CODE128";
  }
}

export function generateBarcodeValue(format: BarcodeFormat, seed: string) {
  const source = String(seed || "").trim();

  if (format === "EAN-13") {
    const digits = cleanDigits(source)
      .slice(0, 12)
      .padEnd(12, randomDigits(12));
    const withCheck = `${digits.slice(0, 12)}${ean13CheckDigit(digits.slice(0, 12))}`;
    return withCheck;
  }

  if (format === "EAN-8") {
    const digits = cleanDigits(source).slice(0, 7).padEnd(7, randomDigits(7));
    return `${digits.slice(0, 7)}${ean8CheckDigit(digits.slice(0, 7))}`;
  }

  if (format === "UPC-A") {
    const digits = cleanDigits(source)
      .slice(0, 11)
      .padEnd(11, randomDigits(11));
    return `${digits.slice(0, 11)}${upcaCheckDigit(digits.slice(0, 11))}`;
  }

  if (format === "Code 39") {
    const cleaned = cleanAlphaNumeric(source)
      .toUpperCase()
      .replace(/\s+/g, "-");
    return cleaned.slice(0, 24) || `SKU-${randomDigits(6)}`;
  }

  if (format === "QR Code") {
    const cleaned = source.trim();
    return cleaned || `SKU:${randomDigits(8)}`;
  }

  const cleaned = source.trim();
  return cleaned.slice(0, 48) || `SKU-${randomDigits(8)}`;
}

export function ensureBarcodeValue(
  format: BarcodeFormat,
  currentValue: string,
  sku: string,
) {
  const candidate = String(currentValue || "").trim();
  if (candidate) return generateBarcodeValue(format, candidate);
  return generateBarcodeValue(format, sku || "");
}
