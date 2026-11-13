import { describe, expect, it } from "vitest";

import { getSalesReport, getStockReport } from "@/lib/accounting/data";
import { createFakeSupabase, hasOp, opArgs, type RecordedQuery } from "@/test/fake-supabase";

type SaleViewRow = {
  id: string;
  slug: string;
  name: string;
  listing_kind: string;
  category_name: string;
  quantity: number;
  total_price: number;
  unit_cost: number | null;
  list_unit_price: number;
  sold_on: string;
  note: string | null;
};

const sale = (overrides: Partial<SaleViewRow>): SaleViewRow => ({
  id: "s1",
  slug: "chair",
  name: "სკამი",
  listing_kind: "new_stocked",
  category_name: "სკამები",
  quantity: 1,
  total_price: 10,
  unit_cost: 5,
  list_unit_price: 10,
  sold_on: "2026-11-11",
  note: null,
  ...overrides,
});

// Answers the ledger query with `rows`, honouring .range() the way PostgREST does, and the
// "sold but unrecorded" count with `unrecorded`.
function salesClient(rows: SaleViewRow[], unrecorded = 0) {
  return createFakeSupabase((query) => {
    if (query.target === "product_sale_ledger") {
      const [from, to] = opArgs(query, "range") as [number, number];
      return { data: rows.slice(from, to + 1) };
    }
    if (query.target === "product_accounting") return { count: unrecorded };
    return {};
  });
}

