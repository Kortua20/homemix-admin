"use client";

import { LoaderCircle, ShoppingBag } from "lucide-react";
import { startTransition, useActionState, useState } from "react";

import {
  recordProductSale,
  type SaleActionState,
} from "@/app/product/sale-actions";
import { FieldError } from "@/components/products/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/accounting/format";
import { todayInTbilisi } from "@/lib/business-date";

// Records one sale of a new (stocked) item: how many units, what the buyer paid for them in
// total, and when. The server action calls record_product_sale, which takes the units off
// the stock in the same transaction, so this never has to touch the stock field itself.
//
// The total is what is entered, not a unit price, because a bargain is agreed on the total
// ("two for 90"). The unit price and the profit are shown as a preview so a typo — 900 for
// 90 — is visible before it is saved.

const initialState: SaleActionState = { status: "idle", message: "" };

const NUDGE_LINK_CLASS =
  "font-semibold text-walnut underline underline-offset-2 hover:no-underline";

type RecordSaleFormProps = {
  productId: string;
  slug: string;
  stock: number;
  listPrice: number;
  purchasePrice: number | null;
};

export function RecordSaleForm({
  productId,
  slug,
  stock,
  listPrice,
  purchasePrice,
}: RecordSaleFormProps) {
  const [state, formAction, pending] = useActionState(
    recordProductSale,
    initialState,
  );
  const [quantity, setQuantity] = useState("1");
  const [totalPrice, setTotalPrice] = useState("");
  const [soldOn, setSoldOn] = useState(todayInTbilisi);
  const [note, setNote] = useState("");

  // Clears the fields once a sale is saved, so the next one starts empty. Done by comparing
  // against the last result seen during render — React's pattern for resetting state when an
  // input changes — rather than in an effect, which would render the stale values first.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state.status === "success") {
      setQuantity("1");
      setTotalPrice("");
      setNote("");
    }
  }

  const quantityNumber = Number(quantity);
  const totalNumber = totalPrice === "" ? null : Number(totalPrice);
  const validQuantity = Number.isInteger(quantityNumber) && quantityNumber >= 1;
  const unitPrice =
    validQuantity && totalNumber !== null && Number.isFinite(totalNumber)
      ? totalNumber / quantityNumber
      : null;
  const profit =
    unitPrice !== null && purchasePrice !== null && totalNumber !== null
      ? totalNumber - purchasePrice * quantityNumber
      : null;

  function fillListTotal() {
    if (validQuantity) {
      setTotalPrice((listPrice * quantityNumber).toFixed(2));
    }
  }

  // Dispatched by hand, like ProductForm, so React does not reset the fields before the
  // server has answered — a rejected sale keeps what was typed next to the error.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  if (stock <= 0) {
    return (
      <p className="rounded-xl bg-soft-linen px-4 py-3 text-sm text-quiet-ink">
        მარაგი ამოიწურა. ახალი გაყიდვის დასაფიქსირებლად ჯერ შეავსეთ მარაგი
        რედაქტირების გვერდზე.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="slug" value={slug} />

      {/* One column at lg, where this sits in the product page's narrow side column. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <div className="grid gap-1.5">
          <Label htmlFor="sale-quantity">რაოდენობა</Label>
          <Input
            id="sale-quantity"
            name="quantity"
            type="number"
            min="1"
            max={stock}
            step="1"
            required
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            aria-invalid={Boolean(state.fieldErrors?.quantity)}
            aria-describedby="sale-quantity-help"
            className="h-12 border-clay-border bg-white"
          />
          {state.fieldErrors?.quantity ? (
            <FieldError id="sale-quantity-help">{state.fieldErrors.quantity}</FieldError>
          ) : (
            <p id="sale-quantity-help" className="text-xs text-quiet-ink">
              მარაგშია: {stock} ცალი
            </p>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="sale-total">გადახდილი თანხა (ჯამში)</Label>
          <div className="relative">
            <Input
              id="sale-total"
              name="totalPrice"
              type="number"
              min="0"
              max="9999999999.99"
              step="0.01"
              required
              value={totalPrice}
              onChange={(event) => setTotalPrice(event.target.value)}
              placeholder="მაგ.: 90"
              aria-invalid={Boolean(state.fieldErrors?.totalPrice)}
              aria-describedby="sale-total-help"
              className="h-12 border-clay-border bg-white pr-10"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-quiet-ink">
              ₾
            </span>
          </div>
          {state.fieldErrors?.totalPrice ? (
            <FieldError id="sale-total-help">{state.fieldErrors.totalPrice}</FieldError>
          ) : (
            <p id="sale-total-help" className="text-xs leading-5 text-quiet-ink">
              ყველა ცალისთვის ერთად, მოლაპარაკების შემდეგ.{" "}
              <button type="button" onClick={fillListTotal} className={NUDGE_LINK_CLASS}>
                საიტის ფასით ({formatMoney(validQuantity ? listPrice * quantityNumber : listPrice)})
              </button>
            </p>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="sale-date">გაყიდვის თარიღი</Label>
          <Input
            id="sale-date"
            name="soldOn"
            type="date"
            min="2000-01-01"
            max={todayInTbilisi()}
            required
            value={soldOn}
            onChange={(event) => setSoldOn(event.target.value)}
            aria-invalid={Boolean(state.fieldErrors?.soldOn)}
            aria-describedby={state.fieldErrors?.soldOn ? "sale-date-error" : undefined}
            className="h-12 border-clay-border bg-white"
          />
          {state.fieldErrors?.soldOn ? (
            <FieldError id="sale-date-error">{state.fieldErrors.soldOn}</FieldError>
          ) : null}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="sale-note">შენიშვნა</Label>
          <Input
            id="sale-note"
            name="note"
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="სურვილისამებრ, მაგ.: მყიდველის სახელი"
            aria-invalid={Boolean(state.fieldErrors?.note)}
            aria-describedby={state.fieldErrors?.note ? "sale-note-error" : undefined}
            className="h-12 border-clay-border bg-white"
          />
          {state.fieldErrors?.note ? (
            <FieldError id="sale-note-error">{state.fieldErrors.note}</FieldError>
          ) : null}
        </div>
      </div>

      {/* Live preview, so a misplaced digit is caught before it reaches the books. */}
      {unitPrice !== null ? (
        <p className="rounded-xl bg-soft-linen px-4 py-3 text-sm text-quiet-ink tabular-nums" aria-live="polite">
          ერთეულის ფასი: <span className="font-semibold text-ink">{formatMoney(unitPrice)}</span>
          {" · "}
          მოგება:{" "}
          {profit === null ? (
            <span>უცნობია (შესყიდვის ფასი არ არის მითითებული)</span>
          ) : (
            <span
              className={profit < 0 ? "font-semibold text-destructive-ink" : "font-semibold text-ink"}
            >
              {formatMoney(profit)}
            </span>
          )}
        </p>
      ) : null}

      {state.status === "error" && state.message ? (
        <p role="alert" className="rounded-xl bg-destructive-tint px-4 py-3 text-sm font-medium text-destructive-ink">
          {state.message}
        </p>
      ) : null}
      {state.status === "success" ? (
        <p role="status" className="rounded-xl bg-status-available-surface px-4 py-3 text-sm font-medium text-status-available-ink">
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} className="min-w-48 gap-2">
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <ShoppingBag aria-hidden="true" className="size-4" />
          )}
          გაყიდვის დაფიქსირება
        </Button>
      </div>
    </form>
  );
}
