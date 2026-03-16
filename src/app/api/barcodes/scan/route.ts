import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import ActivityLog from "@/models/ActivityLog";
import Product from "@/models/Product";
import Branch from "@/models/Branch";
import { apiError, apiSuccess, getAuthContext } from "@/lib/api-helpers";

const SUPPORTED_MODULES = new Set([
  "sales",
  "stock",
  "purchases",
  "items",
  "customers",
  "vendors",
  "expenses",
  "invoices",
  "settings",
]);

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const body = (await request.json()) as {
      value?: string;
      context?: string;
      source?: string;
      module?: string;
      scanAction?: string;
      result?: "found" | "not_found";
      productId?: string;
      productName?: string;
      productSku?: string;
      locationId?: string;
      locationName?: string;
    };

    const value = String(body.value || "").trim();
    const context = String(body.context || "pos")
      .trim()
      .toLowerCase();
    const source = String(body.source || "manual")
      .trim()
      .toLowerCase();
    const moduleName = SUPPORTED_MODULES.has(String(body.module || "").trim())
      ? String(body.module || "").trim()
      : context === "pos"
        ? "sales"
        : context === "receiving"
          ? "purchases"
          : "stock";

    if (!value) {
      return apiError("Barcode value is required", 400);
    }

    const matchedProduct = body.productId
      ? await Product.findOne({
          _id: body.productId,
          tenantId: auth.tenantId,
        })
          .select("_id name sku barcode")
          .lean()
      : await Product.findOne({
          tenantId: auth.tenantId,
          barcode: value,
        })
          .select("_id name sku barcode")
          .lean();

    const branch = body.locationId
      ? await Branch.findOne({ _id: body.locationId, tenantId: auth.tenantId })
          .select("_id name code")
          .lean()
      : auth.branchId
        ? await Branch.findOne({ _id: auth.branchId, tenantId: auth.tenantId })
            .select("_id name code")
            .lean()
        : null;

    const result = body.result || (matchedProduct ? "found" : "not_found");
    const scanAction = String(
      body.scanAction || (matchedProduct ? "product_lookup" : "not_found"),
    )
      .trim()
      .toLowerCase();

    const productName = String(
      body.productName ||
        matchedProduct?.name ||
        (result === "not_found" ? "Not Found" : ""),
    ).trim();
    const productSku = String(
      body.productSku || matchedProduct?.sku || "",
    ).trim();
    const locationName = String(body.locationName || branch?.name || "").trim();

    const log = await ActivityLog.create({
      tenantId: auth.tenantId,
      userId: auth.userId,
      userName: auth.name || "Unknown",
      action: "view",
      module: moduleName,
      description:
        result === "found"
          ? `Scanned barcode ${value} matched ${productName || "a product"} in ${context}`
          : `Scanned barcode ${value} was not found in ${context}`,
      metadata: {
        eventType: "barcode_scan",
        value,
        context,
        source,
        scanAction,
        result,
        productId: String(body.productId || matchedProduct?._id || ""),
        productName,
        productSku,
        locationId: String(
          body.locationId || branch?._id || auth.branchId || "",
        ),
        locationName,
        locationCode: String(branch?.code || ""),
      },
    });

    return apiSuccess(
      {
        id: String(log._id),
        value,
        context,
        result,
        productName,
        scanAction,
        locationName,
        createdAt: log.createdAt,
      },
      201,
    );
  } catch (error) {
    console.error("Barcodes scan POST error:", error);
    return apiError("Internal server error", 500);
  }
}
