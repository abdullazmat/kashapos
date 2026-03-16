import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Invoice from "@/models/Invoice";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";
import { sendTenantEmail } from "@/lib/mailer";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const { id } = await params;

    const invoice = await Invoice.findOne({ _id: id, tenantId: auth.tenantId })
      .populate("customerId", "name email")
      .exec();

    if (!invoice) {
      return apiError("Invoice not found", 404);
    }

    const customer = invoice.customerId as
      | { name?: string; email?: string }
      | undefined;
    const recipient = customer?.email?.trim();

    if (!recipient) {
      return apiError("Customer email is required to send invoice", 400);
    }

    await sendTenantEmail({
      tenantId: auth.tenantId,
      to: recipient,
      subject: `Invoice ${invoice.invoiceNumber}`,
      text: `Dear ${customer?.name || "Customer"},\n\nInvoice ${invoice.invoiceNumber} total: ${invoice.total}. Amount paid: ${invoice.amountPaid || 0}. Balance: ${invoice.balance || 0}.\n\nThank you for your business.`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.5"><h2>Invoice ${invoice.invoiceNumber}</h2><p>Dear ${customer?.name || "Customer"},</p><p>Total: <strong>${invoice.total.toLocaleString()}</strong></p><p>Amount paid: ${Number(invoice.amountPaid || 0).toLocaleString()}</p><p>Balance: ${Number(invoice.balance || 0).toLocaleString()}</p><p>Thank you for your business.</p></div>`,
    });

    if (invoice.status === "draft") {
      invoice.status = "sent";
      await invoice.save();
    }

    return apiSuccess({
      ok: true,
      message: "Invoice email sent",
      invoice: {
        _id: String(invoice._id),
        status: invoice.status,
      },
    });
  } catch (error) {
    console.error("Invoice send email error:", error);
    return apiError("Failed to send invoice email", 500);
  }
}
