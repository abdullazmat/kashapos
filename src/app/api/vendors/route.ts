import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Vendor from "@/models/Vendor";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const vendors = await Vendor.find({ tenantId: auth.tenantId })
      .sort({ name: 1 })
      .lean();
    return apiSuccess(vendors);
  } catch (error) {
    console.error("Vendors GET error:", error);
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
    const vendor = await Vendor.create({ ...body, tenantId: auth.tenantId });
    return apiSuccess(vendor, 201);
  } catch (error) {
    console.error("Vendors POST error:", error);
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
    if (!_id) return apiError("Vendor ID is required", 400);
    const vendor = await Vendor.findOneAndUpdate(
      { _id, tenantId: auth.tenantId },
      updateData,
      { new: true },
    );
    if (!vendor) return apiError("Vendor not found", 404);
    return apiSuccess(vendor);
  } catch (error) {
    console.error("Vendors PUT error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    if (auth.role === "cashier")
      return apiError("Insufficient permissions", 403);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return apiError("Vendor ID is required", 400);
    await Vendor.findOneAndDelete({ _id: id, tenantId: auth.tenantId });
    return apiSuccess({ message: "Vendor deleted" });
  } catch (error) {
    console.error("Vendors DELETE error:", error);
    return apiError("Internal server error", 500);
  }
}
