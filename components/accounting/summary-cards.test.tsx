import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  DataNotice,
  SalesSummaryCards,
  StockSummaryCards,
  salesNoticeItems,
  stockNoticeItems,
} from "@/components/accounting/summary-cards";
import type { SalesSummary, StockSummary } from "@/lib/accounting/data";

const sales: SalesSummary = {
  count: 1, units: 2, revenue: 90, cost: 100, missingCost: 0, profit: -10, profitBaseCount: 1,
  margin: -10 / 90, listTotal: 120, discountTotal: 30, unrecordedSoldCount: 0,
};

describe("SalesSummaryCards", () => {
  it("shows revenue, cost, profit with margin, and the bargaining discount", () => {
    render(<SalesSummaryCards summary={sales} />);
    expect(screen.getByText("90.00 ₾")).toBeInTheDocument();
    expect(screen.getByText("1 გაყიდვა · 2 ცალი")).toBeInTheDocument();
    expect(screen.getByText("100.00 ₾")).toBeInTheDocument();
    expect(screen.getByText("მარჟა -11.1%")).toBeInTheDocument();
    expect(screen.getByText("ვაჭრობით დათმობილი")).toBeInTheDocument();
    expect(screen.getByText("30.00 ₾")).toBeInTheDocument();
    expect(screen.getByText("საიტის ფასით იქნებოდა 120.00 ₾")).toBeInTheDocument();
  });

  it("marks a loss visibly", () => {
    render(<SalesSummaryCards summary={sales} />);
    expect(screen.getByText("-10.00 ₾")).toHaveClass("text-destructive-ink");
  });

  it("labels a sale above the site price as such rather than as a negative discount", () => {
    render(<SalesSummaryCards summary={{ ...sales, discountTotal: -15 }} />);
    expect(screen.getByText("საიტის ფასზე მეტი")).toBeInTheDocument();
    expect(screen.getByText("15.00 ₾")).toBeInTheDocument();
  });

  it("says what profit was computed over when some costs are unknown", () => {
    render(<SalesSummaryCards summary={{ ...sales, count: 3, profitBaseCount: 1 }} />);
    expect(screen.getByText(/დათვლილია 3-დან 1 ნივთზე/)).toBeInTheDocument();
  });
});

describe("sales notices", () => {
  it("has nothing to say when the data is complete", () => {
    const { container } = render(<DataNotice items={salesNoticeItems(sales)} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("flags products marked sold with no sale, and links to them", () => {
    render(<DataNotice items={salesNoticeItems({ ...sales, unrecordedSoldCount: 7 })} />);
    expect(screen.getByRole("note")).toHaveTextContent("7 პროდუქტი მონიშნულია გაყიდულად");
    expect(screen.getByRole("link", { name: "გაყიდული პროდუქტების ნახვა" })).toHaveAttribute(
      "href",
      "/dashboard?status=sold",
    );
  });

  it("flags sales whose cost was unknown", () => {
    render(<DataNotice items={salesNoticeItems({ ...sales, missingCost: 2, profitBaseCount: 5 })} />);
    expect(screen.getByRole("note")).toHaveTextContent("2 გაყიდვას შესყიდვის ფასი არ ჰქონდა");
    expect(screen.getByRole("note")).toHaveTextContent("5 გაყიდვაზე");
  });
});

describe("stock cards and notices", () => {
  const stock: StockSummary = {
    count: 83, units: 178, costValue: 700, missingPurchasePrice: 82, listValue: 155462.44, potentialProfit: 403,
  };

  it("shows units, both valuations and potential profit", () => {
    render(<StockSummaryCards summary={stock} />);
    expect(screen.getByText("178 ერთეული")).toBeInTheDocument();
    expect(screen.getByText("83 პროდუქტი")).toBeInTheDocument();
    expect(screen.getByText("155,462.44 ₾")).toBeInTheDocument();
    expect(screen.getByText(/მხოლოდ შესყიდვის ფასიან 1 პროდუქტზე/)).toBeInTheDocument();
  });

  it("flags stock with no purchase price", () => {
    render(<DataNotice items={stockNoticeItems(stock)} />);
    expect(screen.getByRole("note")).toHaveTextContent("82 პროდუქტს შესყიდვის ფასი არ აქვს");
  });
});
