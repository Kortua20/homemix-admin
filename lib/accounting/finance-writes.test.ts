import { describe, expect, it } from "vitest";

import { syncUsedSale, writePurchasePrice } from "@/lib/accounting/finance-writes";
import type { FinanceInput } from "@/lib/accounting/sale-input";
import { createFakeSupabase, hasOp, opArgs } from "@/test/fake-supabase";

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";

// A used item whose sale fields hold a price; `existingSaleIds` is what the product_sales
// read returns.
function setup(existingSaleIds: string[] = []) {
  return createFakeSupabase((query) => {
    if (query.target === "product_sales" && hasOp(query, "select", "id")) {
      return { data: existingSaleIds.map((id) => ({ id })) };
    }
    return {};
  });
}

const soldInput: FinanceInput = {
  purchasePrice: 700,
  usedSale: { totalPrice: 1000, soldOn: "2026-11-11" },
};

const baseArgs = {
  productId: PRODUCT_ID,
  listingKind: "used_unique",
  previousKind: "used_unique",
  listPrice: 1103,
  input: soldInput,
  soldOn: "2026-11-11",
};

describe("writePurchasePrice", () => {
  it("upserts one row per product, keyed on product_id", async () => {
    const fake = createFakeSupabase();
    const error = await writePurchasePrice(fake.client, PRODUCT_ID, 50);

    expect(error).toBeNull();
    const [query] = fake.queriesFor("product_finances");
    const [row, options] = opArgs(query, "upsert") as [Record<string, unknown>, unknown];
    expect(row).toMatchObject({ product_id: PRODUCT_ID, purchase_price: 50 });
    expect(options).toEqual({ onConflict: "product_id" });
  });

  it("writes null for an unrecorded cost rather than 0", async () => {
    const fake = createFakeSupabase();
    await writePurchasePrice(fake.client, PRODUCT_ID, null);
    const [row] = opArgs(fake.queries[0], "upsert") as [Record<string, unknown>];
    expect(row.purchase_price).toBeNull();
  });
});

describe("syncUsedSale", () => {
  it("inserts a single-unit sale with the cost and list price snapshotted", async () => {
    const fake = setup();
    expect(await syncUsedSale(fake.client, baseArgs)).toBeNull();

    const insert = fake.queriesFor("product_sales").find((q) => hasOp(q, "insert"));
    expect(opArgs(insert!, "insert")).toEqual([
      {
        product_id: PRODUCT_ID,
        quantity: 1,
        total_price: 1000,
        unit_cost: 700,
        list_unit_price: 1103,
        sold_on: "2026-11-11",
      },
    ]);
  });

  it("updates the existing sale instead of adding a second one", async () => {
    const fake = setup(["sale-1"]);
    await syncUsedSale(fake.client, baseArgs);

    const writes = fake.queriesFor("product_sales").filter((q) => !hasOp(q, "select", "id"));
    expect(writes).toHaveLength(1);
    expect(hasOp(writes[0], "update")).toBe(true);
    expect(hasOp(writes[0], "eq", "id", "sale-1")).toBe(true);
  });

  it("removes the sale when the item is no longer sold", async () => {
    const fake = setup(["sale-1"]);
    await syncUsedSale(fake.client, {
      ...baseArgs,
      input: { purchasePrice: 700, usedSale: null },
      soldOn: null,
    });

    const del = fake.queriesFor("product_sales").find((q) => hasOp(q, "delete"));
    expect(del).toBeDefined();
    expect(hasOp(del!, "eq", "product_id", PRODUCT_ID)).toBe(true);
  });

  it("writes nothing when there is no sale and none is recorded", async () => {
    const fake = setup([]);
    await syncUsedSale(fake.client, { ...baseArgs, input: { purchasePrice: 1, usedSale: null }, soldOn: null });
    expect(fake.queriesFor("product_sales")).toHaveLength(1); // the read only
  });

  it("never touches the sales of a new (stocked) item", async () => {
    const fake = setup(["sale-1", "sale-2"]);
    await syncUsedSale(fake.client, { ...baseArgs, listingKind: "new_stocked" });
    expect(fake.queries).toHaveLength(0);
  });

  it("never touches the sales history of an item that was new before this save", async () => {
    const fake = setup(["sale-1", "sale-2"]);
    await syncUsedSale(fake.client, {
      ...baseArgs,
      previousKind: "new_stocked",
      input: { purchasePrice: 1, usedSale: null },
      soldOn: null,
    });
    expect(fake.queries).toHaveLength(0);
  });

  it("returns a read error instead of writing blind", async () => {
    const failure = { code: "XX000", message: "boom" };
    const fake = createFakeSupabase(() => ({ error: failure }));
    expect(await syncUsedSale(fake.client, baseArgs)).toBe(failure);
    expect(fake.queries).toHaveLength(1);
  });
});
