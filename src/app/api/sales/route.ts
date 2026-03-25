import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Sale from "@/models/Sale";
import Stock from "@/models/Stock";
import Customer from "@/models/Customer";
import CustomerPayment from "@/models/CustomerPayment";
import Product from "@/models/Product";
import Tenant from "@/models/Tenant";
import { getAuthContext, apiSuccess, apiError } from "@/lib/api-helpers";
import { applyStockUpdate } from "@/lib/stock-service";
import { generateOrderNumber } from "@/lib/utils";
import { normalizeMoney, resolvePaymentStatus } from "@/lib/customer-balance";
import { computeSalePaymentState } from "@/lib/sale-payment";
import { sendTenantEmail } from "@/lib/mailer";

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
  walkInName?: string;
  walkInPhone?: string;
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
  items: any[],
) {
  await applyStockUpdate(
    tenantId,
    branchId,
    items.map((i) => ({
      productId: i.productId,
      sku: i.sku,
      quantity: -i.quantity, // Sales deduct quantity
    })),
  );
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

  const nextPurchases = Math.max(
    0,
    normalizeMoney(customer.totalPurchases) + purchasesDelta,
  );
  const nextSpent = Math.max(
    0,
    normalizeMoney(customer.totalSpent) + spentDelta,
  );

  customer.totalPurchases = nextPurchases;
  customer.totalSpent = nextSpent;
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
    walkInName:
      typeof body.walkInName === "string" ? body.walkInName.trim() : "",
    walkInPhone:
      typeof body.walkInPhone === "string" ? body.walkInPhone.trim() : "",
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
        .populate("customerId", "name phone email")
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

    for (const [productId, quantity] of getCommittedQuantities(
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

    const customerBefore = normalized.customerId
      ? await Customer.findOne({
          _id: normalized.customerId,
          tenantId: auth.tenantId,
        })
          .select("outstandingBalance email name")
          .lean()
      : null;

    const sale = await Sale.create({
      ...normalized,
      tenantId: auth.tenantId,
      orderNumber,
      cashierId: auth.userId,
    });

    await applyStockDeltas(
      auth.tenantId,
      normalized.branchId,
      normalized.items,
    );

    if (normalized.customerId && contributesToCustomer(normalized.status)) {
      await adjustCustomerStats(auth.tenantId, {
        customerId: normalized.customerId,
        purchasesDelta: 1,
        spentDelta: normalized.total,
        outstandingDelta: normalized.remainingBalance,
        dueDate: normalized.dueDate,
        amountPaidDelta: normalized.amountPaid,
      });

      const balanceBefore = normalizeMoney(
        customerBefore?.outstandingBalance || 0,
      );
      const balanceAfter = balanceBefore + normalized.remainingBalance;

      await CustomerPayment.create({
        tenantId: auth.tenantId,
        customerId: normalized.customerId,
        saleId: sale._id,
        amount: normalized.amountPaid,
        method:
          normalized.paymentMethod === "card" ||
          normalized.paymentMethod === "mobile_money" ||
          normalized.paymentMethod === "bank_transfer" ||
          normalized.paymentMethod === "split" ||
          normalized.paymentMethod === "credit"
            ? normalized.paymentMethod
            : "cash",
        reference: sale.orderNumber,
        notes: `Sale ${sale.orderNumber} recorded`,
        balanceBefore,
        balanceAfter,
        recordedBy: auth.userId || undefined,
        recordedByName: auth.name || "",
      });
    }

    const tenant = await Tenant.findById(auth.tenantId)
      .select("settings.emailReceiptAutoSend")
      .lean();

    if (tenant?.settings?.emailReceiptAutoSend && customerBefore?.email) {
      if (customerBefore.email) {
        try {
          await sendTenantEmail({
            tenantId: auth.tenantId,
            to: customerBefore.email,
            subject: `Receipt ${sale.orderNumber}`,
            text: `Receipt for ${sale.orderNumber}. Total: ${sale.total}. Amount paid: ${sale.amountPaid}. Remaining balance: ${sale.remainingBalance}.`,
            html: `<div style="font-family:Arial,sans-serif;line-height:1.5"><h2>Sale Receipt</h2><p>Order: <strong>${sale.orderNumber}</strong></p><p>Total: ${sale.total.toLocaleString()}</p><p>Amount Paid: ${sale.amountPaid.toLocaleString()}</p><p>Remaining Balance: ${sale.remainingBalance.toLocaleString()}</p></div>`,
          });
          await Sale.findByIdAndUpdate(sale._id, {
            $set: { receiptSent: true },
          });
        } catch {
          // Keep sale flow resilient even if email delivery fails.
        }
      }
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
