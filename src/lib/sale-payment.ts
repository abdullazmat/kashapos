import {
  calculateRemainingBalance,
  normalizeMoney,
  resolvePaymentStatus,
  type PaymentStatus,
} from "./customer-balance.ts";

export function computeSalePaymentState(
  totalOwed: unknown,
  amountPaid: unknown,
  dueDate?: Date | string | null,
): {
  amountPaid: number;
  remainingBalance: number;
  paymentStatus: PaymentStatus;
} {
  const normalizedAmountPaid = normalizeMoney(amountPaid);
  const remainingBalance = calculateRemainingBalance(
    totalOwed,
    normalizedAmountPaid,
  );

  return {
    amountPaid: normalizedAmountPaid,
    remainingBalance,
    paymentStatus: resolvePaymentStatus(remainingBalance, dueDate),
  };
}
