import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Stock from "@/models/Stock";
import StockAdjustment from "@/models/StockAdjustment";
import Product from "@/models/Product";
import Branch from "@/models/Branch";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";

async function resolveDefaultBranch(
  tenantId: string,
  preferredBranchId?: string,
) {
  if (preferredBranchId) {
    const preferredBranch = await Branch.findOne({
      _id: preferredBranchId,
      tenantId,
    })
      .select("name")
      .lean();
    if (preferredBranch) return preferredBranch;
  }

  return Branch.findOne({ tenantId, isActive: true })
    .sort({ isMain: -1, createdAt: 1 })
    .select("name")
    .lean();
}

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

    const defaultBranch = await resolveDefaultBranch(
      auth.tenantId,
      branchId || auth.branchId,
    );

    if (defaultBranch) {
      const existingProductIds = new Set(
        stockItems
          .map((item) => item.productId?._id?.toString())
          .filter(Boolean),
      );

      const missingProducts = await Product.find({
        tenantId: auth.tenantId,
        trackStock: true,
        _id: {
          $nin: Array.from(existingProductIds),
        },
      })
        .select("name sku barcode price createdAt")
        .sort({ createdAt: -1 })
        .lean();

      const syntheticStockItems = missingProducts.map((product) => ({
        _id: `synthetic:${product._id.toString()}:${defaultBranch._id.toString()}`,
        tenantId: auth.tenantId,
        productId: {
          _id: product._id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          price: product.price,
        },
        branchId: {
          _id: defaultBranch._id,
          name: defaultBranch.name,
        },
        quantity: 0,
        reservedQuantity: 0,
        reorderLevel: 10,
      }));

      stockItems = [...stockItems, ...syntheticStockItems];

      if (lowStock) {
        stockItems = stockItems.filter(
          (item) => item.quantity <= item.reorderLevel,
        );
      }
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
