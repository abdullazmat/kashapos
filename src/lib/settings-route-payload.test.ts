import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildAllowedSettingsUpdate } from "./settings-route-payload.ts";

describe("settings route payload normalization", () => {
  it("includes new operating hours and loyalty fields", () => {
    const result = buildAllowedSettingsUpdate({
      operatingHoursWeekdays: " 08:00 - 20:00 ",
      operatingHoursWeekends: " 09:00 - 18:00 ",
      operatingHoursNotes: "  Public holidays vary ",
      loyaltyProgramEnabled: true,
      loyaltyPointsRate: 5,
      promotionsEnabled: true,
      promotionMessage: "  Double points this weekend ",
      outboundMessageGuardEnabled: true,
      outboundMessageLimit: 12,
      outboundMessageWindowMinutes: 45,
      receiptHeader: " Thanks for shopping ",
    });

    assert.equal(result["settings.operatingHoursWeekdays"], "08:00 - 20:00");
    assert.equal(result["settings.operatingHoursWeekends"], "09:00 - 18:00");
    assert.equal(
      result["settings.operatingHoursNotes"],
      "Public holidays vary",
    );
    assert.equal(result["settings.loyaltyProgramEnabled"], true);
    assert.equal(result["settings.loyaltyPointsRate"], 5);
    assert.equal(result["settings.promotionsEnabled"], true);
    assert.equal(result["settings.outboundMessageGuardEnabled"], true);
    assert.equal(result["settings.outboundMessageLimit"], 12);
    assert.equal(result["settings.outboundMessageWindowMinutes"], 45);
    assert.equal(
      result["settings.promotionMessage"],
      "Double points this weekend",
    );
    assert.equal(result["settings.receiptHeader"], " Thanks for shopping ");
  });

  it("clamps and filters values to safe persisted updates", () => {
    const result = buildAllowedSettingsUpdate({
      taxRate: 200,
      lowStockThreshold: -4,
      loyaltyPointsRate: -2,
      currencyRates: [
        { code: " usd ", rate: 3700 },
        { code: "ug", rate: 0 },
      ],
      customRoles: [
        {
          key: " Supervisor ",
          name: " Supervisor ",
          permissions: [" sales:view ", ""],
        },
        { key: "", name: "Missing Key", permissions: [] },
      ],
    });

    assert.equal(result["settings.taxRate"], 100);
    assert.equal(result["settings.lowStockThreshold"], 0);
    assert.equal(result["settings.loyaltyPointsRate"], 0);

    const currencyRates = result["settings.currencyRates"] as Array<{
      code: string;
      rate: number;
      lastUpdatedAt: Date;
      autoFetch: boolean;
    }>;
    assert.equal(currencyRates.length, 1);
    assert.deepEqual(currencyRates[0], {
      code: "USD",
      rate: 3700,
      lastUpdatedAt: currencyRates[0].lastUpdatedAt,
      autoFetch: false,
    });

    const customRoles = result["settings.customRoles"] as Array<{
      key: string;
      name: string;
      permissions: string[];
    }>;
    assert.equal(customRoles.length, 1);
    assert.deepEqual(customRoles[0], {
      key: "supervisor",
      name: "Supervisor",
      permissions: ["sales:view"],
      isActive: true,
    });
  });
});
