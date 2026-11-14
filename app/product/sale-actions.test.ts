import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createFakeSupabase, opArgs, type FakeHandler } from "@/test/fake-supabase";

// The server actions behind "გაყიდვის დაფიქსირება" and the undo button. Supabase, auth and
// revalidation are mocked at their module boundary; the stock arithmetic itself is the
// database function's job and is tested by pgTAP in the storefront repo.

const { revalidatePath, createClient } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/server", () => ({ createClient }));

import {
  deleteProductSale,
  recordProductSale,
  recordUsedSale,
  type SaleActionState,
} from "@/app/product/sale-actions";

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const SALE_ID = "22222222-2222-4222-8222-222222222222";
const idle: SaleActionState = { status: "idle", message: "" };

function signIn(claims: Record<string, unknown> | null, handler?: FakeHandler) {
  const fake = createFakeSupabase(handler);
  createClient.mockResolvedValue({
    ...fake.client,
    auth: {
      getClaims: async () => ({ data: claims ? { claims } : null, error: null }),
    },
  });
  return fake;
}

const STAFF = { sub: "staff-user", is_anonymous: false };

function saleForm(fields: Partial<Record<string, string>> = {}) {
  const data = new FormData();
  const values = {
    productId: PRODUCT_ID,
    slug: "chair",
    quantity: "2",
    totalPrice: "90",
    soldOn: "2026-11-11",
    note: "  ორი სკამი ",
    ...fields,
  };
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) data.set(key, value);
  }
  return data;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-11T06:00:00Z"));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
});

