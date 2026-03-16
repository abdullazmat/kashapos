import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { allocateCustomerPaymentOldestFirst } from "../../../../lib/customer-payment-allocation.ts";

describe("customer payment endpoint allocation", () => {
  it("applies payments to unpaid sales oldest-first", () => {
    const { updatedSales, allocatedAmount, unappliedAmount } =
      allocateCustomerPaymentOldestFirst(
        [
          {
            _id: "sale-1",
            amountPaid: 50000,
            remainingBalance: 27880,
            paymentStatus: "partial",
            dueDate: "2026-03-12T00:00:00.000Z",
          },
          {
            _id: "sale-2",
            amountPaid: 0,
            remainingBalance: 40000,
            paymentStatus: "partial",
            dueDate: "2026-03-20T00:00:00.000Z",
          },
        ],
        30000,
      );

    assert.equal(allocatedAmount, 30000);
    assert.equal(unappliedAmount, 0);
    assert.equal(updatedSales[0]?.amountApplied, 27880);
    assert.equal(updatedSales[0]?.remainingBalance, 0);
    assert.equal(updatedSales[0]?.paymentStatus, "cleared");
    assert.equal(updatedSales[1]?.amountApplied, 2120);
    assert.equal(updatedSales[1]?.remainingBalance, 37880);
    assert.equal(updatedSales[1]?.paymentStatus, "partial");
  });

  it("reports unapplied amount when payment exceeds total open balances", () => {
    const { updatedSales, allocatedAmount, unappliedAmount } =
      allocateCustomerPaymentOldestFirst(
        [
          {
            _id: "sale-1",
            amountPaid: 0,
            remainingBalance: 10000,
            paymentStatus: "partial",
            dueDate: "2026-03-05T00:00:00.000Z",
          },
        ],
        15000,
      );

    assert.equal(allocatedAmount, 10000);
    assert.equal(unappliedAmount, 5000);
    assert.equal(updatedSales[0]?.remainingBalance, 0);
    assert.equal(updatedSales[0]?.paymentStatus, "cleared");
  });
});
