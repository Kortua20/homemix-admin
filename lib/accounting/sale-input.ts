import { isValidIsoDate, todayInTbilisi } from "@/lib/business-date";

// Parsing for the money and date fields that both server-action files read
// (app/product/actions.ts and app/product/sale-actions.ts). Kept in a plain module rather
// than either of those, because every export of a "use server" file becomes an endpoint the
// browser can call.

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
