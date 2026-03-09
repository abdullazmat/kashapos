import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Sale from "@/models/Sale";
import Stock from "@/models/Stock";
import Customer from "@/models/Customer";
import Product from "@/models/Product";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";

type PaymentMethod = "cash" | "card" | "mobile_money" | "split";

type RawSaleItem = {
  productId?: string;
  product?: string;
  productName?: string;
  sku?: string;
  quantity?: number;
  unitPrice?: number;
  discount?: number;
  discountType?: "percentage" | "fixed";
  tax?: number;
  total?: number;
};

type NormalizedSalePayload = {
  branchId: string;
  customerId?: string;
  items: {
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    discountType: "percentage" | "fixed";
    tax: number;
    total: number;
  }[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentDetails: {
    cashAmount?: number;
    cardAmount?: number;
    mobileMoneyAmount?: number;
    mobileMoneyProvider?: "mtn" | "airtel";
    mobileMoneyRef?: string;
    changeGiven?: number;
  };
  status: "completed" | "pending" | "refunded" | "voided";
  notes: string;
};

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getCompletedQuantities(
  status: string,
  items: Array<{ productId: string; quantity: number }>,
) {
  const quantities = new Map<string, number>();
  if (status !== "completed") return quantities;

  for (const item of items) {
    quantities.set(
      item.productId,
      (quantities.get(item.productId) || 0) + item.quantity,
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
    const delta = (previous.get(key) || 0) - (next.get(key) || 0);
    if (delta !== 0) deltas.set(key, delta);
  }

  return deltas;
}

async function ensureStockAvailability(
  tenantId: string,
  branchId: string,
  deltas: Map<string, number>,
) {
  const requiredProductIds = [...deltas.entries()]
    .filter(([, delta]) => delta < 0)
    .map(([productId]) => productId);

  if (requiredProductIds.length === 0) return;

  const stockRows = await Stock.find({
    tenantId,
    branchId,
    productId: { $in: requiredProductIds },
  }).lean();

  const stockMap = new Map(
    stockRows.map((stock) => [String(stock.productId), stock.quantity]),
  );

  for (const [productId, delta] of deltas.entries()) {
    if (delta >= 0) continue;
    const available = stockMap.get(productId) || 0;
    if (available < Math.abs(delta)) {
      throw new Error("Insufficient stock for one or more items");
    }
  }
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
      { $inc: { quantity: delta } },
      { new: true },
    );
  }
}

async function adjustCustomerStats(
  customerId: string | undefined,
  total: number,
  direction: 1 | -1,
) {
  if (!customerId) return;

  await Customer.findByIdAndUpdate(customerId, {
    $inc: {
      totalPurchases: direction,
      totalSpent: total * direction,
    },
  });
}

