import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/models/Customer";
import Sale from "@/models/Sale";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";
import { sendTenantEmail } from "@/lib/mailer";
import { prepareBalanceReminderEmail } from "@/lib/manual-email-rules";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const { id } = await params;

    const customer = await Customer.findOne({
      _id: id,
      tenantId: auth.tenantId,
    }).lean();

    if (!customer) {
      return apiError("Customer not found", 404);
    }

    const openSales = await Sale.find({
      tenantId: auth.tenantId,
      customerId: customer._id,
      status: { $nin: ["refunded", "voided"] },
      remainingBalance: { $gt: 0 },
    })
      .sort({ dueDate: 1, createdAt: 1 })
      .select("orderNumber dueDate remainingBalance")
      .lean();

    const prepared = prepareBalanceReminderEmail({
      tenantId: auth.tenantId,
      customerName: customer.name,
      customerEmail: customer.email,
      outstandingBalance: Number(customer.outstandingBalance || 0),
      openSales: openSales.map((sale) => ({
        orderNumber: sale.orderNumber,
        dueDate: sale.dueDate,
        remainingBalance: Number(sale.remainingBalance || 0),
      })),
    });

    if (!prepared.ok) {
      return apiError(prepared.error, prepared.status);
    }

    await sendTenantEmail(prepared.email);

    return apiSuccess({
      ok: true,
      message: "Balance reminder email sent",
      customer: {
        _id: String(customer._id),
      },
    });
  } catch (error) {
    console.error("Manual balance reminder send error:", error);
    return apiError("Failed to send balance reminder", 500);
  }
}
