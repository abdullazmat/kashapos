import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Invoice from "@/models/Invoice";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";
import { generateInvoiceNumber } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status") || "";

    const query: Record<string, unknown> = { tenantId: auth.tenantId };
    if (status) query.status = status;

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .populate("customerId", "name phone email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(query),
    ]);

    return apiSuccess({
      invoices,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Invoices GET error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    if (auth.role === "cashier")
      return apiError("Insufficient permissions", 403);

    const body = await request.json();
    const invoiceNumber = generateInvoiceNumber();

    const invoice = await Invoice.create({
      ...body,
      tenantId: auth.tenantId,
      invoiceNumber,
      createdBy: auth.userId,
    });

    return apiSuccess(invoice, 201);
  } catch (error) {
    console.error("Invoices POST error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    if (auth.role === "cashier")
      return apiError("Insufficient permissions", 403);

    const body = await request.json();
    const { _id, ...updateData } = body;
    if (!_id) return apiError("Invoice ID is required", 400);

    // Recalculate balance if amountPaid changed
    if (updateData.amountPaid !== undefined) {
      const existing = await Invoice.findOne({
        _id,
        tenantId: auth.tenantId,
      });
      if (!existing) return apiError("Invoice not found", 404);
      updateData.balance = existing.total - updateData.amountPaid;
      if (updateData.balance <= 0) {
        updateData.balance = 0;
        updateData.status = "paid";
      }
    }

    const invoice = await Invoice.findOneAndUpdate(
      { _id, tenantId: auth.tenantId },
      updateData,
      { new: true },
    ).populate("customerId", "name phone email");

    if (!invoice) return apiError("Invoice not found", 404);
    return apiSuccess(invoice);
  } catch (error) {
    console.error("Invoices PUT error:", error);
    return apiError("Internal server error", 500);
  }
}
