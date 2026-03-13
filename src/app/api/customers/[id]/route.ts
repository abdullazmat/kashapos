import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/models/Customer";
import CustomerPayment from "@/models/CustomerPayment";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";
import { normalizeMoney } from "@/lib/customer-balance";

export async function GET(
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
    if (!customer) return apiError("Customer not found", 404);
    return apiSuccess(customer);
  } catch (error) {
    console.error("Customer GET error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const customer = await Customer.findOne({
      _id: id,
      tenantId: auth.tenantId,
    });
    if (!customer) return apiError("Customer not found", 404);

    const allowedUpdates: Record<string, unknown> = {};
    if (body.name !== undefined)
      allowedUpdates.name = String(body.name || "").trim();
    if (body.email !== undefined)
      allowedUpdates.email = String(body.email || "").trim();
    if (body.phone !== undefined)
      allowedUpdates.phone = String(body.phone || "").trim();
    if (body.address !== undefined)
      allowedUpdates.address = String(body.address || "").trim();
    if (body.taxId !== undefined)
      allowedUpdates.taxId = body.taxId ? String(body.taxId).trim() : undefined;
    if (body.notes !== undefined)
      allowedUpdates.notes = String(body.notes || "").trim();
    if (body.isActive !== undefined)
      allowedUpdates.isActive = Boolean(body.isActive);
    if (body.creditLimit !== undefined)
      allowedUpdates.creditLimit = Math.max(0, Number(body.creditLimit) || 0);

    Object.assign(customer, allowedUpdates);

    const payment =
      body.payment && typeof body.payment === "object"
        ? (body.payment as Record<string, unknown>)
        : undefined;

    if (payment) {
      const amount = normalizeMoney(payment.amount);
      if (amount <= 0) {
        return apiError("Payment amount must be greater than zero", 400);
      }

      const balanceBefore = normalizeMoney(customer.outstandingBalance);
      const balanceAfter = Math.max(0, balanceBefore - amount);

      customer.outstandingBalance = balanceAfter;
      customer.paymentStatus = balanceAfter > 0 ? "partial" : "cleared";
      customer.lastPaymentDate = new Date();

      await customer.save();

      await CustomerPayment.create({
        tenantId: auth.tenantId,
        customerId: customer._id,
        amount,
        method:
          payment.method === "card" ||
          payment.method === "mobile_money" ||
          payment.method === "bank_transfer"
            ? payment.method
            : "cash",
        reference: payment.reference ? String(payment.reference) : "",
        notes: payment.notes ? String(payment.notes) : "",
        balanceBefore,
        balanceAfter,
        recordedBy: auth.userId || undefined,
        recordedByName: auth.name || "",
      });

      return apiSuccess(customer);
    }

    await customer.save();
    return apiSuccess(customer);
  } catch (error) {
    console.error("Customer PUT error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    if (auth.role !== "admin") return apiError("Insufficient permissions", 403);
    const { id } = await params;
    await Customer.findOneAndDelete({ _id: id, tenantId: auth.tenantId });
    return apiSuccess({ message: "Customer deleted" });
  } catch (error) {
    console.error("Customer DELETE error:", error);
    return apiError("Internal server error", 500);
  }
}
