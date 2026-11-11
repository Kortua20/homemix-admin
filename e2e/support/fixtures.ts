import { randomBytes } from "node:crypto";

import { test as base, expect } from "@playwright/test";

import { createAdminClient } from "./local-supabase";

// Per-test catalog data. Each test gets its own category and products with unique slugs, so
// tests never depend on seed.sql, never collide with each other, and never touch real rows.
// Everything created is removed afterwards — sales first, because product_sales restricts
// deleting a product that has sales.

type ProductOptions = { price?: number; purchasePrice?: number | null; stock?: number; status?: string };

export type TestProduct = { id: string; slug: string; name: string; price: number };

type Catalog = {
  createStockedProduct: (options?: ProductOptions) => Promise<TestProduct>;
  createUsedProduct: (options?: ProductOptions) => Promise<TestProduct>;
  stockOf: (productId: string) => Promise<{ stock: number | null; status: string }>;
  salesOf: (productId: string) => Promise<
    { quantity: number; total_price: number; unit_cost: number | null; list_unit_price: number }[]
  >;
};

export const test = base.extend<{ catalog: Catalog }>({
  // `provide` is Playwright's `use` callback, renamed so it is not mistaken for React's use().
  catalog: async ({}, provide) => {
    const admin = createAdminClient();
    const runId = randomBytes(4).toString("hex");
    const productIds: string[] = [];
    let counter = 0;

    const { data: category, error: categoryError } = await admin
      .from("categories")
      .insert({ slug: `e2e-${runId}`, name: `E2E ${runId}`, description: "" })
      .select("id")
      .single();
    if (categoryError) throw categoryError;

    const { data: grade } = await admin
      .from("condition_grades")
      .select("code")
      .order("sort_order")
      .limit(1)
      .single();

    async function insertProduct(kind: "new_stocked" | "used_unique", options: ProductOptions) {
      counter += 1;
      const price = options.price ?? 60;
      const slug = `e2e-${runId}-${kind === "new_stocked" ? "chair" : "table"}-${counter}`;
      const name = `E2E ${kind === "new_stocked" ? "სკამი" : "მაგიდა"} ${runId}-${counter}`;

      const { data, error } = await admin
        .from("products")
        .insert({
          slug,
          name,
          price,
          category_id: category!.id,
          listing_kind: kind,
          status: options.status ?? "available",
          stock_quantity: kind === "new_stocked" ? (options.stock ?? 5) : null,
          condition_grade: kind === "used_unique" ? grade?.code ?? null : null,
          published_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;
      productIds.push(data.id);

      if (options.purchasePrice !== null) {
        const { error: financeError } = await admin
          .from("product_finances")
          .insert({ product_id: data.id, purchase_price: options.purchasePrice ?? 50 });
        if (financeError) throw financeError;
      }

      return { id: data.id, slug, name, price };
    }

    await provide({
      createStockedProduct: (options = {}) => insertProduct("new_stocked", options),
      createUsedProduct: (options = {}) => insertProduct("used_unique", { price: 400, ...options }),
      stockOf: async (productId) => {
        const { data, error } = await admin
          .from("products")
          .select("stock_quantity, status")
          .eq("id", productId)
          .single();
        if (error) throw error;
        return { stock: data.stock_quantity, status: data.status };
      },
      salesOf: async (productId) => {
        const { data, error } = await admin
          .from("product_sales")
          .select("quantity, total_price, unit_cost, list_unit_price")
          .eq("product_id", productId);
        if (error) throw error;
        return (data ?? []).map((row) => ({
          quantity: row.quantity,
          total_price: Number(row.total_price),
          unit_cost: row.unit_cost === null ? null : Number(row.unit_cost),
          list_unit_price: Number(row.list_unit_price),
        }));
      },
    });

    if (productIds.length > 0) {
      await admin.from("product_sales").delete().in("product_id", productIds);
      await admin.from("products").delete().in("id", productIds);
    }
    await admin.from("categories").delete().eq("id", category!.id);
  },
});

export { expect };
