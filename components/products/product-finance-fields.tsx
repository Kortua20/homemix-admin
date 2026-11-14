"use client";

import { Lock } from "lucide-react";
import { useState } from "react";

import { FieldError, RequiredMark } from "@/components/products/field-error";
import type {
  ListingKind,
  ProductFinances,
  ProductSale,
  ProductStatus,
} from "@/components/products/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { todayInTbilisi } from "@/lib/business-date";

// Purchase price, and — for a USED item whose status is `sold` — what the buyer actually paid
// and when.
//
// Staff-only figures. They are written to product_finances and product_sales, which the
// storefront's publishable key holds no privilege on, so nothing here can reach a customer.
//
// A new (stocked) item's sales are not entered here: each one is recorded from the product
// page, which takes the units off the stock in the same transaction. A form field for it
// would either ignore the stock or fight with the stock field above it.

const NUDGE_LINK_CLASS =
  "font-semibold text-walnut underline underline-offset-2 hover:no-underline";

type ProductFinanceFieldsProps = {
  finances?: ProductFinances;
  // The used item's recorded sale, if any. Undefined on a create.
  sale?: ProductSale;
  listingKind: ListingKind;
  // The status currently selected in the form, which decides whether the sale fields show.
  status: ProductStatus;
  // The status as saved, before this edit. Undefined on a create.
  savedStatus?: ProductStatus;
  serverError?: string;
};

export function ProductFinanceFields({
  finances,
  sale,
  listingKind,
  status,
  savedStatus,
  serverError,
}: ProductFinanceFieldsProps) {
  const isUsed = listingKind === "used_unique";

  return (
    <fieldset className="grid gap-4 rounded-2xl border border-hairline p-4 lg:col-span-2 lg:p-5">
      <legend className="sr-only">შიდა ფინანსები</legend>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-ink">შიდა ფინანსები</h3>
          <p className="mt-1 text-xs leading-5 text-quiet-ink">
            ჩანს მხოლოდ ადმინისტრაციაში და ბუღალტერიის გვერდზე. საიტზე მყიდველი
            ამ ციფრებს ვერ ხედავს.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-soft-linen px-2.5 py-1 text-xs font-semibold text-quiet-ink">
          <Lock aria-hidden="true" className="size-3.5" />
          შიდა
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="product-purchase-price">
            შესყიდვის ფასი{isUsed ? "" : " (ერთეულის)"}
          </Label>
          <div className="relative">
            <Input
              id="product-purchase-price"
              name="purchasePrice"
              type="number"
              min="0"
              max="9999999999.99"
              step="0.01"
              defaultValue={finances?.purchasePrice ?? ""}
              placeholder="არ არის მითითებული"
              aria-invalid={Boolean(serverError)}
              aria-describedby={
                serverError
                  ? "product-finances-error"
                  : "product-purchase-price-help"
              }
              className="h-12 border-clay-border bg-white pr-10"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-quiet-ink">
              ₾
            </span>
          </div>
          <p
            id="product-purchase-price-help"
            className="text-xs leading-5 text-quiet-ink"
          >
            {isUsed
              ? "რა ღირდა ნივთის შეძენა. ცარიელი ნიშნავს „უცნობია“, 0 — უფასოდ მიღებულს."
              : "ერთი ცალის ფასი. უკვე დაფიქსირებულ გაყიდვებს არ ცვლის — ისინი გაყიდვის მომენტის ფასს ინახავს."}
          </p>
        </div>

        {isUsed && status === "sold" ? (
          <SaleFields
            sale={sale}
            wasSold={savedStatus === "sold"}
            hasError={Boolean(serverError)}
          />
        ) : null}

        {!isUsed ? (
          <p className="self-center rounded-xl bg-soft-linen px-4 py-3 text-xs leading-5 text-quiet-ink">
            ახალი პროდუქტის გაყიდვა დააფიქსირეთ პროდუქტის გვერდზე — „გაყიდვის
            დაფიქსირება“. მარაგი ავტომატურად შემცირდება.
          </p>
        ) : null}
      </div>

      {serverError ? (
        <FieldError id="product-finances-error">{serverError}</FieldError>
      ) : null}
    </fieldset>
  );
}

