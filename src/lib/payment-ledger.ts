import Customer from "@/models/Customer";
import CustomerPayment from "@/models/CustomerPayment";
import { normalizeMoney, resolvePaymentStatus } from "./customer-balance.ts";

type SettlementMethod =
  | "cash"
  | "card"
  | "mobile_money"
  | "bank_transfer"
  | "split"
  | "credit"
  | "other";

export interface RecordCustomerPaymentForSaleInput {
  tenantId: string;
  saleId: string;
  customerId?: string;
  saleTotal: number;
  amountPaid: number;
  remainingBalance: number;
  paymentMethod: SettlementMethod;
  dueDate?: Date | string | null;
  reference?: string;
  notes?: string;
  recordedBy?: string;
  recordedByName?: string;
}

export async function recordCustomerPaymentForSale(
  input: RecordCustomerPaymentForSaleInput,
) {
  const {
    tenantId,
    saleId,
    customerId,
    saleTotal,
    amountPaid,
    remainingBalance,
    paymentMethod,
    dueDate,
    reference,
    notes,
    recordedBy,
    recordedByName,
  } = input;

  if (!customerId) return null;

  const existing = await CustomerPayment.findOne({ saleId }).lean();
  if (existing) return existing;

  const customer = await Customer.findOne({ _id: customerId, tenantId });
  if (!customer) {
    throw new Error("Customer not found");
  }

  const balanceBefore = normalizeMoney(customer.outstandingBalance);
  const nextOutstanding = Math.max(
    0,
    balanceBefore + normalizeMoney(remainingBalance),
  );

  if (
    remainingBalance > 0 &&
    normalizeMoney(customer.creditLimit) > 0 &&
    nextOutstanding > normalizeMoney(customer.creditLimit)
  ) {
    throw new Error("Customer credit limit exceeded");
  }

  customer.totalPurchases = normalizeMoney(customer.totalPurchases) + 1;
  customer.totalSpent = normalizeMoney(customer.totalSpent) + saleTotal;
  customer.outstandingBalance = nextOutstanding;
  customer.paymentStatus =
    nextOutstanding <= 0
      ? "cleared"
      : resolvePaymentStatus(nextOutstanding, dueDate);

  if (amountPaid > 0) {
    customer.lastPaymentDate = new Date();
  }

  await customer.save();

  return await CustomerPayment.create({
    tenantId,
    customerId,
    saleId,
    amount: amountPaid,
    method: paymentMethod,
    reference: reference || "",
    notes: notes || "",
    balanceBefore,
    balanceAfter: nextOutstanding,
    recordedBy,
    recordedByName: recordedByName || "",
  });
}
