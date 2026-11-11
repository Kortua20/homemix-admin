import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  readFinanceFields,
  readOptionalMoney,
  resolveUsedSaleDate,
  validateSaleDate,
} from "@/lib/accounting/sale-input";

// 10:00 in Tbilisi on 2026-11-11. Only Date is faked, so nothing else waits on timers.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-11T06:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("readOptionalMoney", () => {
  it("treats blank as not recorded", () => {
    expect(readOptionalMoney("")).toBeNull();
    expect(readOptionalMoney("   ")).toBeNull();
    expect(readOptionalMoney(null)).toBeNull();
  });

  it("accepts zero — a free pickup is a real cost", () => {
    expect(readOptionalMoney("0")).toBe(0);
  });

  it("rounds to the column's two decimals", () => {
    expect(readOptionalMoney("10.005")).toBe(10.01);
    expect(readOptionalMoney(" 45.5 ")).toBe(45.5);
  });

  it.each(["-1", "abc", "1e20", "Infinity"])("returns undefined for unusable input %s", (raw) => {
    expect(readOptionalMoney(raw)).toBeUndefined();
  });
});

describe("validateSaleDate", () => {
  it("accepts today and the past", () => {
    expect(validateSaleDate("2026-11-11")).toBeUndefined();
    expect(validateSaleDate("2020-05-01")).toBeUndefined();
  });

  it("rejects the future, impossible dates and mistyped years", () => {
    expect(validateSaleDate("2026-11-12")).toMatch(/მომავალში/);
    expect(validateSaleDate("2026-02-30")).toBeTruthy();
    expect(validateSaleDate("0026-11-11")).toBeTruthy();
  });
});

describe("readFinanceFields", () => {
  it("reads only the purchase price for a product that is not sold", () => {
    const { values, error } = readFinanceFields(
      form({ purchasePrice: "50", salePrice: "999", soldOn: "2026-11-01" }),
      "available",
      "used_unique",
    );
    expect(error).toBeUndefined();
    expect(values).toEqual({ purchasePrice: 50, usedSale: null });
  });

  it("reads the sale of a used item marked sold", () => {
    const { values } = readFinanceFields(
      form({ purchasePrice: "700", salePrice: "1000", soldOn: "2026-11-10" }),
      "sold",
      "used_unique",
    );
    expect(values).toEqual({
      purchasePrice: 700,
      usedSale: { totalPrice: 1000, soldOn: "2026-11-10" },
    });
  });

  it("ignores sale fields on a new item — its sales go through the stock function", () => {
    const { values } = readFinanceFields(
      form({ purchasePrice: "50", salePrice: "90", soldOn: "2026-11-10" }),
      "sold",
      "new_stocked",
    );
    expect(values.usedSale).toBeNull();
  });

  it("keeps a blank sale price as 'no sale recorded'", () => {
    const { values } = readFinanceFields(form({ salePrice: "" }), "sold", "used_unique");
    expect(values).toEqual({
      purchasePrice: null,
      usedSale: { totalPrice: null, soldOn: null },
    });
  });

  it.each([
    ["a negative purchase price", { purchasePrice: "-5" }, /შესყიდვის/],
    ["a negative sale price", { salePrice: "-5" }, /გაყიდვის ფასი/],
    ["a future sale date", { salePrice: "10", soldOn: "2027-01-01" }, /მომავალში/],
  ])("reports %s", (_label, fields, message) => {
    expect(readFinanceFields(form(fields), "sold", "used_unique").error).toMatch(message);
  });
});

describe("resolveUsedSaleDate", () => {
  const sale = (totalPrice: number | null, soldOn: string | null) => ({
    purchasePrice: null,
    usedSale: { totalPrice, soldOn },
  });

  it("uses the entered date", () => {
    expect(resolveUsedSaleDate(sale(100, "2026-11-01"), "available")).toEqual({
      soldOn: "2026-11-01",
    });
  });

  it("stamps today when an item is marked sold now without a date", () => {
    expect(resolveUsedSaleDate(sale(100, null), "available")).toEqual({
      soldOn: "2026-11-11",
    });
    expect(resolveUsedSaleDate(sale(100, null), null)).toEqual({ soldOn: "2026-11-11" });
  });

  it("refuses to guess the date of an item that was already sold", () => {
    const result = resolveUsedSaleDate(sale(100, null), "sold");
    expect(result.soldOn).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it("needs no date when there is no sale", () => {
    expect(resolveUsedSaleDate(sale(null, null), "sold")).toEqual({ soldOn: null });
    expect(resolveUsedSaleDate({ purchasePrice: 1, usedSale: null }, "sold")).toEqual({
      soldOn: null,
    });
  });
});
