import type { AccountingPeriod } from "@/lib/accounting/period";
import { formatIsoDate } from "@/lib/business-date";

// Always two decimals, unlike formatPrice in lib/product-data.ts, which drops ".00" on whole
// numbers. In a right-aligned money column that makes 1,200 and 1,200.50 end at different
// places, which is exactly what an accountant scanning a column should not have to correct
// for. en-US for the same hydration-stability reason formatPrice gives.
const moneyFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// "—" for unknown, never "0.00 ₾": an unrecorded price and a zero price are different facts.
export function formatMoney(value: number | null): string {
  return value === null ? "—" : `${moneyFormat.format(value)} ₾`;
}

export function formatPercent(fraction: number | null): string {
  return fraction === null ? "—" : `${(fraction * 100).toFixed(1)}%`;
}

export function describePeriod(
  period: Pick<AccountingPeriod, "from" | "to">,
): string {
  const { from, to } = period;
  if (from && to) return `${formatIsoDate(from)} — ${formatIsoDate(to)}`;
  if (from) return `${formatIsoDate(from)}-დან`;
  if (to) return `${formatIsoDate(to)}-მდე`;
  return "მთელი პერიოდი";
}
