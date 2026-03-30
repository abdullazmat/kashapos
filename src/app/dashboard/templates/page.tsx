"use client";

import { useMemo, useState } from "react";
import { useSession } from "../layout";
import {
  FileStack,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Eye,
  Receipt,
  FileText,
  ShoppingBag,
  Mail,
  Search,
  Check,
  Sparkles,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";

type PreviewValue = string | number | boolean | undefined | null;

interface PreviewItem {
  name?: string;
  description?: string;
  quantity?: string | number;
  unit_price?: string | number;
  total?: string | number;
  sku?: string;
  discount?: string | number;
  product_name?: string;
  unit_cost?: string | number;
}

interface PreviewContext {
  business_name: string;
  business_address: string;
  business_phone: string;
  business_email: string;
  tax_id: string;
  receipt_number: string;
  invoice_number: string;
  po_number: string;
  invoice_date: string;
  due_date: string;
  date: string;
  time: string;
  cashier_name: string;
  customer_name: string;
  customer_address: string;
  customer_phone: string;
  vendor_name: string;
  vendor_address: string;
  vendor_phone: string;
  branch_name: string;
  branch_address: string;
  subtotal: string;
  tax_rate: string;
  tax_amount: string;
  grand_total: string;
  payment_method: string;
  amount_paid: string;
  change: string;
  receipt_footer: string;
  expected_delivery: string;
  shipping: string;
  tax: string;
  notes: string;
  created_by: string;
  item_count: string;
  total_discount: string;
  balance: string;
  mobile_money_number: string;
  bank_name: string;
  bank_account: string;
  items: PreviewItem[];
}

function renderTemplateString(template: string, context: PreviewContext) {
  let output = template;

  output = output.replace(
    /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_, key: keyof PreviewContext, inner: string) => {
      const value = context[key];

      if (Array.isArray(value)) {
        return value
          .map((entry) =>
            inner.replace(
              /\{\{(\w+)\}\}/g,
              (_token: string, token: keyof PreviewItem) => {
                const itemValue = entry[token];
                return itemValue === undefined || itemValue === null
                  ? ""
                  : String(itemValue);
              },
            ),
          )
          .join("");
      }

      return value
        ? inner.replace(
            /\{\{(\w+)\}\}/g,
            (_token: string, token: keyof PreviewContext) => {
              const nested = context[token];
              return nested === undefined ||
                nested === null ||
                Array.isArray(nested)
                ? ""
                : String(nested);
            },
          )
        : "";
    },
  );

  output = output.replace(
    /\{\{(\w+)\}\}/g,
    (_match, token: keyof PreviewContext) => {
      const value: PreviewValue | PreviewItem[] = context[token];
      if (value === undefined || value === null || Array.isArray(value))
        return "";
      return String(value);
    },
  );

  return output.replace(/\n{3,}/g, "\n\n").trim();
}

