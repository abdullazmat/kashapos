"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Eye,
  Plus,
  X,
  DollarSign,
  Send,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Printer,
} from "lucide-react";
import {
  formatCurrency,
  formatDate,
  printHtml,
  escapeHtml,
  getPrintBrandingMarkup,
  getPrintFooterMarkup,
} from "@/lib/utils";
import { useSession } from "../layout";

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  tax: number;
  total: number;
}
interface Invoice {
  _id: string;
  invoiceNumber: string;
  customerId?: { _id: string; name: string; phone: string; email: string };
  items: InvoiceItem[];
  subtotal: number;
  totalTax: number;
  tax: number;
  total: number;
  status: string;
  dueDate: string;
  amountPaid: number;
  balance: number;
  notes: string;
  createdAt: string;
}
interface Customer {
  _id: string;
  name: string;
  phone: string;
  email: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-50 text-gray-700 ring-1 ring-gray-600/10",
  sent: "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20",
  paid: "bg-emerald-50 text-emerald-700 ring-1 ring-amber-600/20",
  overdue: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
  cancelled: "bg-red-50 text-red-600 ring-1 ring-red-600/20",
};

export default function InvoicesPage() {
  const { tenant } = useSession();
  const currency = tenant?.settings?.currency || "UGX";
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showPayment, setShowPayment] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const [newInvoice, setNewInvoice] = useState({
    customerId: "",
    dueDate: "",
    notes: "",
    customTaxRate: "",
    items: [{ description: "", quantity: 1, unitPrice: 0 }] as {
      description: string;
      quantity: number;
      unitPrice: number;
    }[],
  });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "20",
      ...(statusFilter && { status: statusFilter }),
    });
    try {
      const res = await fetch(`/api/invoices?${params}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices);
        setTotal(data.total);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [page, statusFilter]);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch("/api/customers?limit=200");
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || data);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const totalPages = Math.ceil(total / 20);

  const addItem = () => {
    setNewInvoice({
      ...newInvoice,
      items: [
        ...newInvoice.items,
        { description: "", quantity: 1, unitPrice: 0 },
      ],
    });
  };
  const removeItem = (idx: number) => {
    setNewInvoice({
      ...newInvoice,
      items: newInvoice.items.filter((_, i) => i !== idx),
    });
  };
  const updateItem = (idx: number, field: string, value: string | number) => {
    const items = [...newInvoice.items];
    items[idx] = { ...items[idx], [field]: value };
    setNewInvoice({ ...newInvoice, items });
  };

  const createInvoice = async () => {
    const taxRate =
      (newInvoice.customTaxRate !== ""
        ? parseFloat(newInvoice.customTaxRate)
        : tenant?.settings?.taxRate || 0) / 100;
    const items = newInvoice.items.map((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      const tax = lineTotal * taxRate;
      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        tax,
        total: lineTotal + tax,
      };
    });
    const subtotal = items.reduce(
      (sum, i) => sum + i.quantity * i.unitPrice,
      0,
    );
    const totalTax = items.reduce((sum, i) => sum + i.tax, 0);
    const invoiceTotal = subtotal + totalTax;
    const body = {
      customerId: newInvoice.customerId || undefined,
      dueDate: newInvoice.dueDate || undefined,
      notes: newInvoice.notes,
      items,
      subtotal,
      totalTax,
      total: invoiceTotal,
      balance: invoiceTotal,
      status: "draft",
    };
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setShowCreate(false);
      setNewInvoice({
        customerId: "",
        dueDate: "",
        notes: "",
        customTaxRate: "",
        items: [{ description: "", quantity: 1, unitPrice: 0 }],
      });
      fetchInvoices();
    }
  };

  const recordPayment = async () => {
    if (!showPayment) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;
    const newPaid = (showPayment.amountPaid || 0) + amount;
    const res = await fetch("/api/invoices", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: showPayment._id, amountPaid: newPaid }),
    });
    if (res.ok) {
      setShowPayment(null);
      setPaymentAmount("");
      fetchInvoices();
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch("/api/invoices", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: id, status }),
    });
    if (res.ok) fetchInvoices();
  };

  const invoiceSubtotal =
    newInvoice.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0) || 0;
  const inputClass =
    "mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm transition-colors focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20";

  const statusTabs = [
    { key: "", label: "All" },
    { key: "draft", label: "Draft" },
    { key: "sent", label: "Sent" },
    { key: "paid", label: "Paid" },
    { key: "overdue", label: "Overdue" },
    { key: "cancelled", label: "Cancelled" },
  ];

  const printInvoice = (invoice: Invoice) => {
    const balance =
      invoice.balance || Math.max(0, invoice.total - invoice.amountPaid);
    printHtml(
      `Invoice ${invoice.invoiceNumber}`,
      `
        <div class="receipt" style="max-width:720px;">
          ${getPrintBrandingMarkup({
            title: `Invoice ${invoice.invoiceNumber}`,
            subtitle: `Issued ${formatDate(invoice.createdAt)}${invoice.dueDate ? ` • Due ${formatDate(invoice.dueDate)}` : ""}`,
          })}
          <div class="summary-row"><span>Bill To</span><span>${escapeHtml(invoice.customerId?.name || "Walk-in Customer")}</span></div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items
                .map(
                  (item) => `
                    <tr>
                      <td>${escapeHtml(item.description)}</td>
                      <td>${item.quantity}</td>
                      <td>${formatCurrency(item.unitPrice, currency)}</td>
                      <td>${formatCurrency(item.total, currency)}</td>
                    </tr>`,
                )
                .join("")}
            </tbody>
          </table>
          <div class="summary">
            <div class="summary-row"><span>Subtotal</span><span>${formatCurrency(invoice.subtotal, currency)}</span></div>
            <div class="summary-row"><span>Tax</span><span>${formatCurrency(invoice.totalTax || invoice.tax || 0, currency)}</span></div>
            <div class="summary-row total"><span>Total</span><span>${formatCurrency(invoice.total, currency)}</span></div>
            <div class="summary-row"><span>Paid</span><span>${formatCurrency(invoice.amountPaid || 0, currency)}</span></div>
            <div class="summary-row"><span>Balance</span><span>${formatCurrency(balance, currency)}</span></div>
          </div>
          ${invoice.notes ? `<div style="margin-top:16px;border:1px solid #e5e7eb;border-radius:12px;padding:12px;color:#4b5563;">${escapeHtml(invoice.notes)}</div>` : ""}
          ${getPrintFooterMarkup()}
        </div>
      `,
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/20">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
            <p className="text-[13px] text-gray-500">
              Create and manage customer invoices
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg hover:shadow-orange-500/30"
        >
          <Plus className="h-4 w-4" /> New Invoice
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 rounded-2xl border border-gray-100 bg-white p-1.5">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setStatusFilter(tab.key);
              setPage(1);
            }}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              statusFilter === tab.key
                ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-sm shadow-orange-500/25"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-100 bg-blue-50/60">
                <th className="px-5 py-3.5 text-left text-[13px] font-semibold text-gray-600">
                  Invoice #
                </th>
                <th className="px-5 py-3.5 text-left text-[13px] font-semibold text-gray-600">
                  Date
                </th>
                <th className="px-5 py-3.5 text-left text-[13px] font-semibold text-gray-600">
                  Customer
                </th>
                <th className="px-5 py-3.5 text-right text-[13px] font-semibold text-gray-600">
                  Total
                </th>
                <th className="px-5 py-3.5 text-right text-[13px] font-semibold text-gray-600">
                  Paid
                </th>
                <th className="px-5 py-3.5 text-center text-[13px] font-semibold text-gray-600">
                  Status
                </th>
                <th className="px-5 py-3.5 text-center text-[13px] font-semibold text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-blue-500" />
                      <span className="text-sm text-gray-400">
                        Loading invoices...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                        <FileText className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="font-medium text-gray-500">
                        No invoices found
                      </p>
                      <p className="text-[13px] text-gray-400">
                        Create your first invoice to get started
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr
                    key={inv._id}
                    className="group transition-colors hover:bg-gray-50/80"
                  >
                    <td className="px-5 py-3.5">
                      <span className="rounded-lg bg-gray-100 px-2 py-1 font-mono text-xs font-semibold text-gray-700">
                        {inv.invoiceNumber}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-gray-700">
                        {formatDate(inv.createdAt)}
                      </div>
                      {inv.dueDate && (
                        <div className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Calendar className="h-3 w-3" /> Due:{" "}
                          {formatDate(inv.dueDate)}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-cyan-200 text-[10px] font-bold text-blue-700">
                          {(inv.customerId?.name || "W")[0]}
                        </div>
                        <span className="text-gray-700">
                          {inv.customerId?.name || "Walk-in"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-gray-900">
                      {formatCurrency(inv.total, currency)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-500">
                      {formatCurrency(inv.amountPaid || 0, currency)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusColors[inv.status] || "bg-gray-50 text-gray-700"}`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => setViewInvoice(inv)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {inv.status !== "paid" &&
                          inv.status !== "cancelled" && (
                            <button
                              onClick={() => {
                                setShowPayment(inv);
                                setPaymentAmount("");
                              }}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-emerald-50 hover:text-amber-600"
                              title="Record Payment"
                            >
                              <DollarSign className="h-4 w-4" />
                            </button>
                          )}
                        {inv.status === "draft" && (
                          <button
                            onClick={() => updateStatus(inv._id, "sent")}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                            title="Mark as Sent"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                        {inv.status !== "cancelled" && (
                          <button
                            onClick={() => updateStatus(inv._id, "cancelled")}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            title="Hide invoice"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
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
              <span className="font-medium text-gray-700">{totalPages}</span>
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
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

      {/* View Invoice Modal */}
      {viewInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setViewInvoice(null)}
        >
          <div
            className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-md shadow-blue-500/20">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">
                    {viewInvoice.invoiceNumber}
                  </h2>
                  <p className="text-[13px] text-gray-500">
                    {formatDate(viewInvoice.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewInvoice(null)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="mb-5 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                    Customer
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-gray-700">
                    {viewInvoice.customerId?.name || "Walk-in"}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                    Status
                  </p>
                  <span
                    className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusColors[viewInvoice.status]}`}
                  >
                    {viewInvoice.status}
                  </span>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                    Due Date
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-gray-700">
                    {viewInvoice.dueDate
                      ? formatDate(viewInvoice.dueDate)
                      : "—"}
                  </p>
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
                  {viewInvoice.items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-2.5 font-medium text-gray-700">
                        {item.description}
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
                    {formatCurrency(viewInvoice.subtotal, currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax</span>
                  <span className="text-gray-700">
                    {formatCurrency(
                      viewInvoice.totalTax || viewInvoice.tax || 0,
                      currency,
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 font-bold">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900">
                    {formatCurrency(viewInvoice.total, currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-amber-600">
                  <span>Paid</span>
                  <span>
                    {formatCurrency(viewInvoice.amountPaid || 0, currency)}
                  </span>
                </div>
                {(viewInvoice.balance || 0) > 0 && (
                  <div className="flex justify-between text-sm font-semibold text-red-600">
                    <span>Balance</span>
                    <span>{formatCurrency(viewInvoice.balance, currency)}</span>
                  </div>
                )}
              </div>
              {viewInvoice.notes && (
                <div className="mt-4 rounded-xl bg-blue-50/50 p-3 text-sm text-gray-600">
                  {viewInvoice.notes}
                </div>
              )}

              {/* Send Actions */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => printInvoice(viewInvoice)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </button>
                {viewInvoice.customerId?.email && (
                  <button
                    onClick={() => {
                      const subject = encodeURIComponent(
                        `Invoice ${viewInvoice.invoiceNumber}`,
                      );
                      const body = encodeURIComponent(
                        `Dear ${viewInvoice.customerId?.name},\n\nPlease find your invoice ${viewInvoice.invoiceNumber} for ${formatCurrency(viewInvoice.total, currency)}.\n\nDue: ${viewInvoice.dueDate ? formatDate(viewInvoice.dueDate) : "On receipt"}\nBalance: ${formatCurrency(viewInvoice.balance || 0, currency)}\n\nThank you for your business!`,
                      );
                      window.open(
                        `mailto:${viewInvoice.customerId?.email}?subject=${subject}&body=${body}`,
                        "_blank",
                      );
                    }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Email
                  </button>
                )}
                {viewInvoice.customerId?.phone && (
                  <button
                    onClick={() => {
                      const phone = viewInvoice.customerId?.phone?.replace(
                        /\D/g,
                        "",
                      );
                      const text = encodeURIComponent(
                        `Invoice: ${viewInvoice.invoiceNumber}\nTotal: ${formatCurrency(viewInvoice.total, currency)}\nBalance: ${formatCurrency(viewInvoice.balance || 0, currency)}\nDue: ${viewInvoice.dueDate ? formatDate(viewInvoice.dueDate) : "On receipt"}\n\nThank you!`,
                      );
                      window.open(
                        `https://wa.me/${phone}?text=${text}`,
                        "_blank",
                      );
                    }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-sm font-semibold text-green-700 transition-colors hover:bg-green-100"
                  >
                    <Send className="h-3.5 w-3.5" />
                    WhatsApp
                  </button>
                )}
                {viewInvoice.status === "draft" && (
                  <button
                    onClick={() => {
                      updateStatus(viewInvoice._id, "sent");
                      setViewInvoice(null);
                    }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-3 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/25"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Mark Sent
                  </button>
                )}
                {viewInvoice.status !== "cancelled" && (
                  <button
                    onClick={() => {
                      updateStatus(viewInvoice._id, "cancelled");
                      setViewInvoice(null);
                    }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
                  >
                    <X className="h-3.5 w-3.5" />
                    Hide Invoice
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPayment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowPayment(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-green-600 shadow-md shadow-amber-500/20">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
                <h2 className="font-bold text-gray-900">Record Payment</h2>
              </div>
              <button
                onClick={() => setShowPayment(null)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5">
              <div className="mb-4 space-y-2 rounded-xl bg-gray-50 p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Invoice</span>
                  <span className="font-semibold text-gray-700">
                    {showPayment.invoiceNumber}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total</span>
                  <span className="text-gray-700">
                    {formatCurrency(showPayment.total, currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Paid</span>
                  <span className="text-amber-600">
                    {formatCurrency(showPayment.amountPaid || 0, currency)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 text-sm font-semibold">
                  <span className="text-red-600">Balance</span>
                  <span className="text-red-600">
                    {formatCurrency(
                      showPayment.total - (showPayment.amountPaid || 0),
                      currency,
                    )}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-[13px] font-semibold text-gray-700">
                  Payment Amount
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0"
                  className={inputClass}
                  autoFocus
                />
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() =>
                    setPaymentAmount(
                      String(showPayment.total - (showPayment.amountPaid || 0)),
                    )
                  }
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Pay Full Balance
                </button>
                <button
                  onClick={recordPayment}
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-green-600 px-3 py-2.5 text-sm font-medium text-white shadow-md shadow-amber-500/25 transition-all hover:shadow-lg disabled:opacity-50 disabled:shadow-none"
                >
                  Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-md shadow-blue-500/20">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <h2 className="font-bold text-gray-900">Create Invoice</h2>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="text-[13px] font-semibold text-gray-700">
                    Customer
                  </label>
                  <select
                    value={newInvoice.customerId}
                    onChange={(e) =>
                      setNewInvoice({
                        ...newInvoice,
                        customerId: e.target.value,
                      })
                    }
                    className={inputClass}
                  >
                    <option value="">Walk-in Customer</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-gray-700">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newInvoice.dueDate}
                    onChange={(e) =>
                      setNewInvoice({ ...newInvoice, dueDate: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[13px] font-semibold text-gray-700">
                    Line Items
                  </label>
                  <button
                    onClick={addItem}
                    className="rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 transition-colors hover:bg-orange-100"
                  >
                    + Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {newInvoice.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex gap-2 items-center rounded-xl border border-gray-100 bg-gray-50/50 p-2.5"
                    >
                      <input
                        value={item.description}
                        onChange={(e) =>
                          updateItem(idx, "description", e.target.value)
                        }
                        placeholder="Description"
                        className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(
                            idx,
                            "quantity",
                            parseInt(e.target.value) || 1,
                          )
                        }
                        className="w-20 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-right"
                        min={1}
                      />
                      <input
                        type="number"
                        value={item.unitPrice || ""}
                        onChange={(e) =>
                          updateItem(
                            idx,
                            "unitPrice",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        placeholder="Price"
                        className="w-28 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-right"
                      />
                      <span className="w-24 text-right text-sm font-semibold text-gray-700">
                        {formatCurrency(
                          item.quantity * item.unitPrice,
                          currency,
                        )}
                      </span>
                      {newInvoice.items.length > 1 && (
                        <button
                          onClick={() => removeItem(idx)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-4 mb-5">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-700">
                    {formatCurrency(invoiceSubtotal, currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Tax</span>
                    <input
                      type="number"
                      value={
                        newInvoice.customTaxRate !== ""
                          ? newInvoice.customTaxRate
                          : tenant?.settings?.taxRate || 0
                      }
                      onChange={(e) =>
                        setNewInvoice({
                          ...newInvoice,
                          customTaxRate: e.target.value,
                        })
                      }
                      className="w-16 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-right"
                      min={0}
                      step={0.5}
                    />
                    <span className="text-gray-400 text-xs">%</span>
                  </div>
                  <span className="text-gray-700">
                    {formatCurrency(
                      invoiceSubtotal *
                        ((newInvoice.customTaxRate !== ""
                          ? parseFloat(newInvoice.customTaxRate)
                          : tenant?.settings?.taxRate || 0) /
                          100),
                      currency,
                    )}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
                  <span className="text-gray-900">Total</span>
                  <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                    {formatCurrency(
                      invoiceSubtotal *
                        (1 +
                          (newInvoice.customTaxRate !== ""
                            ? parseFloat(newInvoice.customTaxRate)
                            : tenant?.settings?.taxRate || 0) /
                            100),
                      currency,
                    )}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[13px] font-semibold text-gray-700">
                  Notes
                </label>
                <textarea
                  value={newInvoice.notes}
                  onChange={(e) =>
                    setNewInvoice({ ...newInvoice, notes: e.target.value })
                  }
                  rows={2}
                  className={inputClass}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createInvoice}
                disabled={
                  newInvoice.items.length === 0 ||
                  !newInvoice.items[0].description
                }
                className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg disabled:opacity-50 disabled:shadow-none"
              >
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
