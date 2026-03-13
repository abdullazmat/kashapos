type PaymentStatus = "cleared" | "partial" | "overdue";

export function normalizeMoney(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

export function resolvePaymentStatus(
  remainingBalance: number,
  dueDate?: Date | string | null,
): PaymentStatus {
  if (remainingBalance <= 0) return "cleared";

  if (!dueDate) return "partial";

  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return "partial";

  return due.getTime() < Date.now() ? "overdue" : "partial";
}
