import { isValidIsoDate, todayInTbilisi } from "@/lib/business-date";

// Parsing for the money, date and sale fields that the server-action files read
// (app/product/actions.ts and app/product/sale-actions.ts). Kept in a plain module rather
// than either of those, because every export of a "use server" file becomes an endpoint the
// browser can call — and so the rules can be unit-tested on their own.

const MAX_MONEY = 9_999_999_999.99;

// Blank is null ("not recorded"), and unlike the measurements 0 is allowed: a piece
// collected for free really did cost nothing. Returns undefined for present-but-unusable
// input, so the caller can tell "left blank" apart from "typed nonsense".
export function readOptionalMoney(raw: FormDataEntryValue | null) {
  const text = String(raw ?? "").trim();
  if (text === "") return null;

  const value = Number(text);
  if (!Number.isFinite(value) || value < 0 || value > MAX_MONEY) {
    return undefined;
  }

  // Rounded to the column's two decimals here, so what is validated is what is stored.
  return Math.round(value * 100) / 100;
}

// Returns an error message, or undefined when the date is usable.
export function validateSaleDate(soldOn: string): string | undefined {
  if (!isValidIsoDate(soldOn) || soldOn < "2000-01-01") {
    return "გაყიდვის თარიღი არასწორია.";
  }
  // String comparison is date comparison for zero-padded YYYY-MM-DD.
  if (soldOn > todayInTbilisi()) {
    return "გაყიდვის თარიღი მომავალში ვერ იქნება.";
  }
  return undefined;
}

// The product form's internal figures. Written to product_finances / product_sales rather
// than products so the storefront's publishable key can never read them (see the
// storefront's schemas/10_product_finances.sql).
export type FinanceInput = {
  purchasePrice: number | null;
  // The sale of a USED item, as entered in the form. Null unless the item is used and the
  // status is `sold`. A new item's sales are recorded one at a time from the product page
  // (app/product/sale-actions.ts), because each one must also take units off the stock.
  usedSale: { totalPrice: number | null; soldOn: string | null } | null;
};

// The used-item sale fields only mean anything while the item is `sold`, so they are built
// from the status the same way condition is built from listing_kind: for any other status
// they are ignored whatever the form sent, and syncUsedSale removes the sale. Moving an item
// back from `sold` (a cancelled sale, a misclick) therefore takes it out of the books
// instead of leaving a sale recorded against something still for sale.
export function readFinanceFields(
  formData: FormData,
  status: string,
  listingKind: string,
) {
  const purchasePrice = readOptionalMoney(formData.get("purchasePrice"));
  const recordsUsedSale = status === "sold" && listingKind === "used_unique";
  const salePrice = recordsUsedSale
    ? readOptionalMoney(formData.get("salePrice"))
    : null;
  const soldOn = recordsUsedSale
    ? String(formData.get("soldOn") ?? "").trim()
    : "";
  let error: string | undefined;

  if (purchasePrice === undefined) {
    error = "შეიყვანეთ სწორი, არაუარყოფითი შესყიდვის ფასი, ან დატოვეთ ცარიელი.";
  } else if (salePrice === undefined) {
    error = "შეიყვანეთ სწორი, არაუარყოფითი გაყიდვის ფასი, ან დატოვეთ ცარიელი.";
  } else if (soldOn) {
    error = validateSaleDate(soldOn);
  }

  const values: FinanceInput = {
    purchasePrice: purchasePrice ?? null,
    usedSale: recordsUsedSale
      ? { totalPrice: salePrice ?? null, soldOn: soldOn || null }
      : null,
  };

  return { values, error };
}

// The sale of a used item, resolved against the status it had before this save. Reported
// before anything is written. Two rules:
//
//   * Marking an item sold NOW requires its sale price. A sold item with no price is invisible
//     to the books — it leaves the stock report without appearing in the sales report — which
//     reads as "the status did not save". The date defaults to today on that transition.
//   * An item already sold before sales were recorded may stay without a price, so editing
//     an old listing never forces someone to invent one. If a price IS given for it, so must
//     its real date be: stamping today would book an old sale into the current month.
export function resolveUsedSale(
  input: FinanceInput,
  previousStatus: string | null,
): { soldOn: string | null; error?: string } {
  const sale = input.usedSale;
  if (!sale) return { soldOn: null };

  const markingSoldNow = previousStatus !== "sold";

  if (sale.totalPrice === null) {
    return markingSoldNow
      ? {
          soldOn: null,
          error: "გაყიდულად მონიშვნისას მიუთითეთ გაყიდვის ფასი (ფაქტიური).",
        }
      : { soldOn: null };
  }

  if (sale.soldOn) return { soldOn: sale.soldOn };
  if (!markingSoldNow) {
    return {
      soldOn: null,
      error: "მიუთითეთ გაყიდვის თარიღი — ნივთი უკვე გაყიდულად იყო მონიშნული.",
    };
  }
  return { soldOn: todayInTbilisi() };
}

// A NEW item is sold through "გაყიდვის დაფიქსირება" on its product page, which records the
// sale and takes the units off the stock; it reaches `sold` by itself when the stock runs
// out. Choosing `sold` by hand in the form would skip both, so it is refused — unless the
// item is already sold out, in which case keeping that status is not a sale.
export function statusTransitionError(
  listingKind: string,
  nextStatus: string,
  previousStatus: string | null,
): string | undefined {
  if (listingKind === "new_stocked" && nextStatus === "sold" && previousStatus !== "sold") {
    return "ახალი პროდუქტის გაყიდვა დააფიქსირეთ პროდუქტის გვერდზე — „გაყიდვის დაფიქსირება“.";
  }
  return undefined;
}
