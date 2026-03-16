import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/models/Customer";
import CustomerPayment from "@/models/CustomerPayment";
import { getAuthContext, apiError, apiSuccess } from "@/lib/api-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const customer = await Customer.findOne({
      _id: id,
      tenantId: auth.tenantId,
    })
      .select("_id")
      .lean();

    if (!customer) {
      return apiError("Customer not found", 404);
    }

    const query = { tenantId: auth.tenantId, customerId: id };

    const [payments, total] = await Promise.all([
      CustomerPayment.find(query)
        .populate("saleId", "orderNumber total amountPaid")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CustomerPayment.countDocuments(query),
    ]);

    return apiSuccess({
      payments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Customer payment history GET error:", error);
    return apiError("Internal server error", 500);
  }
}
