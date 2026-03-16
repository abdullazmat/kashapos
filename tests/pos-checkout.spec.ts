import { test, expect } from "@playwright/test";

const baseUrl = process.env.POS_BASE_URL || "http://localhost:3000";
const demoEmail = "basic@poscloud.me";
const demoPassword = "basic123";
const seededBarcode = "1000000000001";
const missingBarcode = "BK-CIN-001";

function extractChargeAmount(buttonText: string) {
  const match = buttonText.match(/([\d,]+(?:\.\d+)?)/);
  if (!match) {
    throw new Error(`Unable to parse charge amount from: ${buttonText}`);
  }

  return Number(match[1].replace(/,/g, ""));
}

async function fastScan(
  page: import("@playwright/test").Page,
  inputSelector: string,
  value: string,
) {
  const input = page.locator(inputSelector);
  await input.click();
  await input.fill("");
  await input.pressSequentially(value, { delay: 8 });
  const startedAt = Date.now();
  await input.press("Enter");
  return startedAt;
}

test("POS scanner-style checkout flow", async ({ page, request }) => {
  test.setTimeout(180000);

  const seedResponse = await request.post(`${baseUrl}/api/seed`);
  expect([200, 201]).toContain(seedResponse.status());

  await page.goto(`${baseUrl}/sign-in`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("you@example.com").fill(demoEmail);
  await page.getByPlaceholder("••••••••").fill(demoPassword);
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL(/\/dashboard(\/)?$/, { timeout: 30000 });
  await page.goto(`${baseUrl}/dashboard/pos`, { waitUntil: "networkidle" });

  const searchInput = 'input[placeholder*="scan barcode"]';
  await expect(page.locator(searchInput)).toBeVisible({ timeout: 30000 });

  const firstStartedAt = await fastScan(page, searchInput, seededBarcode);
  await expect(page.getByText(/Added Cappuccino to the sale\./i)).toBeVisible({
    timeout: 10000,
  });
  await expect(page.locator(searchInput)).toHaveValue("", { timeout: 3000 });
  const firstLatencyMs = Date.now() - firstStartedAt;
  const chargeButton = page.getByRole("button", { name: /Charge/i });
  await expect(chargeButton).toBeVisible({ timeout: 10000 });
  const firstChargeAmount = extractChargeAmount(await chargeButton.innerText());
  expect(firstChargeAmount).toBeGreaterThan(0);

  const secondStartedAt = await fastScan(page, searchInput, seededBarcode);
  await expect(page.locator(searchInput)).toHaveValue("", { timeout: 3000 });
  const secondLatencyMs = Date.now() - secondStartedAt;
  const secondChargeAmount = extractChargeAmount(
    await chargeButton.innerText(),
  );
  expect(secondChargeAmount).toBe(firstChargeAmount * 2);

  const missingStartedAt = await fastScan(page, searchInput, missingBarcode);
  await expect(
    page.getByText(
      new RegExp(
        `Product not found for barcode ${missingBarcode.replace(/[-]/g, "\\-")}`,
        "i",
      ),
    ),
  ).toBeVisible({ timeout: 10000 });
  await expect(
    page.getByRole("link", { name: /Add To Inventory/i }),
  ).toBeVisible({ timeout: 10000 });
  const missingLatencyMs = Date.now() - missingStartedAt;

  await page.getByRole("button", { name: /Charge/i }).click();
  await expect(page.getByRole("heading", { name: /Payment/i })).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole("button", { name: /Complete Sale/i }).click();
  await expect(page.getByText(/Sale Complete!/i)).toBeVisible({
    timeout: 15000,
  });
  await expect(
    page.getByText(/Transaction processed successfully/i),
  ).toBeVisible({ timeout: 15000 });

  console.log(
    JSON.stringify(
      {
        firstScanLatencyMs: firstLatencyMs,
        firstChargeAmount,
        secondScanLatencyMs: secondLatencyMs,
        secondChargeAmount,
        missingScanLatencyMs: missingLatencyMs,
        verdict:
          firstLatencyMs < 1200 &&
          secondLatencyMs < 1200 &&
          missingLatencyMs < 1200
            ? "scanner timing feels responsive"
            : "scanner timing is slower than expected",
      },
      null,
      2,
    ),
  );
});
