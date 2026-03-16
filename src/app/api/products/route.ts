import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/models/Product";
import Stock from "@/models/Stock";
import Branch from "@/models/Branch";
import Tenant from "@/models/Tenant";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";
import {
  buildBarcodeSeed,
  ensureBarcodeValue,
  normalizeBarcodeFormat,
} from "@/lib/barcode";

interface TenantBarcodeSettings {
  barcodeAutoGenerateOnProductCreate?: boolean;
  barcodeDefaultFormat?: string;
  barcodePrefix?: string;
}

async function resolveInitialBranch(
  tenantId: string,
  preferredBranchId?: string,
) {
  if (preferredBranchId) {
    const preferredBranch = await Branch.findOne({
      _id: preferredBranchId,
      tenantId,
    })
      .select("_id")
      .lean();
    if (preferredBranch) return preferredBranch;
  }

  return Branch.findOne({ tenantId, isActive: true })
    .sort({ isMain: -1, createdAt: 1 })
    .select("_id")
    .lean();
}

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

    const stockRows = await Stock.find(stockMatch)
      .select("productId quantity reservedQuantity")
      .lean();

    const stockMap = new Map<string, number>();
    for (const row of stockRows) {
      const key = row.productId?.toString();
      if (!key) continue;

      const available =
        (Number(row.quantity) || 0) - (Number(row.reservedQuantity) || 0);
      stockMap.set(key, (stockMap.get(key) || 0) + available);
    }
    const productsWithStock = products.map((p) => {
      const productId = p._id.toString();
      const hasStockRow = stockMap.has(productId);
      const stockFromRows = stockMap.get(productId) ?? 0;
      const hasVariantRows = Array.isArray(p.variants) && p.variants.length > 0;
      const variantStock = hasVariantRows
        ? p.variants.reduce(
            (sum, variant) => sum + (Number(variant.stock) || 0),
            0,
          )
        : 0;

      return {
        ...p,
        stock: hasStockRow ? stockFromRows : variantStock,
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
    const tenant = await Tenant.findById(auth.tenantId)
      .select(
        "settings.barcodeAutoGenerateOnProductCreate settings.barcodeDefaultFormat settings.barcodePrefix",
      )
      .lean();

    const tenantSettings =
      (tenant?.settings as TenantBarcodeSettings | undefined) || {};
    const shouldAutoGenerateBarcode =
      typeof tenantSettings.barcodeAutoGenerateOnProductCreate === "boolean"
        ? tenantSettings.barcodeAutoGenerateOnProductCreate
        : true;

    const nextFormat = normalizeBarcodeFormat(
      String(
        body.barcodeFormat || tenantSettings.barcodeDefaultFormat || "Code 128",
      ),
    );
    const payload = {
      ...body,
      tenantId: auth.tenantId,
      barcodeFormat: nextFormat,
    } as Record<string, unknown>;

    if (!String(body.barcode || "").trim() && shouldAutoGenerateBarcode) {
      payload.barcode = ensureBarcodeValue(
        nextFormat,
        "",
        buildBarcodeSeed(
          String(tenantSettings.barcodePrefix || ""),
          String(body.sku || ""),
        ),
      );
    }

    const product = await Product.create({
      ...payload,
    });

    if (product.trackStock !== false) {
      const branch = await resolveInitialBranch(auth.tenantId, auth.branchId);
      if (branch) {
        await Stock.findOneAndUpdate(
          {
            tenantId: auth.tenantId,
            productId: product._id,
            branchId: branch._id,
          },
          {
            $setOnInsert: {
              tenantId: auth.tenantId,
              productId: product._id,
              branchId: branch._id,
              quantity: 0,
              reservedQuantity: 0,
              reorderLevel: 10,
            },
          },
          { upsert: true, new: true },
        );
      }
    }

    return apiSuccess(product, 201);
  } catch (error: unknown) {
    console.error("Products POST error:", error);
    if ((error as { code?: number }).code === 11000) {
      return apiError("Product with this SKU already exists", 409);
    }
    return apiError("Internal server error", 500);
  }
}
