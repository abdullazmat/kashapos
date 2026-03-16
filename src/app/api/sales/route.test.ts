import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeSalePaymentState } from "../../../lib/sale-payment.ts";

describe("sales endpoint payment state", () => {
  it("computes remaining balance for partial credit sale", () => {
    const result = computeSalePaymentState(
      77880,
      50000,
      "2026-03-20T00:00:00.000Z",
    );

    assert.equal(result.amountPaid, 50000);
    assert.equal(result.remainingBalance, 27880);
    assert.equal(result.paymentStatus, "partial");
  });

  it("marks sale as overdue when due date has passed and balance remains", () => {
    const result = computeSalePaymentState(
      77880,
      0,
      "2026-03-10T00:00:00.000Z",
    );

    assert.equal(result.remainingBalance, 77880);
    assert.equal(result.paymentStatus, "overdue");
  });

  it("marks sale as cleared when fully paid", () => {
    const result = computeSalePaymentState(77880, 77880, undefined);

    assert.equal(result.remainingBalance, 0);
    assert.equal(result.paymentStatus, "cleared");
  });
});
