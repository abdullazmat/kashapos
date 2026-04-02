import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/models/Customer";
import Tenant from "@/models/Tenant";
import Sale from "@/models/Sale";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";
import { sendTenantEmail } from "@/lib/mailer";
import { prepareBalanceReminderEmail } from "@/lib/manual-email-rules";
import { checkOutboundMessageGuard } from "@/lib/outbound-message-guard";
import { twilioService } from "@/lib/twilio";

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

    const tenant = await Tenant.findById(auth.tenantId)
      .select(
        "settings.outboundMessageGuardEnabled settings.outboundMessageLimit settings.outboundMessageWindowMinutes",
      )
      .lean();

    const guard = checkOutboundMessageGuard({
      tenantId: auth.tenantId,
      channel: "balance-reminder",
      recipient: customer.phone || customer.email || id,
      settings: tenant?.settings,
    });

    if (!guard.allowed) {
      return apiError(
        `Message sending is temporarily limited. Try again in ${guard.retryAfterSeconds}s`,
        429,
      );
    }

    await sendTenantEmail(prepared.email);

    // Send SMS if phone exists
    let smsSent = false;
    if (customer.phone) {
      try {
        const message = `Hello ${customer.name}, you have an outstanding balance of UGX ${Number(customer.outstandingBalance || 0).toLocaleString()}. Please settle your bills. Thank you.`;
        await twilioService.sendSMS(customer.phone, message);
        smsSent = true;
      } catch (smsError) {
        console.error("Failed to send balance reminder SMS:", smsError);
      }
    }

    return apiSuccess({
      ok: true,
      message: smsSent
        ? "Balance reminder email and SMS sent"
        : "Balance reminder email sent",
      customer: {
        _id: String(customer._id),
      },
      smsSent,
    });
  } catch (error) {
    console.error("Manual balance reminder send error:", error);
    return apiError("Failed to send balance reminder", 500);
  }
}
