import { expect, test } from "./support/fixtures";

// Selling a used (one-off) item through the product form: status → "გაყიდული", actual price
// and date, and the reverse when the sale falls through.

test("marking a used item sold records its bargained price; unmarking removes it", async ({
  page,
  catalog,
}) => {
  const table = await catalog.createUsedProduct({ price: 400, purchasePrice: 250 });

  await page.goto(`/product/${table.slug}/edit`);
  await page.getByLabel("სტატუსი").selectOption("sold");

  // The sale fields appear only now, dated today, with no price filled in for us.
  const salePrice = page.getByLabel("გაყიდვის ფასი (ფაქტიური)");
  await expect(salePrice).toHaveValue("");
  await expect(page.getByLabel("გაყიდვის თარიღი")).not.toHaveValue("");

  await salePrice.fill("350");
  await page.getByRole("button", { name: "ცვლილებების შენახვა" }).click();
  await page.waitForURL(`**/product/${table.slug}`);

  const finances = page.getByRole("region", { name: "შიდა ფინანსები" });
  await expect(finances).toContainText("250.00 ₾"); // purchase price
  await expect(finances).toContainText("350.00 ₾"); // revenue
  await expect(finances).toContainText("100.00 ₾"); // profit
  expect(await catalog.salesOf(table.id)).toEqual([
    { quantity: 1, total_price: 350, unit_cost: 250, list_unit_price: 400 },
  ]);

  // The sale falls through: back to available.
  await page.goto(`/product/${table.slug}/edit`);
  await page.getByLabel("სტატუსი").selectOption("available");
  await page.getByRole("button", { name: "ცვლილებების შენახვა" }).click();
  await page.waitForURL(`**/product/${table.slug}`);

  expect(await catalog.salesOf(table.id)).toEqual([]);
});

test("'იგივე, რაც ფასი' records a sale at the list price in one click", async ({
  page,
  catalog,
}) => {
  const table = await catalog.createUsedProduct({ price: 420 });

  await page.goto(`/product/${table.slug}/edit`);
  await page.getByLabel("სტატუსი").selectOption("sold");
  await page.getByRole("button", { name: "იგივე, რაც ფასი" }).click();
  await expect(page.getByLabel("გაყიდვის ფასი (ფაქტიური)")).toHaveValue("420");

  await page.getByRole("button", { name: "ცვლილებების შენახვა" }).click();
  await page.waitForURL(`**/product/${table.slug}`);
  expect(await catalog.salesOf(table.id)).toMatchObject([{ total_price: 420 }]);
});

test("an edit form left open cannot overwrite a sale made meanwhile", async ({
  page,
  catalog,
}) => {
  const chair = await catalog.createStockedProduct({ stock: 5 });
  await page.goto(`/product/${chair.slug}/edit`);

  const { createAdminClient } = await import("./support/local-supabase");
  await createAdminClient().from("products").update({ stock_quantity: 3 }).eq("id", chair.id);

  await page.getByRole("button", { name: "ცვლილებების შენახვა" }).click();

  await expect(page.getByRole("alert").filter({ hasText: "მარაგი შეიცვალა" })).toBeVisible();
  expect(await catalog.stockOf(chair.id)).toMatchObject({ stock: 3 });
});
