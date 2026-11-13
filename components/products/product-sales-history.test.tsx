import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// The undo button posts to a server action; the action itself is tested in
// app/product/sale-actions.test.ts.
vi.mock("@/app/product/sale-actions", () => ({ deleteProductSale: vi.fn() }));

import { ProductSalesHistory } from "@/components/products/product-sales-history";
import type { ProductSale } from "@/components/products/types";

const sales: ProductSale[] = [
  {
    id: "s1", quantity: 2, totalPrice: 90, unitCost: 50, listUnitPrice: 60,
    soldOn: "2026-11-11", note: "ორი სკამი", createdAt: "2026-11-11T10:00:00Z",
  },
  {
    id: "s2", quantity: 1, totalPrice: 70, unitCost: null, listUnitPrice: 60,
    soldOn: "2026-11-02", note: null, createdAt: "2026-11-02T10:00:00Z",
  },
];

describe("ProductSalesHistory", () => {
  it("says when nothing has sold yet", () => {
    render(<ProductSalesHistory sales={[]} slug="chair" canUndo />);
    expect(screen.getByText("გაყიდვა ჯერ არ დაფიქსირებულა.")).toBeInTheDocument();
  });

  it("lists each sale with its total, list value and profit", () => {
    render(<ProductSalesHistory sales={sales} slug="chair" canUndo={false} />);
    expect(screen.getByText("11.11.2026 · 2 ცალი · 90.00 ₾")).toBeInTheDocument();
    expect(screen.getByText(/საიტის ფასით 120.00 ₾/)).toBeInTheDocument();
    expect(screen.getByText("-10.00 ₾")).toHaveClass("text-destructive-ink");
    expect(screen.getByText("ორი სკამი")).toBeInTheDocument();
  });

  it("shows an unknown profit as a dash", () => {
    render(<ProductSalesHistory sales={[sales[1]]} slug="chair" canUndo={false} />);
    expect(screen.getByText(/მოგება/)).toHaveTextContent("მოგება —");
  });

  it("offers undo, naming the sale, only for stocked items", () => {
    const { rerender } = render(<ProductSalesHistory sales={sales} slug="chair" canUndo />);
    expect(
      screen.getByRole("button", { name: "გაყიდვის გაუქმება: 11.11.2026 · 2 ცალი · 90.00 ₾" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /გაყიდვის გაუქმება/ })).toHaveLength(2);

    rerender(<ProductSalesHistory sales={sales} slug="chair" canUndo={false} />);
    expect(screen.queryByRole("button", { name: /გაყიდვის გაუქმება/ })).not.toBeInTheDocument();
  });
});
