import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import { apiError, apiSuccess, getAuthContext } from "@/lib/api-helpers";
import Batch from "@/models/Batch";
import Branch from "@/models/Branch";
import Product from "@/models/Product";
import Stock from "@/models/Stock";

interface BatchPayloadItem {
  productId?: string;
  productName?: string;
  quantity?: number | string;
  remainingQty?: number | string;
  costPrice?: number | string;
  sellingPrice?: number | string;
  expiryDate?: string;
}

function deriveBatchStatus(
  items: Array<{ remainingQty: number; expiryDate?: string | Date }>,
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (items.every((item) => item.remainingQty <= 0)) {
    return "depleted" as const;
  }

  const hasExpiredStock = items.some((item) => {
    if (!item.expiryDate || item.remainingQty <= 0) return false;
    const expiryDate = new Date(item.expiryDate);
    expiryDate.setHours(0, 0, 0, 0);
    return expiryDate < today;
  });

  if (hasExpiredStock) {
    return "expired" as const;
  }

  return "active" as const;
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      200,
    );

    const batches = await Batch.find({ tenantId: auth.tenantId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const normalizedBatches = await Promise.all(
      batches.map(async (batch) => {
        const status = deriveBatchStatus(batch.items || []);
        if (status !== batch.status) {
          await Batch.updateOne({ _id: batch._id }, { $set: { status } });
        }
        return {
          ...batch,
          status,
        };
      }),
    );

    return apiSuccess({ batches: normalizedBatches });
  } catch (error) {
    console.error("Batches GET error:", error);
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
    const batchNumber = String(body.batchNumber || "").trim();
    const receivedDate = body.receivedDate;
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    const rawItems: BatchPayloadItem[] = Array.isArray(body.items)
      ? body.items
      : [];

    if (!batchNumber) {
      return apiError("Batch number is required");
    }
    if (!receivedDate) {
      return apiError("Received date is required");
    }
    if (rawItems.length === 0) {
      return apiError("Add at least one batch item");
    }

    const productIds = rawItems
      .map((item: BatchPayloadItem) => item.productId)
      .filter((productId: string | undefined): productId is string =>
        Boolean(productId),
      );

    const products = await Product.find({
      tenantId: auth.tenantId,
      _id: { $in: productIds },
    })
      .select("_id name")
      .lean();

    const productMap = new Map(
      products.map((product) => [String(product._id), product]),
    );

    const items = rawItems.map((item: BatchPayloadItem) => {
      const productId = String(item.productId || "");
      const product = productMap.get(productId);
      const quantity = Math.max(0, Number(item.quantity) || 0);
      const remainingQty = Math.max(0, Number(item.remainingQty) || quantity);
      const costPrice = Math.max(0, Number(item.costPrice) || 0);
      const sellingPrice = Math.max(0, Number(item.sellingPrice) || 0);

      if (!product) {
        throw new Error("One or more selected products no longer exist");
      }
      if (!quantity) {
        throw new Error(
          "Each batch item must have a quantity greater than zero",
        );
      }

      return {
        productId,
        productName: String(item.productName || product.name),
        quantity,
        remainingQty,
        costPrice,
        sellingPrice,
        expiryDate: item.expiryDate || undefined,
      };
    });

    const status = deriveBatchStatus(items);
    const batch = await Batch.create({
      tenantId: auth.tenantId,
      batchNumber,
      purchaseOrderId: body.purchaseOrderId || undefined,
      items,
      receivedDate,
      notes,
      status,
    });

    const activeBranchId = auth.branchId
      ? auth.branchId
      : (
          await Branch.findOne({ tenantId: auth.tenantId, isMain: true })
            .select("_id")
            .lean()
        )?._id;

    if (activeBranchId) {
      await Promise.all(
        items.map((item: (typeof items)[number]) =>
          Stock.findOneAndUpdate(
            {
              tenantId: auth.tenantId,
              productId: item.productId,
              branchId: activeBranchId,
            },
            {
              $inc: { quantity: item.quantity },
              $setOnInsert: { reservedQuantity: 0, reorderLevel: 10 },
            },
            { upsert: true, new: true },
          ),
        ),
      );
    }

    return apiSuccess({ batch }, 201);
  } catch (error: unknown) {
    console.error("Batches POST error:", error);
    if ((error as { code?: number }).code === 11000) {
      return apiError("A batch with this number already exists", 409);
    }
    return apiError(
      error instanceof Error ? error.message : "Internal server error",
      error instanceof Error ? 400 : 500,
    );
  }
}
