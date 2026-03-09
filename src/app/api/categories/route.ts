import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Category from "@/models/Category";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const categories = await Category.find({ tenantId: auth.tenantId })
      .sort({ name: 1 })
      .lean();
    return apiSuccess(categories);
  } catch (error) {
    console.error("Categories GET error:", error);
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
    const category = await Category.create({
      ...body,
      tenantId: auth.tenantId,
    });
    return apiSuccess(category, 201);
  } catch (error: unknown) {
    console.error("Categories POST error:", error);
    if ((error as { code?: number }).code === 11000) {
      return apiError("Category with this name already exists", 409);
    }
    return apiError("Internal server error", 500);
  }
}