// Mounted when the status becomes `sold`, so its initial state is decided at that moment:
//   - the recorded sale, if there is one;
//   - otherwise, for an item being marked sold now, today's date — the usual case, and
//     editable for a sale entered after the fact;
//   - but for an item that was already sold before sales were recorded, a blank date. The
//     server refuses a price without a date for it, rather than booking an old sale into the
//     current month.
//
// The sale price is never prefilled silently. "იგივე, რაც ფასი" copies the list price in one
// click, as a visible choice, because a bargained price that was never typed in would
// otherwise be saved as if the listing price had been paid.
//
// It is REQUIRED when the item is being marked sold now: a sold item with no price leaves the
// stock report without reaching the sales report, which reads as "nothing happened". The
// server enforces the same rule (resolveUsedSale in lib/accounting/sale-input.ts). An item
// that was already sold before may stay without one.
function SaleFields({
  sale,
  wasSold,
  hasError,
}: {
  sale?: ProductSale;
  wasSold: boolean;
  hasError: boolean;
}) {
  const [salePrice, setSalePrice] = useState(
    sale ? String(sale.totalPrice) : "",
  );
  const [soldOn, setSoldOn] = useState(
    () => sale?.soldOn ?? (wasSold ? "" : todayInTbilisi()),
  );
  const priceRequired = !wasSold;

  // Read from the form rather than passed down: the price input is uncontrolled, and what
  // matters is what it holds now, including an unsaved edit.
  function copyListPrice(event: React.MouseEvent<HTMLButtonElement>) {
    const priceInput = event.currentTarget.form?.elements.namedItem("price");
    if (priceInput instanceof HTMLInputElement && priceInput.value !== "") {
      setSalePrice(priceInput.value);
    }
  }

  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="product-sale-price">
          გაყიდვის ფასი (ფაქტიური)
          {priceRequired ? <RequiredMark /> : null}
        </Label>
        <div className="relative">
          <Input
            id="product-sale-price"
            name="salePrice"
            type="number"
            min="0"
            max="9999999999.99"
            step="0.01"
            value={salePrice}
            onChange={(event) => setSalePrice(event.target.value)}
            required={priceRequired}
            placeholder="რამდენად გაიყიდა"
            aria-invalid={hasError}
            aria-describedby={
              hasError ? "product-finances-error" : "product-sale-price-help"
            }
            className="h-12 border-clay-border bg-white pr-10"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-quiet-ink">
            ₾
          </span>
        </div>
        <p id="product-sale-price-help" className="text-xs leading-5 text-quiet-ink">
          {priceRequired
            ? "სავალდებულოა გაყიდულად მონიშვნისას — რეალურად გადახდილი თანხა, მოლაპარაკების შემდეგ."
            : "რეალურად გადახდილი თანხა, მოლაპარაკების შემდეგ."}{" "}
          <button type="button" onClick={copyListPrice} className={NUDGE_LINK_CLASS}>
            იგივე, რაც ფასი
          </button>
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="product-sold-on">გაყიდვის თარიღი</Label>
        <Input
          id="product-sold-on"
          name="soldOn"
          type="date"
          min="2000-01-01"
          max={todayInTbilisi()}
          value={soldOn}
          onChange={(event) => setSoldOn(event.target.value)}
          // A price without a date cannot be placed in any accounting period.
          required={priceRequired || salePrice !== ""}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? "product-finances-error" : "product-sold-on-help"
          }
          className="h-12 border-clay-border bg-white"
        />
        <p id="product-sold-on-help" className="text-xs leading-5 text-quiet-ink">
          ამ თარიღით ჩაითვლება ბუღალტერიის პერიოდში.
        </p>
      </div>
    </>
  );
}
