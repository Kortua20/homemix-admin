import { expect, test } from "./support/fixtures";

// The accounting page itself: navigation, periods, the stock view. Its numbers are tested
// with real sales in stocked-sales.spec.ts.

test("is reachable from the sidebar and opens on the current month", async ({ page }) => {
  await page.goto("/dashboard");
  await page
    .getByRole("navigation", { name: "მთავარი ნავიგაცია" })
    .getByRole("link", { name: "ბუღალტერია" })
    .click();

  await expect(page).toHaveURL(/\/accounting$/);
  await expect(page.getByRole("heading", { level: 1, name: "ბუღალტერია" })).toBeVisible();
  await expect(page.getByRole("link", { name: "მიმდინარე თვე" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByText("შიდა ინფორმაცია — საიტზე არ ჩანს.")).toBeVisible();
});

test("switches between period presets through the URL", async ({ page }) => {
  await page.goto("/accounting");
  await page.getByRole("link", { name: "ბოლო 7 დღე" }).click();

  await expect(page).toHaveURL(/period=7d/);
  await expect(page.getByRole("link", { name: "ბოლო 7 დღე" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("status").filter({ hasText: "ნაჩვენებია" })).toContainText(" — ");

  await page.getByRole("link", { name: "მთელი პერიოდი" }).click();
  await expect(page.getByRole("status").filter({ hasText: "ნაჩვენებია" })).toContainText(
    "მთელი პერიოდი",
  );
});

test("filters by a custom date range", async ({ page }) => {
  await page.goto("/accounting");
  await page.getByLabel("დან", { exact: true }).fill("2026-10-01");
  await page.getByLabel("მდე", { exact: true }).fill("2026-10-31");
  await page.getByRole("button", { name: "თარიღებით ჩვენება" }).click();

  await expect(page).toHaveURL(/period=custom&from=2026-10-01&to=2026-10-31/);
  await expect(page.getByRole("status").filter({ hasText: "ნაჩვენებია" })).toContainText(
    "01.10.2026 — 31.10.2026",
  );
});

test("the stock view values a product by its quantity and purchase price", async ({
  page,
  catalog,
}) => {
  const chair = await catalog.createStockedProduct({ price: 60, purchasePrice: 50, stock: 4 });

  await page.goto("/accounting?view=stock");
  await expect(page.getByRole("link", { name: "მარაგი", exact: true })).toHaveAttribute("aria-current", "page");

  const row = page.getByRole("row").filter({ hasText: chair.name });
  await expect(row).toContainText("200.00 ₾"); // at cost: 4 × 50
  await expect(row).toContainText("240.00 ₾"); // at the site price: 4 × 60
  await expect(row).toContainText("40.00 ₾"); // potential profit

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Excel-ში ექსპორტი" }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/^homemix-stock-\d{4}-\d{2}-\d{2}\.xlsx$/);
});
