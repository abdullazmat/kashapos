import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/models/Customer";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const query: Record<string, unknown> = { tenantId: auth.tenantId };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [customers, total] = await Promise.all([
      Customer.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Customer.countDocuments(query),
    ]);

    return apiSuccess({
      customers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Customers GET error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const body = (await request.json()) as Record<string, unknown>;

    const customerPayload = {
      tenantId: auth.tenantId,
      name: String(body.name || "").trim(),
      email: String(body.email || "").trim(),
      phone: String(body.phone || "").trim(),
      address: String(body.address || "").trim(),
      taxId: body.taxId ? String(body.taxId).trim() : undefined,
      notes: String(body.notes || "").trim(),
      creditLimit: Math.max(0, Number(body.creditLimit) || 0),
      isActive: body.isActive !== false,
    };

    if (!customerPayload.name) {
      return apiError("Customer name is required", 400);
    }

    const customer = await Customer.create({
      ...customerPayload,
    });
    return apiSuccess(customer, 201);
  } catch (error) {
    console.error("Customers POST error:", error);
    return apiError("Internal server error", 500);
  }
}
