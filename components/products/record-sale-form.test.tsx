import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SaleActionState } from "@/app/product/sale-actions";

type SaleAction = (state: SaleActionState, data: FormData) => Promise<SaleActionState>;

const { recordProductSale, recordUsedSale } = vi.hoisted(() => ({
  recordProductSale: vi.fn<SaleAction>(),
  recordUsedSale: vi.fn<SaleAction>(),
}));

vi.mock("@/app/product/sale-actions", () => ({ recordProductSale, recordUsedSale }));

import { RecordSaleForm } from "@/components/products/record-sale-form";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-11T06:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

const props = {
  productId: "11111111-1111-4111-8111-111111111111",
  slug: "chair",
  listingKind: "new_stocked" as const,
  stock: 5,
  listPrice: 60,
  purchasePrice: 50 as number | null,
};

function setup(overrides: Partial<typeof props> = {}) {
  const user = userEvent.setup();
  render(<RecordSaleForm {...props} {...overrides} />);
  return {
    user,
    quantity: screen.getByLabelText("რაოდენობა") as HTMLInputElement,
    total: screen.getByLabelText("გადახდილი თანხა (ჯამში)") as HTMLInputElement,
    date: screen.getByLabelText("გაყიდვის თარიღი") as HTMLInputElement,
    note: screen.getByLabelText("შენიშვნა") as HTMLInputElement,
    submit: screen.getByRole("button", { name: /გაყიდვის დაფიქსირება/ }),
  };
}

describe("RecordSaleForm", () => {
  it("starts at one unit, today's date, and the stock as the limit", () => {
    const { quantity, date } = setup();
    expect(quantity).toHaveValue(1);
    expect(quantity).toHaveAttribute("max", "5");
    expect(date).toHaveValue("2026-11-11");
    expect(screen.getByText("მარაგშია: 5 ცალი")).toBeInTheDocument();
  });

  it("previews unit price and profit for the 5-chairs example before saving", async () => {
    const { user, quantity, total } = setup();
    await user.clear(quantity);
    await user.type(quantity, "2");
    await user.type(total, "90");

    const preview = screen.getByText(/ერთეულის ფასი/);
    expect(preview).toHaveTextContent("45.00 ₾");
    expect(preview).toHaveTextContent("-10.00 ₾");
  });

  it("says profit is unknown when no purchase price is recorded", async () => {
    const { user, total } = setup({ purchasePrice: null });
    await user.type(total, "90");
    expect(screen.getByText(/უცნობია/)).toBeInTheDocument();
  });

  it("fills the total at the site price for the chosen quantity", async () => {
    const { user, quantity, total } = setup();
    await user.clear(quantity);
    await user.type(quantity, "3");
    await user.click(screen.getByRole("button", { name: /საიტის ფასით/ }));
    expect(total).toHaveValue(180);
  });

  it("sends the entered values and clears them after a successful sale", async () => {
    recordProductSale.mockResolvedValue({ status: "success", message: "გაყიდვა დაფიქსირდა" });
    const { user, quantity, total, note, submit } = setup();
    await user.clear(quantity);
    await user.type(quantity, "2");
    await user.type(total, "90");
    await user.type(note, "ორი სკამი");
    await user.click(submit);

    await waitFor(() => expect(recordProductSale).toHaveBeenCalledTimes(1));
    const data = recordProductSale.mock.calls[0][1];
    expect(Object.fromEntries(data)).toEqual({
      productId: props.productId,
      slug: "chair",
      quantity: "2",
      totalPrice: "90",
      soldOn: "2026-11-11",
      note: "ორი სკამი",
    });

    expect(await screen.findByRole("status")).toHaveTextContent("გაყიდვა დაფიქსირდა");
    expect(quantity).toHaveValue(1);
    expect(total).toHaveValue(null);
    expect(note).toHaveValue("");
  });

  it("keeps what was typed next to a server error", async () => {
    recordProductSale.mockResolvedValue({
      status: "error",
      message: "მარაგში ამდენი ცალი არ არის.",
    });
    const { user, total, submit } = setup();
    await user.type(total, "90");
    await user.click(submit);

    expect(await screen.findByRole("alert")).toHaveTextContent("მარაგში ამდენი ცალი არ არის.");
    expect(total).toHaveValue(90);
  });

  it("shows field errors from the server", async () => {
    recordProductSale.mockResolvedValue({
      status: "error",
      message: "შეამოწმეთ შევსებული ველები.",
      fieldErrors: { totalPrice: "შეიყვანეთ გადახდილი თანხა (0 ან მეტი)." },
    });
    const { user, total, submit } = setup();
    await user.type(total, "1");
    await user.click(submit);

    expect(await screen.findByText("შეიყვანეთ გადახდილი თანხა (0 ან მეტი).")).toBeInTheDocument();
    expect(total).toHaveAttribute("aria-invalid", "true");
  });

  it("offers no form once the stock is gone", () => {
    render(<RecordSaleForm {...props} stock={0} />);
    expect(screen.getByText(/მარაგი ამოიწურა/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /გაყიდვის დაფიქსირება/ })).not.toBeInTheDocument();
  });
});

describe("RecordSaleForm for a used item", () => {
  const usedProps = { ...props, listingKind: "used_unique" as const, stock: 0, listPrice: 400, purchasePrice: 250 };

  it("asks for the price and date only — a one-off piece has no quantity or stock", () => {
    render(<RecordSaleForm {...usedProps} />);
    expect(screen.queryByLabelText("რაოდენობა")).not.toBeInTheDocument();
    expect(screen.queryByText(/მარაგი ამოიწურა/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("გაყიდვის ფასი (ფაქტიური)")).toBeRequired();
    expect(screen.getByLabelText("გაყიდვის თარიღი")).toHaveValue("2026-11-11");
  });

  it("previews the profit, without a redundant unit price", async () => {
    const user = userEvent.setup();
    render(<RecordSaleForm {...usedProps} />);
    await user.type(screen.getByLabelText("გაყიდვის ფასი (ფაქტიური)"), "350");
    const preview = screen.getByText(/მოგება/);
    expect(preview).toHaveTextContent("100.00 ₾");
    expect(preview).not.toHaveTextContent("ერთეულის ფასი");
  });

  it("copies the list price on request", async () => {
    const user = userEvent.setup();
    render(<RecordSaleForm {...usedProps} />);
    await user.click(screen.getByRole("button", { name: /იგივე, რაც ფასი/ }));
    expect(screen.getByLabelText("გაყიდვის ფასი (ფაქტიური)")).toHaveValue(400);
  });

  it("sends the sale to recordUsedSale, not the stock action", async () => {
    recordUsedSale.mockResolvedValue({ status: "success", message: "გაყიდვა დაფიქსირდა" });
    const user = userEvent.setup();
    render(<RecordSaleForm {...usedProps} />);
    await user.type(screen.getByLabelText("გაყიდვის ფასი (ფაქტიური)"), "350");
    await user.click(screen.getByRole("button", { name: /გაყიდვის დაფიქსირება/ }));

    await waitFor(() => expect(recordUsedSale).toHaveBeenCalledTimes(1));
    expect(recordProductSale).not.toHaveBeenCalled();
    const data = Object.fromEntries(recordUsedSale.mock.calls[0][1]);
    expect(data).toMatchObject({ totalPrice: "350", soldOn: "2026-11-11" });
    expect(data).not.toHaveProperty("quantity");
  });
});

