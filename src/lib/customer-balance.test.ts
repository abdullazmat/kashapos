import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculateRemainingBalance,
  calculateUpdatedCustomerBalance,
  resolvePaymentStatus,
} from "./customer-balance.ts";

describe("customer balance formulas", () => {
  it("calculates remaining balance as total owed minus amount paid", () => {
    assert.equal(calculateRemainingBalance(77880, 50000), 27880);
    assert.equal(calculateRemainingBalance(100000, 0), 100000);
    assert.equal(calculateRemainingBalance(100000, 120000), 0);
  });

  it("calculates new customer balance as previous balance minus payment amount", () => {
    assert.equal(calculateUpdatedCustomerBalance(27880, 27880), 0);
    assert.equal(calculateUpdatedCustomerBalance(45000, 10000), 35000);
    assert.equal(calculateUpdatedCustomerBalance(45000, 999999), 0);
  });
});

describe("payment status transitions", () => {
  const now = new Date("2026-03-15T12:00:00.000Z").getTime();

  it("returns cleared when the remaining balance is zero", () => {
    assert.equal(resolvePaymentStatus(0, undefined, now), "cleared");
  });

  it("returns partial when balance remains and due date is missing or in the future", () => {
    assert.equal(resolvePaymentStatus(27880, undefined, now), "partial");
    assert.equal(
      resolvePaymentStatus(27880, "2026-03-20T00:00:00.000Z", now),
      "partial",
    );
  });

  it("returns overdue when balance remains and the due date has passed", () => {
    assert.equal(
      resolvePaymentStatus(27880, "2026-03-10T00:00:00.000Z", now),
      "overdue",
    );
  });
});
