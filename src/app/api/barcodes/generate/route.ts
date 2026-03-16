import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/models/Product";
import Tenant from "@/models/Tenant";
import ActivityLog from "@/models/ActivityLog";
import {
  ensureBarcodeValue,
  normalizeBarcodeFormat,
  type BarcodeFormat,
} from "@/lib/barcode";
import { apiError, apiSuccess, getAuthContext } from "@/lib/api-helpers";
import { getDefaultPermissionsForRole } from "@/lib/roles";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);

    const tenant = await Tenant.findById(auth.tenantId)
      .select("settings.rolePermissions")
      .lean();
    const rolePermissions =
      (tenant?.settings as { rolePermissions?: Record<string, string[]> })
        ?.rolePermissions?.[auth.role] ||
      getDefaultPermissionsForRole(auth.role);

    if (auth.role !== "admin" && !rolePermissions.includes("inventory")) {
      return apiError("Insufficient permissions", 403);
    }

    const body = (await request.json()) as {
      productIds?: string[];
      format?: string;
      useSkuAsSeed?: boolean;
      labelOptions?: {
        copies?: number;
        showName?: boolean;
        showPrice?: boolean;
        showSku?: boolean;
      };
    };

    const productIds = Array.isArray(body.productIds)
      ? body.productIds.map((id) => String(id).trim()).filter(Boolean)
      : [];

    if (productIds.length === 0) {
      return apiError("No products selected", 400);
    }

    const format = normalizeBarcodeFormat(body.format) as BarcodeFormat;
    const useSkuAsSeed = body.useSkuAsSeed !== false;

    const products = await Product.find({
      _id: { $in: productIds },
      tenantId: auth.tenantId,
    })
      .select("_id name sku price barcode")
      .lean();

    const updates: Array<{
      productId: string;
      barcode: string;
      format: BarcodeFormat;
    }> = [];

    for (const product of products) {
      const seed = useSkuAsSeed
        ? String(product.sku || "")
        : `${String(product.sku || "")}-${String(product._id).slice(-6)}`;

      const nextBarcode = ensureBarcodeValue(format, "", seed);
      updates.push({
        productId: String(product._id),
        barcode: nextBarcode,
        format,
      });
    }

    if (updates.length === 0) {
      return apiError("No products were eligible for barcode generation", 400);
    }

    await Product.bulkWrite(
      updates.map((row) => ({
        updateOne: {
          filter: { _id: row.productId, tenantId: auth.tenantId },
          update: {
            $set: {
              barcode: row.barcode,
              barcodeFormat: row.format,
            },
          },
        },
      })),
    );

    await ActivityLog.create({
      tenantId: auth.tenantId,
      userId: auth.userId,
      userName: auth.name || "Unknown",
      action: "create",
      module: "stock",
      description: `Generated ${updates.length} product barcodes`,
      metadata: {
        eventType: "barcode_bulk_generate",
        format,
        labelOptions: body.labelOptions || {},
        generatedCount: updates.length,
      },
    });

    const productMap = new Map(
      products.map((item) => [String(item._id), item]),
    );
    const generated = updates.map((row) => {
      const product = productMap.get(row.productId);
      return {
        productId: row.productId,
        productName: String(product?.name || ""),
        sku: String(product?.sku || ""),
        price: Number(product?.price || 0),
        barcode: row.barcode,
        format: row.format,
      };
    });

    return apiSuccess({ generatedCount: generated.length, generated });
  } catch (error) {
    console.error("Barcodes generate POST error:", error);
    return apiError("Internal server error", 500);
  }
}