describe("recordProductSale", () => {
  it("calls record_product_sale with the parsed values and revalidates", async () => {
    const fake = signIn(STAFF);
    const result = await recordProductSale(idle, saleForm());

    expect(result.status).toBe("success");
    expect(result.message).toContain("2 ცალი");
    expect(result.message).toContain("90.00");
    const [rpc] = fake.queriesFor("rpc:record_product_sale");
    expect(opArgs(rpc, "rpc")).toEqual([
      {
        p_product_id: PRODUCT_ID,
        p_quantity: 2,
        p_total_price: 90,
        p_sold_on: "2026-11-11",
        p_note: "ორი სკამი",
      },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/product/chair");
    expect(revalidatePath).toHaveBeenCalledWith("/accounting");
  });

  it("records 0 as a real amount (a give-away)", async () => {
    const fake = signIn(STAFF);
    expect((await recordProductSale(idle, saleForm({ totalPrice: "0" }))).status).toBe("success");
    expect((opArgs(fake.queries[0], "rpc")![0] as { p_total_price: number }).p_total_price).toBe(0);
  });

  it.each([
    ["quantity", { quantity: "0" }],
    ["quantity", { quantity: "1.5" }],
    ["totalPrice", { totalPrice: "" }],
    ["totalPrice", { totalPrice: "-1" }],
    ["soldOn", { soldOn: "" }],
    ["soldOn", { soldOn: "2026-11-12" }],
    ["note", { note: "x".repeat(501) }],
  ])("rejects a bad %s before touching the database", async (field, fields) => {
    const fake = signIn(STAFF);
    const result = await recordProductSale(idle, saleForm(fields));

    expect(result.status).toBe("error");
    expect(result.fieldErrors).toHaveProperty(field);
    expect(fake.queries).toHaveLength(0);
  });

  it("rejects a malformed product id", async () => {
    signIn(STAFF);
    const result = await recordProductSale(idle, saleForm({ productId: "not-a-uuid" }));
    expect(result.status).toBe("error");
  });

  it.each([
    ["no session", null],
    ["an anonymous sign-in", { sub: "anon-user", is_anonymous: true }],
  ])("refuses %s", async (_label, claims) => {
    const fake = signIn(claims);
    const result = await recordProductSale(idle, saleForm());
    expect(result.status).toBe("error");
    expect(result.message).toMatch(/სესია/);
    expect(fake.queries).toHaveLength(0);
  });

  it.each([
    ["insufficient_stock", /მარაგში ამდენი ცალი არ არის/],
    ["not_stocked_product", /ტიპი შეიცვალა/],
    ["product_not_found", /ვერ მოიძებნა/],
    ["something unexpected", /ვერ შესრულდა/],
  ])("explains a database error: %s", async (message, expected) => {
    signIn(STAFF, () => ({ error: { message } }));
    const result = await recordProductSale(idle, saleForm());
    expect(result.status).toBe("error");
    expect(result.message).toMatch(expected);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("does not revalidate an arbitrary path from a tampered slug", async () => {
    signIn(STAFF);
    await recordProductSale(idle, saleForm({ slug: "../../etc" }));
    expect(revalidatePath).not.toHaveBeenCalledWith(expect.stringContaining(".."));
  });
});

describe("recordUsedSale", () => {
  function usedForm(fields: Partial<Record<string, string>> = {}) {
    const data = new FormData();
    const values = {
      productId: PRODUCT_ID,
      slug: "oak-table",
      totalPrice: "350",
      soldOn: "2026-11-11",
      note: "",
      ...fields,
    };
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined) data.set(key, value);
    }
    return data;
  }

  it("calls record_used_sale with the price and date, without a quantity", async () => {
    const fake = signIn(STAFF);
    const result = await recordUsedSale(idle, usedForm());

    expect(result.status).toBe("success");
    expect(result.message).toContain("350.00");
    expect(opArgs(fake.queriesFor("rpc:record_used_sale")[0], "rpc")).toEqual([
      { p_product_id: PRODUCT_ID, p_total_price: 350, p_sold_on: "2026-11-11", p_note: undefined },
    ]);
    expect(fake.queriesFor("rpc:record_product_sale")).toHaveLength(0);
    expect(revalidatePath).toHaveBeenCalledWith("/product/oak-table");
  });

  it.each([
    ["totalPrice", { totalPrice: "" }],
    ["soldOn", { soldOn: "" }],
    ["soldOn", { soldOn: "2026-11-12" }],
  ])("rejects a missing or bad %s before touching the database", async (field, fields) => {
    const fake = signIn(STAFF);
    const result = await recordUsedSale(idle, usedForm(fields));
    expect(result.fieldErrors).toHaveProperty(field);
    expect(fake.queries).toHaveLength(0);
  });

  it("refuses without a staff session", async () => {
    const fake = signIn(null);
    expect((await recordUsedSale(idle, usedForm())).message).toMatch(/სესია/);
    expect(fake.queries).toHaveLength(0);
  });

  it.each([
    ["already_sold", /უკვე გაყიდულია/],
    ["not_sellable", /დაარქივებული/],
    ["not_used_product", /ტიპი შეიცვალა/],
  ])("explains a database refusal: %s", async (message, expected) => {
    signIn(STAFF, () => ({ error: { message } }));
    const result = await recordUsedSale(idle, usedForm());
    expect(result.status).toBe("error");
    expect(result.message).toMatch(expected);
  });
});

describe("deleteProductSale", () => {
  function undoForm(saleId = SALE_ID) {
    const data = new FormData();
    data.set("saleId", saleId);
    data.set("slug", "chair");
    return data;
  }

  it("calls delete_product_sale and revalidates", async () => {
    const fake = signIn(STAFF);
    const result = await deleteProductSale(idle, undoForm());

    expect(result.status).toBe("success");
    expect(opArgs(fake.queriesFor("rpc:delete_product_sale")[0], "rpc")).toEqual([
      { p_sale_id: SALE_ID },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/product/chair");
  });

  it("rejects a malformed sale id", async () => {
    const fake = signIn(STAFF);
    expect((await deleteProductSale(idle, undoForm("x"))).status).toBe("error");
    expect(fake.queries).toHaveLength(0);
  });

  it("explains a sale that no longer exists", async () => {
    signIn(STAFF, () => ({ error: { message: "sale_not_found" } }));
    const result = await deleteProductSale(idle, undoForm());
    expect(result.message).toMatch(/ვერ მოიძებნა/);
  });
});