async function normalizeSalePayload(
  tenantId: string,
  branchId: string | undefined,
  body: Record<string, unknown>,
): Promise<NormalizedSalePayload> {
  const resolvedBranchId = String(branchId || body.branchId || "").trim();
  if (!resolvedBranchId) {
    throw new Error("Branch is required to update a sale");
  }

  const rawItems = Array.isArray(body.items)
    ? (body.items as RawSaleItem[])
    : [];
  if (rawItems.length === 0) {
    throw new Error("At least one sale item is required");
  }

  const productIds = rawItems
    .map((item) => String(item.productId || item.product || "").trim())
    .filter(Boolean);

  if (productIds.length !== rawItems.length) {
    throw new Error("Each sale item must reference a product");
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
  let totalDiscount = 0;
  let totalTax = 0;

  const items = rawItems.map((item) => {
    const productId = String(item.productId || item.product || "").trim();
    const product = productMap.get(productId);
    if (!product) {
      throw new Error("One or more selected products no longer exist");
    }

    const quantity = Math.max(1, Math.floor(asNumber(item.quantity, 1)));
    const unitPrice = asNumber(item.unitPrice, product.price);
    const discount = Math.max(0, asNumber(item.discount, 0));
    const discountType: "percentage" | "fixed" =
      item.discountType === "percentage" ? "percentage" : "fixed";
    const lineSubtotal = unitPrice * quantity;
    const discountAmount =
      discountType === "percentage"
        ? Math.min(lineSubtotal, (lineSubtotal * discount) / 100)
        : Math.min(lineSubtotal, discount);
    const taxableAmount = Math.max(0, lineSubtotal - discountAmount);
    const tax =
      item.tax !== undefined
        ? Math.max(0, asNumber(item.tax, 0))
        : (taxableAmount * asNumber(product.taxRate, 0)) / 100;
    const total = Math.max(0, asNumber(item.total, taxableAmount + tax));

    subtotal += lineSubtotal;
    totalDiscount += discountAmount;
    totalTax += tax;

    return {
      productId,
      productName: item.productName?.trim() || product.name,
      sku: item.sku?.trim() || product.sku,
      quantity,
      unitPrice,
      discount,
      discountType,
      tax,
      total,
    };
  });

  const paymentMethod =
    body.paymentMethod === "card" ||
    body.paymentMethod === "mobile_money" ||
    body.paymentMethod === "split"
      ? body.paymentMethod
      : "cash";

  const computedTotal = Math.max(0, subtotal - totalDiscount + totalTax);
  const amountPaid = asNumber(body.amountPaid, computedTotal);
  const mobileMoneyProvider: "mtn" | "airtel" =
    body.mobileMoneyProvider === "airtel" ? "airtel" : "mtn";
  const paymentDetails: NormalizedSalePayload["paymentDetails"] =
    paymentMethod === "cash"
      ? {
          cashAmount: amountPaid,
          changeGiven: Math.max(0, amountPaid - computedTotal),
        }
      : paymentMethod === "card"
        ? { cardAmount: amountPaid || computedTotal }
        : paymentMethod === "mobile_money"
          ? {
              mobileMoneyAmount: amountPaid || computedTotal,
              mobileMoneyProvider,
              mobileMoneyRef:
                typeof body.mobileMoneyRef === "string"
                  ? body.mobileMoneyRef
                  : undefined,
            }
          : {
              cashAmount: computedTotal / 2,
              cardAmount: computedTotal / 2,
            };

  return {
    branchId: resolvedBranchId,
    customerId: body.customerId
      ? String(body.customerId)
      : body.customer
        ? String(body.customer)
        : undefined,
    items,
    subtotal,
    totalDiscount,
    totalTax,
    total: computedTotal,
    paymentMethod,
    paymentDetails,
    status:
      body.status === "pending" ||
      body.status === "refunded" ||
      body.status === "voided"
        ? body.status
        : "completed",
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
    const sale = await Sale.findOne({ _id: id, tenantId: auth.tenantId })
      .populate("customerId", "name phone email")
      .populate("cashierId", "name")
      .lean();
    if (!sale) return apiError("Sale not found", 404);
    return apiSuccess(sale);
  } catch (error) {
    console.error("Sale GET error:", error);
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
    const { id } = await params;
    const sale = await Sale.findOne({ _id: id, tenantId: auth.tenantId });
    if (!sale) return apiError("Sale not found", 404);

    const body = (await request.json()) as Record<string, unknown>;
    const mergedBody = {
      branchId: body.branchId || String(sale.branchId),
      customerId:
        body.customerId !== undefined
          ? body.customerId
          : sale.customerId
            ? String(sale.customerId)
            : undefined,
      items:
        body.items ||
        sale.items.map((item) => ({
          productId: String(item.productId),
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          discountType: item.discountType,
          tax: item.tax,
          total: item.total,
        })),
      paymentMethod: body.paymentMethod || sale.paymentMethod,
      amountPaid:
        body.amountPaid ||
        sale.paymentDetails.cashAmount ||
        sale.paymentDetails.cardAmount ||
        sale.paymentDetails.mobileMoneyAmount ||
        sale.total,
      status: body.status || sale.status,
      notes: body.notes !== undefined ? body.notes : sale.notes,
      mobileMoneyProvider:
        body.mobileMoneyProvider || sale.paymentDetails.mobileMoneyProvider,
      mobileMoneyRef: body.mobileMoneyRef || sale.paymentDetails.mobileMoneyRef,
    };

    const normalized = await normalizeSalePayload(
      auth.tenantId,
      auth.branchId,
      mergedBody,
    );

    const oldCompletedItems = getCompletedQuantities(
      sale.status,
      sale.items.map((item) => ({
        productId: String(item.productId),
        quantity: item.quantity,
      })),
    );
    const newCompletedItems = getCompletedQuantities(
      normalized.status,
      normalized.items,
    );

    if (String(sale.branchId) === normalized.branchId) {
      const stockDeltas = mergeQuantityMaps(
        oldCompletedItems,
        newCompletedItems,
      );
      await ensureStockAvailability(
        auth.tenantId,
        normalized.branchId,
        stockDeltas,
      );
      await applyStockDeltas(auth.tenantId, normalized.branchId, stockDeltas);
    } else {
      const newBranchDeltas = new Map<string, number>();
      for (const [productId, quantity] of newCompletedItems.entries()) {
        newBranchDeltas.set(productId, -quantity);
      }
      await ensureStockAvailability(
        auth.tenantId,
        normalized.branchId,
        newBranchDeltas,
      );

      await applyStockDeltas(
        auth.tenantId,
        String(sale.branchId),
        oldCompletedItems,
      );
      await applyStockDeltas(
        auth.tenantId,
        normalized.branchId,
        newBranchDeltas,
      );
    }

    if (sale.status === "completed") {
      await adjustCustomerStats(
        sale.customerId ? String(sale.customerId) : undefined,
        sale.total,
        -1,
      );
    }
    if (normalized.status === "completed") {
      await adjustCustomerStats(normalized.customerId, normalized.total, 1);
    }

    sale.branchId = normalized.branchId as never;
    sale.customerId = normalized.customerId as never;
    sale.items = normalized.items as never;
    sale.subtotal = normalized.subtotal;
    sale.totalDiscount = normalized.totalDiscount;
    sale.totalTax = normalized.totalTax;
    sale.total = normalized.total;
    sale.paymentMethod = normalized.paymentMethod;
    sale.paymentDetails = normalized.paymentDetails;
    sale.status = normalized.status;
    sale.notes = normalized.notes;
    await sale.save();

    return apiSuccess({ sale });
  } catch (error) {
    console.error("Sale PATCH error:", error);
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
    const { id } = await params;
    const sale = await Sale.findOne({ _id: id, tenantId: auth.tenantId });
    if (!sale) return apiError("Sale not found", 404);

    const completedItems = getCompletedQuantities(
      sale.status,
      sale.items.map((item) => ({
        productId: String(item.productId),
        quantity: item.quantity,
      })),
    );

    await applyStockDeltas(
      auth.tenantId,
      String(sale.branchId),
      completedItems,
    );

    if (sale.status === "completed") {
      await adjustCustomerStats(
        sale.customerId ? String(sale.customerId) : undefined,
        sale.total,
        -1,
      );
    }

    await sale.deleteOne();

    return apiSuccess({ message: "Sale deleted" });
  } catch (error) {
    console.error("Sale DELETE error:", error);
    return apiError(
      error instanceof Error ? error.message : "Internal server error",
      error instanceof Error ? 400 : 500,
    );
  }
}
