import ExcelJS from "exceljs";

import { expect, test } from "./support/fixtures";

// Selling a new (stocked) item from its product page: the 5-chairs example end to end —
// browser form → server action → record_product_sale → stock, sale history, accounting page
// and Excel export — and back again with undo.

test("records a bargained multi-unit sale, reports it, exports it and undoes it", async ({
  page,
  catalog,
}) => {
  const chair = await catalog.createStockedProduct({ price: 60, purchasePrice: 50, stock: 5 });

  // --- Record: 2 chairs for 90 in total ---------------------------------------------------
  await page.goto(`/product/${chair.slug}`);
  const quantity = page.getByLabel("რაოდენობა", { exact: true });
  await quantity.fill("2");
  await page.getByLabel("გადახდილი თანხა (ჯამში)").fill("90");

  // The preview catches a typo before it reaches the books.
  await expect(page.getByText(/ერთეულის ფასი/)).toContainText("45.00 ₾");
  await expect(page.getByText(/ერთეულის ფასი/)).toContainText("-10.00 ₾");

  await page.getByRole("button", { name: "გაყიდვის დაფიქსირება" }).click();
  await expect(page.getByRole("status").filter({ hasText: "გაყიდვა დაფიქსირდა" })).toBeVisible();

  // The page re-renders with the new stock and the sale in its history.
  await expect(page.getByText("მარაგშია: 3 ცალი")).toBeVisible();
  await expect(page.getByText(/2 ცალი · 90\.00 ₾/)).toBeVisible();

  expect(await catalog.stockOf(chair.id)).toEqual({ stock: 3, status: "available" });
  expect(await catalog.salesOf(chair.id)).toEqual([
    { quantity: 2, total_price: 90, unit_cost: 50, list_unit_price: 60 },
  ]);

  // --- Accounting page ---------------------------------------------------------------------
  await page.goto("/accounting?view=sales&period=all");
  const row = page.getByRole("row").filter({ hasText: chair.name });
  await expect(row).toContainText("100.00 ₾"); // cost: 2 × 50
  await expect(row).toContainText("120.00 ₾"); // at the site price: 2 × 60
  await expect(row).toContainText("45.00 ₾ / ც.");
  await expect(row).toContainText("-10.00 ₾"); // profit

  // --- Excel export --------------------------------------------------------------------------
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Excel-ში ექსპორტი" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("homemix-sales-all.xlsx");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(await download.path());
  const sheet = workbook.getWorksheet("გაყიდვები")!;
  let exported: ExcelJS.Row | undefined;
  sheet.eachRow((candidate) => {
    if (candidate.getCell(2).value === chair.name) exported = candidate;
  });
  expect(exported, "the sale is in the exported file").toBeDefined();
  expect(exported!.getCell(5).value).toBe(2); // quantity
  expect(exported!.getCell(8).value).toBe(90); // paid
  expect(exported!.getCell(11).value).toBe(-10); // profit

  // --- Undo -----------------------------------------------------------------------------------
  await page.goto(`/product/${chair.slug}`);
  await page.getByRole("button", { name: /^გაყიდვის გაუქმება:/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("ნივთები მარაგში დაბრუნდება");
  await dialog.getByRole("button", { name: "წაშლა" }).click();

  // The page re-renders without the sale, which takes its undo button — and the dialog — with
  // it, so the visible result is the history entry gone and the units back.
  await expect(dialog).toBeHidden();
  await expect(page.getByText(/2 ცალი · 90\.00 ₾/)).toBeHidden();
  await expect(page.getByText("მარაგშია: 5 ცალი")).toBeVisible();

  expect(await catalog.stockOf(chair.id)).toEqual({ stock: 5, status: "available" });
  expect(await catalog.salesOf(chair.id)).toEqual([]);
});

test("selling the last units sells the item out", async ({ page, catalog }) => {
  const chair = await catalog.createStockedProduct({ stock: 2 });

  await page.goto(`/product/${chair.slug}`);
  await page.getByLabel("რაოდენობა", { exact: true }).fill("2");
  await page.getByLabel("გადახდილი თანხა (ჯამში)").fill("100");
  await page.getByRole("button", { name: "გაყიდვის დაფიქსირება" }).click();

  await expect(page.getByText(/მარაგი ამოიწურა/)).toBeVisible();
  expect(await catalog.stockOf(chair.id)).toEqual({ stock: 0, status: "sold" });
});

test("refuses a sale when the stock ran out after the page was opened", async ({
  page,
  catalog,
}) => {
  const chair = await catalog.createStockedProduct({ stock: 5 });
  await page.goto(`/product/${chair.slug}`);

  // Someone else sells 4 in the meantime.
  const { createAdminClient } = await import("./support/local-supabase");
  await createAdminClient().from("products").update({ stock_quantity: 1 }).eq("id", chair.id);

  await page.getByLabel("რაოდენობა", { exact: true }).fill("2");
  await page.getByLabel("გადახდილი თანხა (ჯამში)").fill("90");
  await page.getByRole("button", { name: "გაყიდვის დაფიქსირება" }).click();

  // Filtered: Next.js also renders an (empty) role="alert" route announcer.
  await expect(
    page.getByRole("alert").filter({ hasText: "მარაგში ამდენი ცალი არ არის" }),
  ).toBeVisible();
  expect(await catalog.stockOf(chair.id)).toEqual({ stock: 1, status: "available" });
  expect(await catalog.salesOf(chair.id)).toEqual([]);
});

test("a product with recorded sales cannot be deleted", async ({ page, catalog }) => {
  const chair = await catalog.createStockedProduct();
  await page.goto(`/product/${chair.slug}`);
  await page.getByLabel("გადახდილი თანხა (ჯამში)").fill("60");
  await page.getByRole("button", { name: "გაყიდვის დაფიქსირება" }).click();
  await expect(page.getByRole("status").filter({ hasText: "გაყიდვა დაფიქსირდა" })).toBeVisible();

  await page.getByRole("button", { name: "წაშლა", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "წაშლა" }).click();

  await expect(dialog).toContainText("წაშლის ნაცვლად დააარქივეთ");
  expect(await catalog.stockOf(chair.id)).toMatchObject({ stock: 4 });
});
