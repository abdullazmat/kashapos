import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import PurchaseOrder from "@/models/PurchaseOrder";
import Stock from "@/models/Stock";
import Product from "@/models/Product";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";

type RawPurchaseItem = {
  productId?: string;
  product?: string;
  productName?: string;
  quantity?: number;
  unitCost?: number;
  receivedQuantity?: number;
  total?: number;
};

type NormalizedPurchasePayload = {
  vendorId: string;
  branchId: string;
  items: {
    productId?: string;
    productName: string;
    quantity: number;
    unitCost: number;
    receivedQuantity: number;
    total: number;
  }[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  status: "draft" | "ordered" | "partial" | "received" | "cancelled";
  paymentStatus: "unpaid" | "partial" | "paid";
  amountPaid: number;
  expectedDelivery?: Date;
  notes: string;
};

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getReceivedQuantities(
  status: string,
  items: Array<{
    productId?: string;
    quantity: number;
    receivedQuantity: number;
  }>,
) {
  const quantities = new Map<string, number>();
  if (status !== "received") return quantities;

  for (const item of items) {
    if (!item.productId) continue;
    const quantity =
      item.receivedQuantity > 0 ? item.receivedQuantity : item.quantity;
    quantities.set(
      item.productId,
      (quantities.get(item.productId) || 0) + quantity,
    );
  }

  return quantities;
}

async function applyStockDeltas(
  tenantId: string,
  branchId: string,
  deltas: Map<string, number>,
) {
  for (const [productId, delta] of deltas.entries()) {
    if (delta === 0) continue;

    await Stock.findOneAndUpdate(
      { tenantId, branchId, productId },
      {
        $inc: { quantity: delta },
        $setOnInsert: { reorderLevel: 10, reservedQuantity: 0 },
      },
      { upsert: true, new: true },
    );
  }
}

async function normalizePurchasePayload(
  tenantId: string,
  branchId: string | undefined,
  body: Record<string, unknown>,
): Promise<NormalizedPurchasePayload> {
  const vendorId = String(body.vendorId || "").trim();
  if (!vendorId) throw new Error("Vendor is required");

  const resolvedBranchId = String(branchId || body.branchId || "").trim();
  if (!resolvedBranchId) throw new Error("Branch is required");

  const rawItems = Array.isArray(body.items)
    ? (body.items as RawPurchaseItem[])
    : [];
  if (rawItems.length === 0)
    throw new Error("At least one purchase item is required");

  const productIds = rawItems
    .map((item) => String(item.productId || item.product || "").trim())
    .filter(Boolean);

  const uniqueProductIds = Array.from(new Set(productIds));
  const products = uniqueProductIds.length
    ? await Product.find({
        tenantId,
        _id: { $in: uniqueProductIds },
      }).lean()
    : [];
  if (products.length !== uniqueProductIds.length) {
    throw new Error("One or more selected products no longer exist");
  }

  const productMap = new Map(
    products.map((product) => [String(product._id), product]),
  );

  let subtotal = 0;
  const items = rawItems.map((item) => {
    const productId = String(item.productId || item.product || "").trim();
    const product = productId ? productMap.get(productId) : null;
    if (productId && !product) {
      throw new Error("One or more selected products no longer exist");
    }

    const resolvedProductName = item.productName?.trim() || product?.name || "";
    if (!resolvedProductName) {
      throw new Error(
        "Each purchase item must include a product or description",
      );
    }

    const quantity = Math.max(1, Math.floor(asNumber(item.quantity, 1)));
    const unitCost = Math.max(0, asNumber(item.unitCost, product?.costPrice));
    const receivedQuantity = Math.max(
      0,
      Math.floor(asNumber(item.receivedQuantity, 0)),
    );
    const total = Math.max(0, asNumber(item.total, quantity * unitCost));
    subtotal += total;

    return {
      productId: productId || undefined,
      productName: resolvedProductName,
      quantity,
      unitCost,
      receivedQuantity,
      total,
    };
  });

  const tax = Math.max(0, asNumber(body.tax, 0));
  const shippingCost = Math.max(0, asNumber(body.shippingCost, 0));
  const total = subtotal + tax + shippingCost;
  const amountPaid = Math.max(0, asNumber(body.amountPaid, 0));
  const paymentStatus =
    amountPaid >= total && total > 0
      ? "paid"
      : amountPaid > 0
        ? "partial"
        : (body.paymentStatus as string) === "partial" ||
            (body.paymentStatus as string) === "paid"
          ? (body.paymentStatus as "partial" | "paid")
          : "unpaid";
  const status =
    body.status === "ordered" ||
    body.status === "partial" ||
    body.status === "received" ||
    body.status === "cancelled"
      ? body.status
      : "draft";

  return {
    vendorId,
    branchId: resolvedBranchId,
    items,
    subtotal,
    tax,
    shippingCost,
    total,
    status,
    paymentStatus,
    amountPaid,
    expectedDelivery:
      typeof body.expectedDelivery === "string" && body.expectedDelivery
        ? new Date(body.expectedDelivery)
        : undefined,
    notes: typeof body.notes === "string" ? body.notes : "",
  };
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status") || "";

    const query: Record<string, unknown> = { tenantId: auth.tenantId };
    if (status) query.status = status;

    const [orders, total] = await Promise.all([
      PurchaseOrder.find(query)
        .populate("vendorId", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PurchaseOrder.countDocuments(query),
    ]);

    return apiSuccess({
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Purchase orders GET error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    if (auth.role === "cashier")
      return apiError("Insufficient permissions", 403);

    const body = (await request.json()) as Record<string, unknown>;
    const orderNumber = `PO-${Date.now().toString(36).toUpperCase()}`;
    const normalized = await normalizePurchasePayload(
      auth.tenantId,
      auth.branchId,
      body,
    );

    const order = await PurchaseOrder.create({
      ...normalized,
      tenantId: auth.tenantId,
      orderNumber,
      createdBy: auth.userId,
    });

    if (normalized.status === "received") {
      await applyStockDeltas(
        auth.tenantId,
        normalized.branchId,
        getReceivedQuantities(normalized.status, normalized.items),
      );
    }

    return apiSuccess({ order }, 201);
  } catch (error) {
    console.error("Purchase orders POST error:", error);
    return apiError(
      error instanceof Error ? error.message : "Internal server error",
      error instanceof Error ? 400 : 500,
    );
  }
}