describe("getSalesReport", () => {
  it("computes the 5-chairs example: 2 sold for 90 against a cost of 50 each", async () => {
    const fake = salesClient([
      sale({ quantity: 2, total_price: 90, unit_cost: 50, list_unit_price: 60, note: "ორი სკამი" }),
    ]);
    const { rows, summary } = await getSalesReport(fake.client, { from: null, to: null });

    expect(rows[0]).toMatchObject({
      quantity: 2,
      cost: 100,
      listTotal: 120,
      salePrice: 90,
      unitSalePrice: 45,
      discount: 30,
      profit: -10,
      note: "ორი სკამი",
    });
    expect(rows[0].margin).toBeCloseTo(-10 / 90);
    expect(summary).toMatchObject({
      count: 1,
      units: 2,
      revenue: 90,
      cost: 100,
      profit: -10,
      listTotal: 120,
      discountTotal: 30,
      missingCost: 0,
    });
  });

  it("treats an unknown cost as unknown: no profit, excluded from cost and margin", async () => {
    const fake = salesClient([
      sale({ id: "a", total_price: 450, unit_cost: 200, list_unit_price: 500 }),
      sale({ id: "b", total_price: 100, unit_cost: null, list_unit_price: 120 }),
    ]);
    const { rows, summary } = await getSalesReport(fake.client, { from: null, to: null });

    expect(rows[1].cost).toBeNull();
    expect(rows[1].profit).toBeNull();
    expect(rows[1].margin).toBeNull();
    // Revenue counts every sale; profit and margin only the one whose cost is known.
    expect(summary.revenue).toBe(550);
    expect(summary.cost).toBe(200);
    expect(summary.profit).toBe(250);
    expect(summary.profitBaseCount).toBe(1);
    expect(summary.missingCost).toBe(1);
    expect(summary.margin).toBeCloseTo(250 / 450);
  });

  it("sums money without floating-point drift", async () => {
    const fake = salesClient(
      Array.from({ length: 100 }, (_, i) =>
        sale({ id: `s${i}`, total_price: 0.1, unit_cost: 0, list_unit_price: 0.1 }),
      ),
    );
    const { summary } = await getSalesReport(fake.client, { from: null, to: null });
    expect(summary.revenue).toBe(10);
  });

  it("filters by the period's bounds in SQL", async () => {
    const fake = salesClient([]);
    await getSalesReport(fake.client, { from: "2026-11-01", to: "2026-11-11" });
    const [ledger] = fake.queriesFor("product_sale_ledger");
    expect(hasOp(ledger, "gte", "sold_on", "2026-11-01")).toBe(true);
    expect(hasOp(ledger, "lte", "sold_on", "2026-11-11")).toBe(true);
  });

  it("applies no date filter for 'all time'", async () => {
    const fake = salesClient([]);
    await getSalesReport(fake.client, { from: null, to: null });
    const [ledger] = fake.queriesFor("product_sale_ledger");
    expect(ledger.ops.some((op) => op.method === "gte" || op.method === "lte")).toBe(false);
  });

  it("pages past PostgREST's 1000-row cap instead of silently truncating", async () => {
    const rows = Array.from({ length: 2345 }, (_, i) => sale({ id: `s${i}`, total_price: 1 }));
    const fake = salesClient(rows);
    const { summary } = await getSalesReport(fake.client, { from: null, to: null });

    expect(summary.count).toBe(2345);
    expect(summary.revenue).toBe(2345);
    const ranges = fake.queriesFor("product_sale_ledger").map((q) => opArgs(q, "range"));
    expect(ranges).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("orders with an id tiebreak so pages cannot overlap", async () => {
    const fake = salesClient([]);
    await getSalesReport(fake.client, { from: null, to: null });
    const [ledger] = fake.queriesFor("product_sale_ledger");
    const orders = ledger.ops.filter((op) => op.method === "order").map((op) => op.args[0]);
    expect(orders).toEqual(["sold_on", "id"]);
  });

  it("counts products marked sold that have no recorded sale", async () => {
    const fake = salesClient([], 7);
    const { summary } = await getSalesReport(fake.client, { from: null, to: null });
    expect(summary.unrecordedSoldCount).toBe(7);

    const [count] = fake.queriesFor("product_accounting");
    expect(hasOp(count, "eq", "status", "sold")).toBe(true);
    expect(hasOp(count, "eq", "has_sales", false)).toBe(true);
  });

  it("throws rather than reporting partial totals when a query fails", async () => {
    const fake = createFakeSupabase((query: RecordedQuery) =>
      query.target === "product_sale_ledger" ? { error: { message: "boom" } } : {},
    );
    await expect(getSalesReport(fake.client, { from: null, to: null })).rejects.toThrow();
  });
});

describe("getStockReport", () => {
  function stockClient(rows: Record<string, unknown>[]) {
    return createFakeSupabase((query) =>
      query.target === "product_accounting" ? { data: rows } : {},
    );
  }

  const product = (overrides: Record<string, unknown>) => ({
    id: "p1",
    slug: "p",
    name: "პროდუქტი",
    status: "available",
    listing_kind: "used_unique",
    stock_quantity: null,
    price: 100,
    created_at: "2026-11-01T10:00:00Z",
    category_name: "კატ",
    purchase_price: 60,
    ...overrides,
  });

  it("values a used item as one unit and a new item by its stock", async () => {
    const fake = stockClient([
      product({ id: "used" }),
      product({ id: "new", listing_kind: "new_stocked", stock_quantity: 5, price: 60, purchase_price: 50 }),
    ]);
    const { rows, summary } = await getStockReport(fake.client);

    expect(rows.map((r) => [r.id, r.quantity, r.costValue, r.listValue, r.potentialProfit])).toEqual([
      ["used", 1, 60, 100, 40],
      ["new", 5, 250, 300, 50],
    ]);
    expect(summary).toMatchObject({ count: 2, units: 6, costValue: 310, listValue: 400, potentialProfit: 90 });
  });

  it("leaves out new items with nothing on the shelf", async () => {
    const fake = stockClient([product({ listing_kind: "new_stocked", stock_quantity: 0 })]);
    const { rows } = await getStockReport(fake.client);
    expect(rows).toHaveLength(0);
  });

  it("does not count a missing purchase price as free stock", async () => {
    const fake = stockClient([product({ purchase_price: null })]);
    const { rows, summary } = await getStockReport(fake.client);
    expect(rows[0].costValue).toBeNull();
    expect(rows[0].potentialProfit).toBeNull();
    expect(summary).toMatchObject({ costValue: 0, missingPurchasePrice: 1, listValue: 100 });
  });

  it("only asks for statuses that are still stock", async () => {
    const fake = stockClient([]);
    await getStockReport(fake.client);
    const [query] = fake.queriesFor("product_accounting");
    expect(hasOp(query, "in", "status", ["draft", "available", "reserved"])).toBe(true);
  });
});
