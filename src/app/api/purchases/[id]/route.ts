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
    productId: string;
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
    productId: string;
    quantity: number;
    receivedQuantity: number;
  }>,
) {
  const quantities = new Map<string, number>();
  if (status !== "received") return quantities;

  for (const item of items) {
    const quantity =
      item.receivedQuantity > 0 ? item.receivedQuantity : item.quantity;
    quantities.set(
      item.productId,
      (quantities.get(item.productId) || 0) + quantity,
    );
  }

  return quantities;
}

function mergeQuantityMaps(
  previous: Map<string, number>,
  next: Map<string, number>,
) {
  const allKeys = new Set([...previous.keys(), ...next.keys()]);
  const deltas = new Map<string, number>();

  for (const key of allKeys) {
    const delta = (next.get(key) || 0) - (previous.get(key) || 0);
    if (delta !== 0) deltas.set(key, delta);
  }

  return deltas;
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
  if (productIds.length !== rawItems.length) {
    throw new Error("Each purchase item must reference a product");
  }

  const products = await Product.find({
    tenantId,
    _id: { $in: productIds },
  }).lean();
  if (products.length !== new Set(productIds).size) {
    throw new Error("One or more selected products no longer exist");
  }

  const productMap = new Map(
    products.map((product) => [String(product._id), product]),
  );

  let subtotal = 0;
  const items = rawItems.map((item) => {
    const productId = String(item.productId || item.product || "").trim();
    const product = productMap.get(productId);
    if (!product)
      throw new Error("One or more selected products no longer exist");

    const quantity = Math.max(1, Math.floor(asNumber(item.quantity, 1)));
    const unitCost = Math.max(0, asNumber(item.unitCost, product.costPrice));
    const receivedQuantity = Math.max(
      0,
      Math.floor(asNumber(item.receivedQuantity, 0)),
    );
    const total = Math.max(0, asNumber(item.total, quantity * unitCost));
    subtotal += total;

    return {
      productId,
      productName: item.productName?.trim() || product.name,
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const { id } = await params;
    const order = await PurchaseOrder.findOne({
      _id: id,
      tenantId: auth.tenantId,
    })
      .populate("vendorId", "name")
      .lean();
    if (!order) return apiError("Purchase order not found", 404);
    return apiSuccess(order);
  } catch (error) {
    console.error("Purchase order GET error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    if (auth.role === "cashier") {
      return apiError("Insufficient permissions", 403);
    }

    const { id } = await params;
    const order = await PurchaseOrder.findOne({
      _id: id,
      tenantId: auth.tenantId,
    });
    if (!order) return apiError("Purchase order not found", 404);

    const body = (await request.json()) as Record<string, unknown>;
    const mergedBody = {
      vendorId: body.vendorId || String(order.vendorId),
      branchId: body.branchId || String(order.branchId),
      items:
        body.items ||
        order.items.map((item) => ({
          productId: String(item.productId),
          productName: item.productName,
          quantity: item.quantity,
          unitCost: item.unitCost,
          receivedQuantity: item.receivedQuantity,
          total: item.total,
        })),
      tax: body.tax !== undefined ? body.tax : order.tax,
      shippingCost:
        body.shippingCost !== undefined
          ? body.shippingCost
          : order.shippingCost,
      status: body.status || order.status,
      paymentStatus: body.paymentStatus || order.paymentStatus,
      amountPaid:
        body.amountPaid !== undefined ? body.amountPaid : order.amountPaid,
      expectedDelivery:
        body.expectedDelivery !== undefined
          ? body.expectedDelivery
          : order.expectedDelivery?.toISOString(),
      notes: body.notes !== undefined ? body.notes : order.notes,
    };

    const normalized = await normalizePurchasePayload(
      auth.tenantId,
      auth.branchId,
      mergedBody,
    );

    const previousReceived = getReceivedQuantities(
      order.status,
      order.items.map((item) => ({
        productId: String(item.productId),
        quantity: item.quantity,
        receivedQuantity: item.receivedQuantity,
      })),
    );
    const nextReceived = getReceivedQuantities(
      normalized.status,
      normalized.items,
    );

    if (String(order.branchId) === normalized.branchId) {
      const deltas = mergeQuantityMaps(previousReceived, nextReceived);
      await applyStockDeltas(auth.tenantId, normalized.branchId, deltas);
    } else {
      const restoreOld = new Map<string, number>();
      for (const [productId, quantity] of previousReceived.entries()) {
        restoreOld.set(productId, -quantity);
      }
      await applyStockDeltas(auth.tenantId, String(order.branchId), restoreOld);
      await applyStockDeltas(auth.tenantId, normalized.branchId, nextReceived);
    }

    order.vendorId = normalized.vendorId as never;
    order.branchId = normalized.branchId as never;
    order.items = normalized.items as never;
    order.subtotal = normalized.subtotal;
    order.tax = normalized.tax;
    order.shippingCost = normalized.shippingCost;
    order.total = normalized.total;
    order.status = normalized.status;
    order.paymentStatus = normalized.paymentStatus;
    order.amountPaid = normalized.amountPaid;
    order.expectedDelivery = normalized.expectedDelivery;
    order.notes = normalized.notes;
    await order.save();

    return apiSuccess({ order });
  } catch (error) {
    console.error("Purchase order PATCH error:", error);
    return apiError(
      error instanceof Error ? error.message : "Internal server error",
      error instanceof Error ? 400 : 500,
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    if (auth.role === "cashier") {
      return apiError("Insufficient permissions", 403);
    }

    const { id } = await params;
    const order = await PurchaseOrder.findOne({
      _id: id,
      tenantId: auth.tenantId,
    });
    if (!order) return apiError("Purchase order not found", 404);

    const receivedItems = getReceivedQuantities(
      order.status,
      order.items.map((item) => ({
        productId: String(item.productId),
        quantity: item.quantity,
        receivedQuantity: item.receivedQuantity,
      })),
    );
    const reverseDeltas = new Map<string, number>();
    for (const [productId, quantity] of receivedItems.entries()) {
      reverseDeltas.set(productId, -quantity);
    }

    await applyStockDeltas(
      auth.tenantId,
      String(order.branchId),
      reverseDeltas,
    );
    await order.deleteOne();

    return apiSuccess({ message: "Purchase order deleted" });
  } catch (error) {
    console.error("Purchase order DELETE error:", error);
    return apiError(
      error instanceof Error ? error.message : "Internal server error",
      error instanceof Error ? 400 : 500,
    );
  }
}
