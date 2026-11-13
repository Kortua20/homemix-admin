import ExcelJS from "exceljs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SalesReport, StockReport } from "@/lib/accounting/data";
import { buildSalesWorkbook, buildStockWorkbook } from "@/lib/accounting/export";

// Round-trips the generated files through exceljs, the way Excel would read them.

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-11T06:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

async function load(buffer: ArrayBuffer | Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as ArrayBuffer);
  return workbook;
}

function summaryValues(workbook: ExcelJS.Workbook) {
  const rows = workbook.getWorksheet("შეჯამება")!.getSheetValues().filter(Boolean) as unknown[][];
  return rows.map((row) => row.slice(1));
}

const salesReport: SalesReport = {
  view: "sales",
  rows: [
    {
      id: "1", slug: "chair", name: "სკამი", categoryName: "სკამები", listingKind: "new_stocked",
      soldOn: "2026-11-11", quantity: 2, cost: 100, listTotal: 120, salePrice: 90,
      unitSalePrice: 45, discount: 30, profit: -10, margin: -10 / 90, note: "ორი სკამი",
    },
    {
      id: "2", slug: "table", name: "მუხის მაგიდა", categoryName: "მაგიდები", listingKind: "used_unique",
      soldOn: "2026-11-03", quantity: 1, cost: null, listTotal: 500, salePrice: 450,
      unitSalePrice: 450, discount: 50, profit: null, margin: null, note: null,
    },
  ],
  summary: {
    count: 2, units: 3, revenue: 540, cost: 100, missingCost: 1, profit: -10,
    profitBaseCount: 1, margin: -10 / 90, listTotal: 620, discountTotal: 80,
    unrecordedSoldCount: 6,
  },
};

describe("buildSalesWorkbook", () => {
  it("puts the summary first and the sales second", async () => {
    const workbook = await load(await buildSalesWorkbook(salesReport, { from: "2026-11-01", to: "2026-11-11" }));
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["შეჯამება", "გაყიდვები"]);
  });

  it("writes real dates, numbers and per-unit prices", async () => {
    const sheet = (await load(await buildSalesWorkbook(salesReport, { from: null, to: null })))
      .getWorksheet("გაყიდვები")!;

    const date = sheet.getCell("A2").value as Date;
    expect(date).toBeInstanceOf(Date);
    // A UTC-midnight date, so Excel shows the same calendar day in every timezone.
    expect(date.toISOString().slice(0, 10)).toBe("2026-11-11");
    expect(sheet.getCell("A2").numFmt).toBe("dd.mm.yyyy");
    expect(sheet.getCell("E2").value).toBe(2); // quantity
    expect(sheet.getCell("F2").value).toBe(100); // cost
    expect(sheet.getCell("F2").numFmt).toBe("#,##0.00");
    expect(sheet.getCell("H2").value).toBe(90); // paid in total
    expect(sheet.getCell("I2").value).toBe(45); // per unit
    expect(sheet.getCell("K2").value).toBe(-10); // profit
    expect(sheet.getCell("M2").value).toBe("ორი სკამი");
  });

  it("leaves an unknown cost blank so SUM skips it instead of counting 0", async () => {
    const sheet = (await load(await buildSalesWorkbook(salesReport, { from: null, to: null })))
      .getWorksheet("გაყიდვები")!;
    expect(sheet.getCell("F3").value).toBeNull();
    expect(sheet.getCell("K3").value).toBeNull();
  });

  it("totals with live SUM formulas, and not the per-unit column", async () => {
    const sheet = (await load(await buildSalesWorkbook(salesReport, { from: null, to: null })))
      .getWorksheet("გაყიდვები")!;
    expect(sheet.getCell("A4").value).toBe("სულ (2)");
    expect(sheet.getCell("E4").value).toEqual({ formula: "SUM(E2:E3)" });
    expect(sheet.getCell("K4").value).toEqual({ formula: "SUM(K2:K3)" });
    expect(sheet.getCell("I4").value).toBeNull();
  });

  it("states the period and what the totals leave out", async () => {
    const values = summaryValues(
      await load(await buildSalesWorkbook(salesReport, { from: "2026-11-01", to: "2026-11-11" })),
    );
    expect(values).toContainEqual(["პერიოდი", "01.11.2026 — 11.11.2026"]);
    expect(values).toContainEqual(["გაყიდული ცალი", 3]);
    expect(values.some((v) => String(v[0]).startsWith("6 პროდუქტი მონიშნულია"))).toBe(true);
    expect(values.some((v) => String(v[0]).startsWith("1 გაყიდვას შესყიდვის ფასი"))).toBe(true);
  });

  it("writes no SUM formula when there are no rows", async () => {
    const empty: SalesReport = { ...salesReport, rows: [], summary: { ...salesReport.summary, count: 0 } };
    const sheet = (await load(await buildSalesWorkbook(empty, { from: null, to: null })))
      .getWorksheet("გაყიდვები")!;
    expect(sheet.getCell("A2").value).toBe("სულ (0)");
    expect(sheet.getCell("E2").value).toBeNull();
  });
});

describe("buildStockWorkbook", () => {
  const stockReport: StockReport = {
    view: "stock",
    rows: [
      {
        id: "1", slug: "chair", name: "სკამი", categoryName: "სკამები", status: "available",
        listingKind: "new_stocked", createdOn: "2026-11-01", quantity: 3, purchasePrice: 50,
        listPrice: 60, costValue: 150, listValue: 180, potentialProfit: 30,
      },
    ],
    summary: { count: 1, units: 3, costValue: 150, missingPurchasePrice: 0, listValue: 180, potentialProfit: 30 },
  };

  it("lists stock with Georgian status labels and totals", async () => {
    const workbook = await load(await buildStockWorkbook(stockReport));
    const sheet = workbook.getWorksheet("მარაგი")!;
    expect(sheet.getCell("E2").value).toBe("ხელმისაწვდომი");
    expect(sheet.getCell("F2").value).toBe(3);
    expect(sheet.getCell("I2").value).toBe(150);
    expect(sheet.getCell("F3").value).toEqual({ formula: "SUM(F2:F2)" });
    expect(summaryValues(workbook)).toContainEqual(["მდგომარეობა", "11.11.2026"]);
  });
});
