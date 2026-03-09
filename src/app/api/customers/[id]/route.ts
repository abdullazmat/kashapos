import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/models/Customer";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";

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
    const body = await request.json();
    const customer = await Customer.findOneAndUpdate(
      { _id: id, tenantId: auth.tenantId },
      { $set: body },
      { new: true },
    );
    if (!customer) return apiError("Customer not found", 404);
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
