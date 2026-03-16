import assert from "node:assert/strict";
import { describe, it } from "node:test";

// @ts-expect-error Node strip-types tests resolve explicit .ts extensions.
import { prepareBalanceReminderEmail } from "../../../lib/manual-email-rules.ts";

describe("customer balance reminder endpoint rules", () => {
  it("builds reminder email payload when customer email is present", () => {
    const result = prepareBalanceReminderEmail({
      tenantId: "tenant-1",
      customerName: "Acme Ltd",
      customerEmail: "accounts@acme.test",
      outstandingBalance: 155000,
      openSales: [
        {
          orderNumber: "SO-1",
          dueDate: "2026-03-01T00:00:00.000Z",
          remainingBalance: 100000,
        },
        {
          orderNumber: "SO-2",
          dueDate: "2026-03-20T00:00:00.000Z",
          remainingBalance: 55000,
        },
      ],
      now: new Date("2026-03-15T00:00:00.000Z"),
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.email.to, "accounts@acme.test");
    assert.equal(result.email.subject, "Balance reminder for Acme Ltd");
    assert.equal(result.overdueCount, 1);
    assert.equal(result.openSalesCount, 2);
    assert.match(result.email.text, /Open credit sales: 2/);
    assert.match(result.email.text, /Overdue sales: 1/);
  });

  it("returns a 400-style error when customer email is missing", () => {
    const result = prepareBalanceReminderEmail({
      tenantId: "tenant-1",
      customerName: "No Mail Customer",
      customerEmail: "",
      outstandingBalance: 1000,
      openSales: [],
    });

    assert.equal(result.ok, false);
    if (result.ok) return;

    assert.equal(result.status, 400);
    assert.equal(result.error, "Customer email is required to send a reminder");
  });
});
