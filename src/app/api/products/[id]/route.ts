import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/models/Product";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const { id } = await params;
    const product = await Product.findOne({ _id: id, tenantId: auth.tenantId })
      .populate("categoryId", "name")
      .lean();
    if (!product) return apiError("Product not found", 404);
    return apiSuccess(product);
  } catch (error) {
    console.error("Product GET error:", error);
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
    if (auth.role === "cashier")
      return apiError("Insufficient permissions", 403);
    const { id } = await params;
    const body = await request.json();
    const product = await Product.findOneAndUpdate(
      { _id: id, tenantId: auth.tenantId },
      { $set: body },
      { new: true },
    );
    if (!product) return apiError("Product not found", 404);
    return apiSuccess(product);
  } catch (error) {
    console.error("Product PUT error:", error);
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
    const product = await Product.findOneAndDelete({
      _id: id,
      tenantId: auth.tenantId,
    });
    if (!product) return apiError("Product not found", 404);
    return apiSuccess({ message: "Product deleted" });
  } catch (error) {
    console.error("Product DELETE error:", error);
    return apiError("Internal server error", 500);
  }
}
