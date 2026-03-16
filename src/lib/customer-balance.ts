export type PaymentStatus = "cleared" | "partial" | "overdue";

export function normalizeMoney(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

export function calculateRemainingBalance(
  totalOwed: unknown,
  amountPaid: unknown,
) {
  return Math.max(0, normalizeMoney(totalOwed) - normalizeMoney(amountPaid));
}

export function calculateUpdatedCustomerBalance(
  previousBalance: unknown,
  paymentAmount: unknown,
) {
  return Math.max(
    0,
    normalizeMoney(previousBalance) - normalizeMoney(paymentAmount),
  );
}

export function resolvePaymentStatus(
  remainingBalance: number,
  dueDate?: Date | string | null,
  now = Date.now(),
): PaymentStatus {
  if (remainingBalance <= 0) return "cleared";

  if (!dueDate) return "partial";

  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return "partial";

  return due.getTime() < now ? "overdue" : "partial";
}
