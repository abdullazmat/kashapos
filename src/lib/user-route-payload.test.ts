import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  normalizeUserCreatePayload,
  normalizeUserUpdatePayload,
} from "./user-route-payload.ts";

describe("user route payload normalization", () => {
  it("normalizes create payload optional fields", () => {
    const result = normalizeUserCreatePayload({
      name: "  Alice Admin  ",
      email: "  Alice@Example.com ",
      password: "  Secret123  ",
      branchId: "  branch-1  ",
      phone: "  +256700000000  ",
      nationalId: "  CF123  ",
      employmentType: "  full_time ",
      startDate: "2026-03-15",
      loginPin: " 1234 ",
      isActive: false,
      avatar: "  data:image/png;base64,abc  ",
    });

    assert.equal(result.name, "Alice Admin");
    assert.equal(result.email, "alice@example.com");
    assert.equal(result.password, "Secret123");
    assert.equal(result.branchId, "branch-1");
    assert.equal(result.phone, "+256700000000");
    assert.equal(result.nationalId, "CF123");
    assert.equal(result.employmentType, "full_time");
    assert.equal(
      result.startDate?.toISOString(),
      new Date("2026-03-15").toISOString(),
    );
    assert.equal(result.loginPin, "1234");
    assert.equal(result.isActive, false);
    assert.equal(result.avatar, "data:image/png;base64,abc");
  });

  it("normalizes update payload clear operations", () => {
    const result = normalizeUserUpdatePayload({
      _id: "  user-1  ",
      email: "  Updated@Example.com  ",
      branchId: "",
      phone: "",
      nationalId: "  ID-9  ",
      employmentType: null,
      startDate: "",
      loginPin: " 5555 ",
      avatar: "",
      isActive: true,
    });

    assert.equal(result.id, "user-1");
    assert.equal(result.email, "updated@example.com");
    assert.equal(result.clearBranchId, true);
    assert.equal(result.clearPhone, true);
    assert.equal(result.nationalId, "ID-9");
    assert.equal(result.clearEmploymentType, true);
    assert.equal(result.clearStartDate, true);
    assert.equal(result.loginPin, "5555");
    assert.equal(result.clearAvatar, true);
    assert.equal(result.isActive, true);
  });
});
