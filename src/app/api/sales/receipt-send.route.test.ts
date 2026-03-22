import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { prepareReceiptEmail } from "../../../lib/manual-email-rules.ts";

describe("sales receipt send endpoint rules", () => {
  it("builds receipt email payload when customer email is present", () => {
    const result = prepareReceiptEmail({
      tenantId: "tenant-1",
      customerName: "Jane",
      customerEmail: "jane@example.com",
      orderNumber: "SO-1001",
      total: 98000,
      amountPaid: 50000,
      remainingBalance: 48000,
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.email.to, "jane@example.com");
    assert.equal(result.email.subject, "Receipt SO-1001");
    assert.match(result.email.text, /Amount paid: 50,000/);
    assert.match(result.email.text, /Remaining balance: 48,000/);
  });

  it("returns a 400-style error when customer email is missing", () => {
    const result = prepareReceiptEmail({
      tenantId: "tenant-1",
      customerName: "Jane",
      customerEmail: "",
      orderNumber: "SO-1002",
      total: 1000,
      amountPaid: 1000,
      remainingBalance: 0,
    });

    assert.equal(result.ok, false);
    if (result.ok) return;

    assert.equal(result.status, 400);
    assert.equal(result.error, "Customer email is required to send receipt");
  });
});