function buildPreviewContext(
  tenant: {
    name?: string;
    slug?: string;
    settings?: { taxRate?: number; receiptFooter?: string };
  } | null,
) {
  const today = new Date();
  return {
    business_name: tenant?.name || "KashaPOS Business",
    business_address: "Plot 12 Market Street, Kampala",
    business_phone: "+256 700 100 200",
    business_email: `${tenant?.slug || "business"}@poscloud.me`,
    tax_id: "TIN 104-884-219",
    receipt_number: "RCP-260309-1024",
    invoice_number: "INV-001234",
    po_number: "PO-001234",
    invoice_date: today.toLocaleDateString("en-UG"),
    due_date: new Date(
      today.getTime() + 14 * 24 * 60 * 60 * 1000,
    ).toLocaleDateString("en-UG"),
    date: today.toLocaleDateString("en-UG"),
    time: today.toLocaleTimeString("en-UG", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    cashier_name: "Sarah Nakamya",
    customer_name: "John Doe",
    customer_address: "Kololo, Kampala",
    customer_phone: "+256 701 222 333",
    vendor_name: "FreshBake Supplies",
    vendor_address: "Industrial Area, Kampala",
    vendor_phone: "+256 704 555 666",
    branch_name: "Main Branch",
    branch_address: "Kampala Road, Kampala",
    subtotal: "UGX 38,136",
    tax_rate: String(tenant?.settings?.taxRate || 18),
    tax_amount: "UGX 6,864",
    grand_total: "UGX 45,000",
    payment_method: "Cash",
    amount_paid: "UGX 50,000",
    change: "UGX 5,000",
    receipt_footer:
      tenant?.settings?.receiptFooter || "Thank you for shopping with us.",
    expected_delivery: new Date(
      today.getTime() + 5 * 24 * 60 * 60 * 1000,
    ).toLocaleDateString("en-UG"),
    shipping: "UGX 8,000",
    tax: "UGX 12,400",
    notes: "Please deliver between 9AM and 12PM.",
    created_by: "Sarah Nakamya",
    item_count: "3",
    total_discount: "UGX 2,500",
    balance: "UGX 45,000",
    mobile_money_number: "+256 772 111 222",
    bank_name: "Stanbic Bank",
    bank_account: "014220045102",
    items: [
      {
        name: "Cappuccino",
        description: "Cappuccino",
        quantity: 2,
        unit_price: "UGX 8,000",
        total: "UGX 16,000",
        sku: "HB-CAP-001",
        discount: "UGX 1,000",
        product_name: "Coffee Beans",
        unit_cost: "UGX 18,000",
      },
      {
        name: "Blueberry Muffin",
        description: "Blueberry Muffin",
        quantity: 1,
        unit_price: "UGX 12,000",
        total: "UGX 12,000",
        sku: "BK-BLU-004",
        product_name: "Paper Cups",
        unit_cost: "UGX 6,500",
      },
      {
        name: "Fresh Juice",
        description: "Fresh Juice",
        quantity: 1,
        unit_price: "UGX 10,136",
        total: "UGX 10,136",
        sku: "CB-JUI-009",
        product_name: "Milk Crate",
        unit_cost: "UGX 22,000",
      },
    ],
  } satisfies PreviewContext;
}

interface Template {
  id: string;
  name: string;
  type: "receipt" | "invoice" | "purchase_order" | "email";
  description: string;
  isDefault: boolean;
  lastUpdated: string;
  content: string;
}

const defaultTemplates: Template[] = [
  {
    id: "1",
    name: "Standard Receipt",
    type: "receipt",
    description: "Default receipt format with business info, items, and totals",
    isDefault: true,
    lastUpdated: "2026-03-01",
    content: `{{business_name}}
{{business_address}}
{{business_phone}}
================================
Receipt: {{receipt_number}}
Date: {{date}}
Cashier: {{cashier_name}}
================================
{{#items}}
{{name}}
  {{quantity}} x {{unit_price}}    {{total}}
{{/items}}
================================
Subtotal:        {{subtotal}}
Tax ({{tax_rate}}%):  {{tax_amount}}
TOTAL:           {{grand_total}}
================================
Payment: {{payment_method}}
{{#change}}Change: {{change}}{{/change}}

Thank you for your purchase!
{{receipt_footer}}`,
  },
  {
    id: "2",
    name: "Detailed Receipt",
    type: "receipt",
    description: "Receipt with SKU, discounts, and customer info",
    isDefault: false,
    lastUpdated: "2026-02-20",
    content: `{{business_name}}
{{business_address}} | {{business_phone}}
TIN: {{tax_id}}
================================
SALES RECEIPT
No: {{receipt_number}}
Date: {{date}} {{time}}
Customer: {{customer_name}}
Cashier: {{cashier_name}}
================================
{{#items}}
{{name}} ({{sku}})
  {{quantity}} x {{unit_price}}
  {{#discount}}Disc: -{{discount}}{{/discount}}
  Subtotal: {{total}}
{{/items}}
================================
Items: {{item_count}}
Subtotal: {{subtotal}}
Discount: -{{total_discount}}
Tax: {{tax_amount}}
TOTAL: {{grand_total}}
================================
Paid: {{amount_paid}}
Change: {{change}}
Method: {{payment_method}}

{{receipt_footer}}`,
  },
  {
    id: "3",
    name: "Standard Invoice",
    type: "invoice",
    description: "Professional invoice with payment terms and line items",
    isDefault: true,
    lastUpdated: "2026-02-28",
    content: `INVOICE

{{business_name}}
{{business_address}}
{{business_phone}} | {{business_email}}

Invoice #: {{invoice_number}}
Date: {{invoice_date}}
Due Date: {{due_date}}

Bill To:
{{customer_name}}
{{customer_address}}
{{customer_phone}}

| Description | Qty | Unit Price | Total |
|-------------|-----|-----------|-------|
{{#items}}
| {{description}} | {{quantity}} | {{unit_price}} | {{total}} |
{{/items}}

Subtotal: {{subtotal}}
Tax ({{tax_rate}}%): {{tax_amount}}
Total: {{grand_total}}

Payment Terms: Net 30
{{#notes}}Notes: {{notes}}{{/notes}}`,
  },
  {
    id: "4",
    name: "Purchase Order",
    type: "purchase_order",
    description: "Standard purchase order template for vendors",
    isDefault: true,
    lastUpdated: "2026-02-15",
    content: `PURCHASE ORDER

{{business_name}}
{{business_address}}

PO Number: {{po_number}}
Date: {{date}}
Expected Delivery: {{expected_delivery}}

Vendor:
{{vendor_name}}
{{vendor_address}}
{{vendor_phone}}

Ship To:
{{branch_name}}
{{branch_address}}

| Product | Qty | Unit Cost | Total |
|---------|-----|----------|-------|
{{#items}}
| {{product_name}} | {{quantity}} | {{unit_cost}} | {{total}} |
{{/items}}

Subtotal: {{subtotal}}
Tax: {{tax}}
Shipping: {{shipping}}
Total: {{grand_total}}

Notes: {{notes}}

Authorized By: {{created_by}}`,
  },
  {
    id: "5",
    name: "Invoice Email",
    type: "email",
    description: "Email template for sending invoices to customers",
    isDefault: true,
    lastUpdated: "2026-03-05",
    content: `Subject: Invoice {{invoice_number}} from {{business_name}}

Dear {{customer_name}},

Please find attached invoice {{invoice_number}} for {{grand_total}}.

Invoice Date: {{invoice_date}}
Due Date: {{due_date}}
Amount Due: {{balance}}

You can make payment via:
- Mobile Money: {{mobile_money_number}}
- Bank: {{bank_name}} - {{bank_account}}

If you have any questions, please don't hesitate to reach out.

Best regards,
{{business_name}}
{{business_phone}}`,
  },
  {
    id: "6",
    name: "Receipt Email",
    type: "email",
    description: "Email template for sending digital receipts",
    isDefault: false,
    lastUpdated: "2026-02-10",
    content: `Subject: Your receipt from {{business_name}} - {{receipt_number}}

Dear {{customer_name}},

Thank you for your purchase! Here's your digital receipt:

Receipt #: {{receipt_number}}
Date: {{date}}

{{#items}}
• {{name}} x{{quantity}} — {{total}}
{{/items}}

Total: {{grand_total}}
Payment: {{payment_method}}

Thank you for shopping with us!

{{business_name}}`,
  },
];

export default function TemplatesPage() {
  const { tenant } = useSession();
  const [templates, setTemplates] = useState<Template[]>(defaultTemplates);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );
  const [form, setForm] = useState({
    name: "",
    type: "receipt" as Template["type"],
    description: "",
    content: "",
  });

  const previewContext = useMemo(() => buildPreviewContext(tenant), [tenant]);

  const typeConfig: Record<
    string,
    { label: string; icon: React.ElementType; color: string; bg: string }
  > = {
    receipt: {
      label: "Receipt",
      icon: Receipt,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    invoice: {
      label: "Invoice",
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    purchase_order: {
      label: "Purchase Order",
      icon: ShoppingBag,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    email: {
      label: "Email",
      icon: Mail,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  };

  const filtered = templates.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || t.type === filterType;
    return matchSearch && matchType;
  });

  const openAdd = () => {
    setSelectedTemplate(null);
    setForm({ name: "", type: "receipt", description: "", content: "" });
    setShowModal(true);
  };

  const openEdit = (t: Template) => {
    setSelectedTemplate(t);
    setForm({
      name: t.name,
      type: t.type,
      description: t.description,
      content: t.content,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (selectedTemplate) {
      setTemplates(
        templates.map((t) =>
          t.id === selectedTemplate.id
            ? {
                ...t,
                ...form,
                lastUpdated: new Date().toISOString().split("T")[0],
              }
            : t,
        ),
      );
    } else {
      setTemplates([
        ...templates,
        {
          id: Date.now().toString(),
          ...form,
          isDefault: false,
          lastUpdated: new Date().toISOString().split("T")[0],
        },
      ]);
    }
    setShowModal(false);
  };

  const duplicateTemplate = (t: Template) => {
    setTemplates([
      ...templates,
      {
        ...t,
        id: Date.now().toString(),
        name: `${t.name} (Copy)`,
        isDefault: false,
        lastUpdated: new Date().toISOString().split("T")[0],
      },
    ]);
  };

  const deleteTemplate = (id: string) => {
    setTemplates(templates.filter((t) => t.id !== id));
  };

  const setDefault = (id: string) => {
    const template = templates.find((t) => t.id === id);
    if (!template) return;
    setTemplates(
      templates.map((t) =>
        t.type === template.type ? { ...t, isDefault: t.id === id } : t,
      ),
    );
  };

  const previewTemplate = (t: Template) => {
    setSelectedTemplate(t);
    setShowPreview(true);
  };

  const previewContent = (content: string) => {
    return renderTemplateString(content, previewContext);
  };

  const renderPreviewBody = (template: Template) => {
    const resolved = previewContent(template.content);
    const lines = resolved.split("\n");
    const blocks: Array<{
      type: "text" | "divider" | "table";
      lines?: string[];
    }> = [];
    let tableBuffer: string[] = [];

    const flushTable = () => {
      if (tableBuffer.length > 0) {
        blocks.push({ type: "table", lines: tableBuffer });
        tableBuffer = [];
      }
    };

    for (const line of lines) {
      if (line.trim().startsWith("|")) {
        tableBuffer.push(line);
        continue;
      }

      flushTable();

      if (line.includes("====") || line.includes("----")) {
        blocks.push({ type: "divider" });
      } else {
        blocks.push({ type: "text", lines: [line] });
      }
    }

    flushTable();

    const wrapperClass =
      template.type === "email"
        ? "rounded-[28px] border border-purple-100 bg-gradient-to-br from-white to-purple-50/40 p-6 shadow-[0_24px_60px_-28px_rgba(88,28,135,0.35)] dark:border-purple-900/40 dark:from-slate-900 dark:to-purple-950/30"
        : "rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#fff,rgba(248,250,252,0.96))] p-6 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-none dark:bg-slate-900";

    return (
      <div className={wrapperClass}>
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-700">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              {template.type.replace("_", " ")}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">
              {template.name}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {template.description}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white/80 px-3 py-2 text-right shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              Preview
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-700">
              Live sample data
            </p>
          </div>
        </div>

        <div className="space-y-3 text-[14px] leading-7 text-slate-700">
          {blocks.map((block, index) => {
            if (block.type === "divider") {
              return <div key={index} className="my-2 h-px bg-slate-200" />;
            }

            if (block.type === "table" && block.lines) {
              const rows = block.lines
                .filter((line) => !/^\|[-\s|]+\|?$/.test(line.trim()))
                .map((line) =>
                  line
                    .split("|")
                    .map((cell) => cell.trim())
                    .filter(Boolean),
                )
                .filter((cells) => cells.length > 0);

              if (rows.length === 0) return null;

              const [header, ...body] = rows;
              return (
                <div
                  key={index}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                >
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                      <tr>
                        {header.map((cell) => (
                          <th
                            key={cell}
                            className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em]"
                          >
                            {cell}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {body.map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className="border-t border-slate-100 dark:border-slate-700"
                        >
                          {row.map((cell, cellIndex) => (
                            <td
                              key={`${rowIndex}-${cellIndex}`}
                              className="px-4 py-3 text-slate-700"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }

            const text = block.lines?.[0] || "";
            if (!text.trim()) return <div key={index} className="h-2" />;

            const isHeadline = index === 0 || /^[A-Z\s]+$/.test(text.trim());
            const isMeta = text.includes(":") && text.length < 44;

            return (
              <p
                key={index}
                className={
                  isHeadline
                    ? "text-base font-semibold tracking-[0.08em] text-slate-900"
                    : isMeta
                      ? "text-sm font-medium text-slate-600"
                      : "text-[14px] text-slate-700"
                }
              >
                {text}
              </p>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 dark:text-slate-100">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.14),transparent_34%),radial-gradient(circle_at_top_right,rgba(79,70,229,0.12),transparent_28%),linear-gradient(180deg,#ffffff,#f8fafc)] px-7 py-8 dark:border-slate-700 dark:bg-none dark:bg-slate-900">
        <div className="absolute right-5 top-5 rounded-2xl border border-white/60 bg-white/75 px-3 py-2 backdrop-blur dark:border-slate-600 dark:bg-slate-800/80">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Sparkles className="h-4 w-4 text-orange-500" />
            Live business previews
          </div>
        </div>
        <div className="flex items-center justify-between gap-6">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/20">
                <FileStack className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Templates
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                  Real document previews for receipts, invoices, purchase
                  orders, and emails
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-800/80 dark:ring-slate-600">
                <CalendarDays className="h-4 w-4 text-indigo-500" />
                Updated for {tenant?.name || "your business"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-800/80 dark:ring-slate-600">
                <ShieldCheck className="h-4 w-4 text-amber-500" />
                Dynamic fields resolved in preview
              </span>
            </div>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:shadow-xl"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-3 border border-slate-200 rounded-2xl bg-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {["all", "receipt", "invoice", "purchase_order", "email"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`rounded-full px-4 py-2 text-sm capitalize transition-all ${
                filterType === t
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800"
              }`}
            >
              {t === "all"
                ? "All"
                : t === "purchase_order"
                  ? "Purchase Order"
                  : t}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((template) => {
          const config = typeConfig[template.type];
          const Icon = config.icon;
          const previewLines = previewContent(template.content)
            .split("\n")
            .filter((line) => line.trim())
            .slice(0, 4);

          return (
            <div
              key={template.id}
              className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-30px_rgba(15,23,42,0.3)] dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="border-b border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),#fff)] px-5 py-4 dark:border-slate-700 dark:bg-none dark:bg-slate-900">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl ${config.bg}`}
                    >
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {template.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className={`${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-400">
                          {new Date(template.lastUpdated).toLocaleDateString(
                            "en-UG",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  {template.isDefault && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      <Check className="w-3 h-3" /> Default
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">
                  {template.description}
                </p>
              </div>

              <div className="p-5">
                <div className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#fff,rgba(248,250,252,0.92))] p-4 shadow-inner dark:border-slate-700 dark:bg-none dark:bg-slate-900">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Live Preview
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {tenant?.name || "Business"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {previewLines.map((line, index) => (
                      <p
                        key={`${template.id}-${index}`}
                        className={
                          index === 0
                            ? "text-sm font-semibold text-slate-900"
                            : "text-xs leading-5 text-slate-500"
                        }
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-1">
                  <button
                    onClick={() => previewTemplate(template)}
                    className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>
                  <button
                    onClick={() => openEdit(template)}
                    className="rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => duplicateTemplate(template)}
                    className="rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {!template.isDefault && (
                    <>
                      <button
                        onClick={() => setDefault(template.id)}
                        className="rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-orange-50 hover:text-orange-600 dark:text-slate-300 dark:hover:bg-orange-900/20 dark:hover:text-orange-300"
                        title="Set as default"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteTemplate(template.id)}
                        className="rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-slate-300 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-[28px] border border-dashed border-slate-300 bg-white/80 py-20 text-center text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
            No templates found
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:border dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 dark:text-slate-100">
              {selectedTemplate ? "Edit Template" : "New Template"}
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">
                    Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="Template name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">
                    Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        type: e.target.value as Template["type"],
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="receipt">Receipt</option>
                    <option value="invoice">Invoice</option>
                    <option value="purchase_order">Purchase Order</option>
                    <option value="email">Email</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">
                  Description
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="Brief description"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Content
                  </label>
                  <span className="text-xs text-gray-400 dark:text-slate-400">
                    Use {"{{variable}}"} for dynamic values
                  </span>
                </div>
                <textarea
                  value={form.content}
                  onChange={(e) =>
                    setForm({ ...form, content: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  rows={16}
                  placeholder="Template content with {{variables}}"
                />
              </div>
              <div className="bg-gray-50 rounded-lg p-3 dark:bg-slate-800/70">
                <p className="text-xs font-medium text-gray-600 mb-1 dark:text-slate-300">
                  Available Variables:
                </p>
                <div className="flex flex-wrap gap-1">
                  {[
                    "business_name",
                    "business_address",
                    "business_phone",
                    "receipt_number",
                    "invoice_number",
                    "date",
                    "customer_name",
                    "cashier_name",
                    "subtotal",
                    "tax_rate",
                    "tax_amount",
                    "grand_total",
                    "payment_method",
                  ].map((v) => (
                    <code
                      key={v}
                      className="text-[10px] bg-white px-1.5 py-0.5 rounded border text-gray-600 cursor-pointer hover:bg-orange-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      onClick={() =>
                        setForm({ ...form, content: form.content + `{{${v}}}` })
                      }
                    >
                      {`{{${v}}}`}
                    </code>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name || !form.content}
                className="px-4 py-2 text-sm text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {selectedTemplate ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-[30px] bg-white p-6 shadow-[0_30px_90px_-30px_rgba(15,23,42,0.55)] max-h-[92vh] overflow-y-auto dark:bg-slate-900 dark:border dark:border-slate-700">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {selectedTemplate.name} Preview
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Rendered with live sample business data instead of template
                  placeholders.
                </p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            {renderPreviewBody(selectedTemplate)}
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowPreview(false)}
                className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
