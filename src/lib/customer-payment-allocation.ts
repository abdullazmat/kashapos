import {
  normalizeMoney,
  resolvePaymentStatus,
  type PaymentStatus,
} from "./customer-balance.ts";

export interface AllocatableSale {
  _id?: string | { toString(): string };
  amountPaid: number;
  remainingBalance: number;
  paymentStatus: PaymentStatus;
  dueDate?: Date | string | null;
}

export type AllocatedSale<TSale extends AllocatableSale> = TSale & {
  amountApplied: number;
  amountPaid: number;
  remainingBalance: number;
  paymentStatus: PaymentStatus;
};

export function allocateCustomerPaymentOldestFirst<
  TSale extends AllocatableSale,
>(
  sales: TSale[],
  paymentAmount: unknown,
): {
  updatedSales: AllocatedSale<TSale>[];
  allocatedAmount: number;
  unappliedAmount: number;
} {
  let remainingToAllocate = normalizeMoney(paymentAmount);

  const updatedSales = sales.map((sale) => {
    const openBalance = normalizeMoney(sale.remainingBalance);
    const amountApplied = Math.min(openBalance, remainingToAllocate);
    const remainingBalance = Math.max(0, openBalance - amountApplied);
    const amountPaid = normalizeMoney(sale.amountPaid) + amountApplied;
    const paymentStatus = resolvePaymentStatus(remainingBalance, sale.dueDate);

    remainingToAllocate = Math.max(0, remainingToAllocate - amountApplied);

    return {
      ...sale,
      amountApplied,
      amountPaid,
      remainingBalance,
      paymentStatus,
    };
  });

  return {
    updatedSales,
    allocatedAmount: updatedSales.reduce(
      (sum, sale) => sum + sale.amountApplied,
      0,
    ),
    unappliedAmount: remainingToAllocate,
  };
}
