import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/models/Product";
import Stock from "@/models/Stock";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const active = searchParams.get("active");

    const query: Record<string, unknown> = { tenantId: auth.tenantId };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
      ];
    }
    if (category) query.categoryId = category;
    if (active !== null && active !== undefined)
      query.isActive = active === "true";

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate("categoryId", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    // Attach stock quantities to products
    const productIds = products.map((p) => p._id);
    const stockMatch: Record<string, unknown> = {
      tenantId: auth.tenantId,
      productId: { $in: productIds },
    };

    if (auth.branchId) {
      stockMatch.branchId = auth.branchId;
    }

    const stockEntries = await Stock.aggregate([
      {
        $match: stockMatch,
      },
      {
        $group: {
          _id: "$productId",
          totalQuantity: {
            $sum: { $subtract: ["$quantity", "$reservedQuantity"] },
          },
        },
      },
    ]);
    const stockMap = new Map(
      stockEntries.map((s: { _id: string; totalQuantity: number }) => [
        s._id.toString(),
        s.totalQuantity,
      ]),
    );
    const productsWithStock = products.map((p) => {
      const stockFromRows = stockMap.get(p._id.toString()) ?? 0;
      const variantStock = Array.isArray(p.variants)
        ? p.variants.reduce(
            (sum, variant) => sum + (Number(variant.stock) || 0),
            0,
          )
        : 0;

      return {
        ...p,
        stock: p.hasVariants ? variantStock : stockFromRows,
      };
    });

    return apiSuccess({
      products: productsWithStock,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Products GET error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    if (auth.role === "cashier") {
      return apiError("Insufficient permissions", 403);
    }

    const body = await request.json();
    const product = await Product.create({
      ...body,
      tenantId: auth.tenantId,
    });

    return apiSuccess(product, 201);
  } catch (error: unknown) {
    console.error("Products POST error:", error);
    if ((error as { code?: number }).code === 11000) {
      return apiError("Product with this SKU already exists", 409);
    }
    return apiError("Internal server error", 500);
  }
}
