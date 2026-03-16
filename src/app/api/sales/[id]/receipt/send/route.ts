import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Sale from "@/models/Sale";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";
import { sendTenantEmail } from "@/lib/mailer";
import { prepareReceiptEmail } from "@/lib/manual-email-rules";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const { id } = await params;

    const sale = await Sale.findOne({
      _id: id,
      tenantId: auth.tenantId,
    })
      .populate("customerId", "name email")
      .lean();

    if (!sale) {
      return apiError("Sale not found", 404);
    }

    const customer = sale.customerId as {
      name?: string;
      email?: string;
    } | null;
    const prepared = prepareReceiptEmail({
      tenantId: auth.tenantId,
      customerName: customer?.name,
      customerEmail: customer?.email,
      orderNumber: sale.orderNumber,
      total: Number(sale.total || 0),
      amountPaid: Number(sale.amountPaid || 0),
      remainingBalance: Number(sale.remainingBalance || 0),
    });

    if (!prepared.ok) {
      return apiError(prepared.error, prepared.status);
    }

    await sendTenantEmail(prepared.email);

    await Sale.findByIdAndUpdate(sale._id, {
      $set: { receiptSent: true },
    });

    return apiSuccess({
      ok: true,
      message: "Receipt email sent",
      sale: {
        _id: String(sale._id),
        receiptSent: true,
      },
    });
  } catch (error) {
    console.error("Manual receipt send error:", error);
    return apiError("Failed to send receipt email", 500);
  }
}
