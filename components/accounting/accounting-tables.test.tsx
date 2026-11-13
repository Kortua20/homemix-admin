import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SalesTable, StockTable } from "@/components/accounting/accounting-tables";
import type { SaleRow, SalesSummary, StockRow, StockSummary } from "@/lib/accounting/data";

const chairs: SaleRow = {
  id: "1", slug: "chair", name: "სკამი", categoryName: "სკამები", listingKind: "new_stocked",
  soldOn: "2026-11-11", quantity: 2, cost: 100, listTotal: 120, salePrice: 90,
  unitSalePrice: 45, discount: 30, profit: -10, margin: -10 / 90, note: "ორი სკამი",
};
const table: SaleRow = {
  id: "2", slug: "table", name: "მაგიდა", categoryName: "მაგიდები", listingKind: "used_unique",
  soldOn: "2026-11-03", quantity: 1, cost: null, listTotal: 500, salePrice: 450,
  unitSalePrice: 450, discount: 50, profit: null, margin: null, note: null,
};
const salesSummary: SalesSummary = {
  count: 2, units: 3, revenue: 540, cost: 100, missingCost: 1, profit: -10, profitBaseCount: 1,
  margin: -10 / 90, listTotal: 620, discountTotal: 80, unrecordedSoldCount: 0,
};

const cellTexts = (row: HTMLElement) =>
  within(row).getAllByRole("cell").map((cell) => cell.textContent?.trim());

describe("SalesTable", () => {
  it("renders one row per sale with every money column as a row total", () => {
    render(<SalesTable rows={[chairs, table]} summary={salesSummary} />);
    const [, chairsRow] = screen.getAllByRole("row");

    expect(cellTexts(chairsRow)).toEqual([
      "11.11.2026",
      expect.stringContaining("სკამი"),
      "2",
      "100.00 ₾",
      "120.00 ₾",
      expect.stringContaining("90.00 ₾"),
      "30.00 ₾",
      "-10.00 ₾",
      "-11.1%",
    ]);
    // Multi-unit sales also show the per-unit price.
    expect(within(chairsRow).getByText("45.00 ₾ / ც.")).toBeInTheDocument();
    expect(within(chairsRow).getByText(/ორი სკამი/)).toBeInTheDocument();
  });

  it("shows an unknown cost and profit as a dash, explained on hover", () => {
    render(<SalesTable rows={[table]} summary={salesSummary} />);
    const [, row] = screen.getAllByRole("row");
    const dashes = within(row).getAllByTitle("არ არის მითითებული");
    expect(dashes).toHaveLength(2); // cost and profit
    expect(within(row).queryByText("/ ც.", { exact: false })).not.toBeInTheDocument();
  });

  it("links each product to its admin page", () => {
    render(<SalesTable rows={[chairs]} summary={salesSummary} />);
    expect(screen.getByRole("link", { name: "სკამი" })).toHaveAttribute("href", "/product/chair");
  });

  it("totals from the same summary the cards use", () => {
    render(<SalesTable rows={[chairs, table]} summary={salesSummary} />);
    const footer = screen.getAllByRole("row").at(-1)!;
    expect(within(footer).getByRole("rowheader")).toHaveTextContent("სულ · 2 გაყიდვა");
    expect(cellTexts(footer)).toEqual([
      "3", "100.00 ₾", "620.00 ₾", "540.00 ₾", "80.00 ₾", "-10.00 ₾", "-11.1%",
    ]);
  });
});

describe("StockTable", () => {
  const stockRow: StockRow = {
    id: "1", slug: "chair", name: "სკამი", categoryName: "სკამები", status: "available",
    listingKind: "new_stocked", createdOn: "2026-11-01", quantity: 3, purchasePrice: 50,
    listPrice: 60, costValue: 150, listValue: 180, potentialProfit: 30,
  };
  const stockSummary: StockSummary = {
    count: 1, units: 3, costValue: 150, missingPurchasePrice: 0, listValue: 180, potentialProfit: 30,
  };

  it("renders quantities, unit prices, values and a status badge", () => {
    render(<StockTable rows={[stockRow]} summary={stockSummary} />);
    const [, row] = screen.getAllByRole("row");
    expect(within(row).getByText("ხელმისაწვდომი")).toBeInTheDocument();
    expect(cellTexts(row).slice(3)).toEqual([
      "3", "50.00 ₾", "60.00 ₾", "150.00 ₾", "180.00 ₾", "30.00 ₾",
    ]);
  });

  it("totals units and values but not the per-unit columns", () => {
    render(<StockTable rows={[stockRow]} summary={stockSummary} />);
    const footer = screen.getAllByRole("row").at(-1)!;
    expect(cellTexts(footer)).toEqual(["3", "", "", "150.00 ₾", "180.00 ₾", "30.00 ₾"]);
  });
});
