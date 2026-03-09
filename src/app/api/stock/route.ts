import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Stock from "@/models/Stock";
import StockAdjustment from "@/models/StockAdjustment";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId") || auth.branchId;
    const lowStock = searchParams.get("lowStock") === "true";

    const query: Record<string, unknown> = { tenantId: auth.tenantId };
    if (branchId) query.branchId = branchId;

    let stockItems;
    if (lowStock) {
      stockItems = await Stock.find(query)
        .populate("productId", "name sku barcode price")
        .populate("branchId", "name")
        .lean();
      stockItems = stockItems.filter((s) => s.quantity <= s.reorderLevel);
    } else {
      stockItems = await Stock.find(query)
        .populate("productId", "name sku barcode price")
        .populate("branchId", "name")
        .lean();
    }

    return apiSuccess(stockItems);
  } catch (error) {
    console.error("Stock GET error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    if (auth.role === "cashier")
      return apiError("Insufficient permissions", 403);

    const { productId, branchId, type, quantity, reason } =
      await request.json();

    const adjustment = type === "addition" ? quantity : -quantity;

    await Stock.findOneAndUpdate(
      { tenantId: auth.tenantId, productId, branchId },
      { $inc: { quantity: adjustment } },
      { upsert: true, new: true },
    );

    await StockAdjustment.create({
      tenantId: auth.tenantId,
      productId,
      branchId,
      type,
      quantity,
      reason,
      performedBy: auth.userId,
    });

    return apiSuccess({ message: "Stock adjusted successfully" }, 201);
  } catch (error) {
    console.error("Stock POST error:", error);
    return apiError("Internal server error", 500);
  }
}
