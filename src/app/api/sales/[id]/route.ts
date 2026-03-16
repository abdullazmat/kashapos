import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Sale from "@/models/Sale";
import Stock from "@/models/Stock";
import Customer from "@/models/Customer";
import Product from "@/models/Product";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";
import { normalizeMoney, resolvePaymentStatus } from "@/lib/customer-balance";
import { computeSalePaymentState } from "@/lib/sale-payment";

type PaymentMethod =
  | "cash"
  | "card"
  | "mobile_money"
  | "split"
  | "credit"
  | "bank_transfer";

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
  amountPaid: number;
  remainingBalance: number;
  dueDate?: Date;
  creditNote: string;
  paymentStatus: "cleared" | "partial" | "overdue";
  paymentMethod: PaymentMethod;
  paymentDetails: {
    cashAmount?: number;
    cardAmount?: number;
    cardLast4?: string;
    cardExpiry?: string;
    cardholderName?: string;
    cardType?: string;
    mobileMoneyAmount?: number;
    mobileMoneyProvider?: "mtn" | "airtel";
    mobileMoneyRef?: string;
    mobileMoneyPhone?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankBranchCode?: string;
    bankReference?: string;
    transferDate?: Date;
    splitPayments?: {
      method: "cash" | "card" | "mobile_money" | "bank_transfer";
      amount: number;
      reference?: string;
    }[];
    changeGiven?: number;
  };
  status: "completed" | "pending" | "refunded" | "voided";
  notes: string;
};

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDayBoundary(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function validateDueDateNotBackdated(dueDate?: Date) {
  if (!dueDate) return;
  const today = normalizeDayBoundary(new Date());
  const selected = normalizeDayBoundary(dueDate);
  if (selected < today) {
    throw new Error("Due date cannot be in the past");
  }
}

function contributesToCustomer(status: string) {
  return status !== "refunded" && status !== "voided";
}

function commitsStock(status: string) {
  return status === "completed" || status === "pending";
}

async function hasOverdueOpenBalance(tenantId: string, customerId: string) {
  const overdueSale = await Sale.findOne({
    tenantId,
    customerId,
    status: { $nin: ["refunded", "voided"] },
    remainingBalance: { $gt: 0 },
    dueDate: { $lt: new Date() },
  })
    .select("_id")
    .lean();

  return Boolean(overdueSale);
}

function getCommittedQuantities(
  status: string,
  items: Array<{ productId: string; quantity: number }>,
) {
  const quantities = new Map<string, number>();
  if (!commitsStock(status)) return quantities;

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
    stockRows.map((stock) => [
      String(stock.productId),
      (Number(stock.quantity) || 0) - (Number(stock.reservedQuantity) || 0),
    ]),
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
  tenantId: string,
  options: {
    customerId?: string;
    purchasesDelta?: number;
    spentDelta?: number;
    outstandingDelta?: number;
    dueDate?: Date;
    amountPaidDelta?: number;
  },
) {
  const {
    customerId,
    purchasesDelta = 0,
    spentDelta = 0,
    outstandingDelta = 0,
    dueDate,
    amountPaidDelta = 0,
  } = options;
  if (!customerId) return;

  const customer = await Customer.findOne({ _id: customerId, tenantId });
  if (!customer) {
    throw new Error("Customer not found");
  }

  const nextOutstanding = Math.max(
    0,
    normalizeMoney(customer.outstandingBalance) + outstandingDelta,
  );

  if (
    outstandingDelta > 0 &&
    normalizeMoney(customer.creditLimit) > 0 &&
    nextOutstanding > normalizeMoney(customer.creditLimit)
  ) {
    throw new Error("Customer credit limit exceeded");
  }

  customer.totalPurchases = Math.max(
    0,
    normalizeMoney(customer.totalPurchases) + purchasesDelta,
  );
  customer.totalSpent = Math.max(
    0,
    normalizeMoney(customer.totalSpent) + spentDelta,
  );
  customer.outstandingBalance = nextOutstanding;

  if (nextOutstanding <= 0) {
    customer.paymentStatus = "cleared";
  } else {
    const overdue = await hasOverdueOpenBalance(tenantId, String(customer._id));
    customer.paymentStatus = overdue
      ? "overdue"
      : resolvePaymentStatus(nextOutstanding, dueDate);
  }

  if (amountPaidDelta > 0) {
    customer.lastPaymentDate = new Date();
  }

  await customer.save();
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
    body.paymentMethod === "card"
      ? "card"
      : body.paymentMethod === "mobile_money"
        ? "mobile_money"
        : body.paymentMethod === "split"
          ? "split"
          : body.paymentMethod === "credit"
            ? "credit"
            : body.paymentMethod === "bank" ||
                body.paymentMethod === "bank_transfer"
              ? "bank_transfer"
              : "cash";

  const computedTotal = Math.max(0, subtotal - totalDiscount + totalTax);
  const requestedAmountPaid = Math.max(
    0,
    asNumber(body.amountPaid, paymentMethod === "credit" ? 0 : computedTotal),
  );
  const dueDateValue = body.dueDate
    ? new Date(String(body.dueDate))
    : undefined;
  const dueDate =
    dueDateValue && !Number.isNaN(dueDateValue.getTime())
      ? dueDateValue
      : undefined;

  validateDueDateNotBackdated(dueDate);

  const { amountPaid, remainingBalance, paymentStatus } =
    computeSalePaymentState(computedTotal, requestedAmountPaid, dueDate);

  if (remainingBalance > 0 && !body.customerId && !body.customer) {
    throw new Error("Customer is required for credit balance sales");
  }
  const paymentDetailsInput =
    typeof body.paymentDetails === "object" && body.paymentDetails
      ? (body.paymentDetails as Record<string, unknown>)
      : {};
  const mobileMoneyProvider: "mtn" | "airtel" =
    body.mobileMoneyProvider === "airtel" ||
    paymentDetailsInput.mobileMoneyProvider === "airtel"
      ? "airtel"
      : "mtn";
  const paymentDetails: NormalizedSalePayload["paymentDetails"] =
    paymentMethod === "cash"
      ? {
          cashAmount: amountPaid,
          changeGiven: Math.max(0, amountPaid - computedTotal),
        }
      : paymentMethod === "card"
        ? (() => {
            const cardNumberRaw = String(
              paymentDetailsInput.cardNumber || body.cardNumber || "",
            ).replace(/\D/g, "");
            const cardExpiry = String(
              paymentDetailsInput.cardExpiry || body.cardExpiry || "",
            ).trim();
            const cardCvv = String(
              paymentDetailsInput.cardCvv || body.cardCvv || "",
            ).replace(/\D/g, "");
            if (!cardNumberRaw || cardNumberRaw.length < 12) {
              throw new Error("Card number is required for card payments");
            }
            if (!cardExpiry) {
              throw new Error("Card expiry is required for card payments");
            }
            if (!cardCvv || cardCvv.length < 3) {
              throw new Error("CVV is required for card payments");
            }
            return {
              cardAmount: amountPaid || computedTotal,
              cardLast4: cardNumberRaw.slice(-4),
              cardExpiry,
              cardholderName: String(
                paymentDetailsInput.cardholderName || body.cardholderName || "",
              ).trim(),
              cardType: String(
                paymentDetailsInput.cardType || body.cardType || "",
              ).trim(),
            };
          })()
        : paymentMethod === "mobile_money"
          ? (() => {
              const phone = String(
                paymentDetailsInput.mobileMoneyPhone ||
                  body.mobileMoneyPhone ||
                  "",
              ).trim();
              if (!phone) {
                throw new Error(
                  "Phone number is required for mobile money payments",
                );
              }
              return {
                mobileMoneyAmount: amountPaid || computedTotal,
                mobileMoneyProvider,
                mobileMoneyPhone: phone,
                mobileMoneyRef:
                  typeof (
                    paymentDetailsInput.mobileMoneyRef || body.mobileMoneyRef
                  ) === "string"
                    ? String(
                        paymentDetailsInput.mobileMoneyRef ||
                          body.mobileMoneyRef,
                      )
                    : undefined,
              };
            })()
          : paymentMethod === "bank_transfer"
            ? (() => {
                const bankName = String(
                  paymentDetailsInput.bankName || body.bankName || "",
                ).trim();
                const accountNumber = String(
                  paymentDetailsInput.bankAccountNumber ||
                    body.bankAccountNumber ||
                    "",
                ).trim();
                const reference = String(
                  paymentDetailsInput.bankReference ||
                    body.bankReference ||
                    body.reference ||
                    "",
                ).trim();
                if (!bankName || !accountNumber || !reference) {
                  throw new Error(
                    "Bank name, account number, and transfer reference are required",
                  );
                }
                const transferDateRaw = String(
                  paymentDetailsInput.transferDate || body.transferDate || "",
                ).trim();
                const transferDate = transferDateRaw
                  ? new Date(transferDateRaw)
                  : undefined;
                return {
                  cardAmount: amountPaid || computedTotal,
                  bankName,
                  bankAccountNumber: accountNumber,
                  bankReference: reference,
                  bankBranchCode: String(
                    paymentDetailsInput.bankBranchCode ||
                      body.bankBranchCode ||
                      "",
                  ).trim(),
                  ...(transferDate && !Number.isNaN(transferDate.getTime())
                    ? { transferDate }
                    : {}),
                };
              })()
            : paymentMethod === "credit"
              ? {
                  cashAmount: amountPaid > 0 ? amountPaid : undefined,
                }
              : (() => {
                  const splitPayments = Array.isArray(
                    paymentDetailsInput.splitPayments,
                  )
                    ? (paymentDetailsInput.splitPayments
                        .map((row) => {
                          const record = row as Record<string, unknown>;
                          const method = String(record.method || "") as
                            | "cash"
                            | "card"
                            | "mobile_money"
                            | "bank_transfer";
                          const amount = asNumber(record.amount, 0);
                          const reference = String(
                            record.reference || "",
                          ).trim();
                          if (
                            ![
                              "cash",
                              "card",
                              "mobile_money",
                              "bank_transfer",
                            ].includes(method)
                          ) {
                            return null;
                          }
                          if (amount <= 0) {
                            return null;
                          }
                          return {
                            method,
                            amount,
                            reference: reference || undefined,
                          };
                        })
                        .filter(Boolean) as {
                        method:
                          | "cash"
                          | "card"
                          | "mobile_money"
                          | "bank_transfer";
                        amount: number;
                        reference?: string;
                      }[])
                    : [];

                  if (splitPayments.length < 2) {
                    throw new Error(
                      "Split payments require at least two payment methods",
                    );
                  }

                  const splitTotal = splitPayments.reduce(
                    (sum, row) => sum + row.amount,
                    0,
                  );
                  if (Math.abs(splitTotal - computedTotal) > 0.01) {
                    throw new Error(
                      "Split payment amounts must equal the order total",
                    );
                  }

                  const cashAmount =
                    splitPayments.find((row) => row.method === "cash")
                      ?.amount || undefined;
                  const cardAmount =
                    splitPayments.find((row) => row.method === "card")
                      ?.amount || undefined;
                  const mobileMoneyAmount =
                    splitPayments.find((row) => row.method === "mobile_money")
                      ?.amount || undefined;

                  return {
                    cashAmount,
                    cardAmount,
                    mobileMoneyAmount,
                    splitPayments,
                  };
                })();

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
    amountPaid,
    remainingBalance,
    dueDate,
    creditNote: typeof body.creditNote === "string" ? body.creditNote : "",
    paymentStatus,
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
        (body.amountPaid ?? sale.paymentDetails.cashAmount) ||
        sale.paymentDetails.cardAmount ||
        sale.paymentDetails.mobileMoneyAmount ||
        sale.amountPaid,
      status: body.status || sale.status,
      notes: body.notes !== undefined ? body.notes : sale.notes,
      mobileMoneyProvider:
        body.mobileMoneyProvider || sale.paymentDetails.mobileMoneyProvider,
      mobileMoneyRef: body.mobileMoneyRef || sale.paymentDetails.mobileMoneyRef,
      dueDate: body.dueDate !== undefined ? body.dueDate : sale.dueDate,
      creditNote:
        body.creditNote !== undefined ? body.creditNote : sale.creditNote,
    };

    const normalized = await normalizeSalePayload(
      auth.tenantId,
      auth.branchId,
      mergedBody,
    );

    const oldCommittedItems = getCommittedQuantities(
      sale.status,
      sale.items.map((item) => ({
        productId: String(item.productId),
        quantity: item.quantity,
      })),
    );
    const newCommittedItems = getCommittedQuantities(
      normalized.status,
      normalized.items,
    );

    if (String(sale.branchId) === normalized.branchId) {
      const stockDeltas = mergeQuantityMaps(
        oldCommittedItems,
        newCommittedItems,
      );
      await ensureStockAvailability(
        auth.tenantId,
        normalized.branchId,
        stockDeltas,
      );
      await applyStockDeltas(auth.tenantId, normalized.branchId, stockDeltas);
    } else {
      const newBranchDeltas = new Map<string, number>();
      for (const [productId, quantity] of newCommittedItems.entries()) {
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
        oldCommittedItems,
      );
      await applyStockDeltas(
        auth.tenantId,
        normalized.branchId,
        newBranchDeltas,
      );
    }

    const oldCustomerId = sale.customerId ? String(sale.customerId) : undefined;
    const newCustomerId = normalized.customerId;
    const oldContributes = contributesToCustomer(sale.status);
    const newContributes = contributesToCustomer(normalized.status);

    if (
      oldCustomerId &&
      oldContributes &&
      oldCustomerId === newCustomerId &&
      newContributes
    ) {
      await adjustCustomerStats(auth.tenantId, {
        customerId: newCustomerId,
        spentDelta: normalized.total - sale.total,
        outstandingDelta:
          normalized.remainingBalance - normalizeMoney(sale.remainingBalance),
        dueDate: normalized.dueDate,
        amountPaidDelta: Math.max(
          0,
          normalized.amountPaid - normalizeMoney(sale.amountPaid),
        ),
      });
    } else {
      if (oldCustomerId && oldContributes) {
        await adjustCustomerStats(auth.tenantId, {
          customerId: oldCustomerId,
          purchasesDelta: -1,
          spentDelta: -sale.total,
          outstandingDelta: -normalizeMoney(sale.remainingBalance),
        });
      }
      if (newCustomerId && newContributes) {
        await adjustCustomerStats(auth.tenantId, {
          customerId: newCustomerId,
          purchasesDelta: 1,
          spentDelta: normalized.total,
          outstandingDelta: normalized.remainingBalance,
          dueDate: normalized.dueDate,
          amountPaidDelta: normalized.amountPaid,
        });
      }
    }

    sale.branchId = normalized.branchId as never;
    sale.customerId = normalized.customerId as never;
    sale.items = normalized.items as never;
    sale.subtotal = normalized.subtotal;
    sale.totalDiscount = normalized.totalDiscount;
    sale.totalTax = normalized.totalTax;
    sale.total = normalized.total;
    sale.amountPaid = normalized.amountPaid;
    sale.remainingBalance = normalized.remainingBalance;
    sale.dueDate = normalized.dueDate;
    sale.creditNote = normalized.creditNote;
    sale.paymentStatus = normalized.paymentStatus;
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

    const committedItems = getCommittedQuantities(
      sale.status,
      sale.items.map((item) => ({
        productId: String(item.productId),
        quantity: item.quantity,
      })),
    );

    await applyStockDeltas(
      auth.tenantId,
      String(sale.branchId),
      committedItems,
    );

    if (sale.customerId && contributesToCustomer(sale.status)) {
      await adjustCustomerStats(auth.tenantId, {
        customerId: String(sale.customerId),
        purchasesDelta: -1,
        spentDelta: -sale.total,
        outstandingDelta: -normalizeMoney(sale.remainingBalance),
      });
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
