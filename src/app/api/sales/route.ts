import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Sale from "@/models/Sale";
import Stock from "@/models/Stock";
import Customer from "@/models/Customer";
import Product from "@/models/Product";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";
import { generateOrderNumber } from "@/lib/utils";

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
    throw new Error("Branch is required to create a sale");
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

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    const query: Record<string, unknown> = { tenantId: auth.tenantId };
    if (auth.branchId) query.branchId = auth.branchId;
    if (status) query.status = status;
    if (from || to) {
      query.createdAt = {};
      if (from)
        (query.createdAt as Record<string, unknown>).$gte = new Date(from);
      if (to) (query.createdAt as Record<string, unknown>).$lte = new Date(to);
    }

    const [sales, total] = await Promise.all([
      Sale.find(query)
        .populate("customerId", "name phone")
        .populate("cashierId", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Sale.countDocuments(query),
    ]);

    return apiSuccess({
      sales,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Sales GET error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const auth = getAuthContext(request);
    const body = (await request.json()) as Record<string, unknown>;

    const orderNumber = generateOrderNumber();
    const normalized = await normalizeSalePayload(
      auth.tenantId,
      auth.branchId,
      body,
    );
    const stockDeltas = new Map<string, number>();

    for (const [productId, quantity] of getCompletedQuantities(
      normalized.status,
      normalized.items,
    )) {
      stockDeltas.set(productId, -quantity);
    }

    await ensureStockAvailability(
      auth.tenantId,
      normalized.branchId,
      stockDeltas,
    );

    const sale = await Sale.create({
      ...normalized,
      tenantId: auth.tenantId,
      orderNumber,
      cashierId: auth.userId,
    });

    await applyStockDeltas(auth.tenantId, normalized.branchId, stockDeltas);

    if (normalized.status === "completed") {
      await adjustCustomerStats(normalized.customerId, normalized.total, 1);
    }

    return apiSuccess({ sale }, 201);
  } catch (error) {
    console.error("Sales POST error:", error);
    return apiError(
      error instanceof Error ? error.message : "Internal server error",
      error instanceof Error ? 400 : 500,
    );
  }
}
