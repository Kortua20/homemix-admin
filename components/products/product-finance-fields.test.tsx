import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProductFinanceFields } from "@/components/products/product-finance-fields";
import type { ProductSale } from "@/components/products/types";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-11T06:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

const recordedSale: ProductSale = {
  id: "sale-1",
  quantity: 1,
  totalPrice: 950,
  unitCost: 700,
  listUnitPrice: 1103,
  soldOn: "2026-11-05",
  note: null,
  createdAt: "2026-11-05T10:00:00Z",
};

// Rendered inside a form with a list-price input, as in ProductForm, so "იგივე, რაც ფასი"
// has a price field to copy from.
function renderInForm(ui: React.ReactElement, listPrice = "1103") {
  return render(
    <form>
      <input name="price" defaultValue={listPrice} aria-label="ფასი" />
      {ui}
    </form>,
  );
}

// A prefix match: when required, the label also carries the visual "*" (aria-hidden).
const salePrice = () => screen.queryByLabelText(/^გაყიდვის ფასი \(ფაქტიური\)/);
const saleDate = () => screen.queryByLabelText("გაყიდვის თარიღი");

describe("ProductFinanceFields", () => {
  it("always offers the purchase price, prefilled from the saved value", () => {
    renderInForm(
      <ProductFinanceFields finances={{ purchasePrice: 700 }} listingKind="used_unique" status="available" />,
    );
    expect(screen.getByLabelText("შესყიდვის ფასი")).toHaveValue(700);
  });

  it("hides the sale fields until a used item is marked sold", () => {
    renderInForm(<ProductFinanceFields listingKind="used_unique" status="available" />);
    expect(salePrice()).not.toBeInTheDocument();
    expect(saleDate()).not.toBeInTheDocument();
  });

  it("shows the sale fields, dated today, when a used item is marked sold now", () => {
    renderInForm(<ProductFinanceFields listingKind="used_unique" status="sold" savedStatus="available" />);
    expect(salePrice()).toHaveValue(null);
    expect(saleDate()).toHaveValue("2026-11-11");
    expect(saleDate()).toHaveAttribute("max", "2026-11-11");
  });

  it("does not guess today for an item that was already sold before", () => {
    renderInForm(<ProductFinanceFields listingKind="used_unique" status="sold" savedStatus="sold" />);
    expect(saleDate()).toHaveValue("");
  });

  it("prefills a recorded sale", () => {
    renderInForm(
      <ProductFinanceFields listingKind="used_unique" status="sold" savedStatus="sold" sale={recordedSale} />,
    );
    expect(salePrice()).toHaveValue(950);
    expect(saleDate()).toHaveValue("2026-11-05");
  });

  it("never prefills the sale price silently, but copies the list price on request", async () => {
    const user = userEvent.setup();
    renderInForm(<ProductFinanceFields listingKind="used_unique" status="sold" />);
    expect(salePrice()).toHaveValue(null);

    await user.click(screen.getByRole("button", { name: "იგივე, რაც ფასი" }));
    expect(salePrice()).toHaveValue(1103);
  });

  it("requires the sale price and date when an item is marked sold now", () => {
    renderInForm(<ProductFinanceFields listingKind="used_unique" status="sold" savedStatus="available" />);
    expect(salePrice()).toBeRequired();
    expect(saleDate()).toBeRequired();
    expect(screen.getByText(/სავალდებულოა გაყიდულად მონიშვნისას/)).toBeInTheDocument();
  });

  it("does not force a price onto an item that was already sold before", () => {
    renderInForm(<ProductFinanceFields listingKind="used_unique" status="sold" savedStatus="sold" />);
    expect(salePrice()).not.toBeRequired();
  });

  it("requires a date once a sale price is entered", async () => {
    const user = userEvent.setup();
    renderInForm(<ProductFinanceFields listingKind="used_unique" status="sold" savedStatus="sold" />);
    expect(saleDate()).not.toBeRequired();
    await user.type(salePrice()!, "950");
    expect(saleDate()).toBeRequired();
  });

  it("points a new item to the product page instead of offering sale fields", () => {
    renderInForm(<ProductFinanceFields listingKind="new_stocked" status="sold" />);
    expect(salePrice()).not.toBeInTheDocument();
    expect(screen.getByLabelText("შესყიდვის ფასი (ერთეულის)")).toBeInTheDocument();
    expect(screen.getByText(/გაყიდვის დაფიქსირება/)).toBeInTheDocument();
  });

  it("marks the fields invalid and shows a server error", () => {
    renderInForm(
      <ProductFinanceFields listingKind="used_unique" status="sold" serverError="გაყიდვის თარიღი არასწორია." />,
    );
    expect(screen.getByText("გაყიდვის თარიღი არასწორია.")).toBeInTheDocument();
    expect(screen.getByLabelText("შესყიდვის ფასი")).toHaveAttribute("aria-invalid", "true");
    expect(salePrice()).toHaveAttribute("aria-invalid", "true");
  });

  it("tells staff these figures are internal", () => {
    renderInForm(<ProductFinanceFields listingKind="used_unique" status="available" />);
    expect(screen.getByText(/საიტზე მყიდველი ამ ციფრებს ვერ ხედავს/)).toBeInTheDocument();
  });
});
