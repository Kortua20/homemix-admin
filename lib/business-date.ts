// Calendar-day helpers for accounting. Every date here is a plain "YYYY-MM-DD" string — the
// same shape Postgres returns for a `date` column and an <input type="date"> submits — so no
// value ever passes through a timezone conversion it could be shifted by.
//
// "Today" is Tbilisi's today, not the server's: the admin may run in a UTC region, where a
// sale recorded at 01:00 local time would otherwise land on the previous day.

const BUSINESS_TIME_ZONE = "Asia/Tbilisi";

const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export function todayInTbilisi(now: Date = new Date()): string {
  // formatToParts rather than a locale whose format happens to be YYYY-MM-DD: the parts are
  // stable across ICU versions, a locale's preferred pattern is not.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

// Rejects shapes that match the pattern but are not real days (2026-02-30), by round-tripping
// through Date.UTC, which would roll that over to March 2.
export function isValidIsoDate(value: string): boolean {
  const match = isoDatePattern.exec(value);
  if (!match) return false;

  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function toUtcDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function fromUtcDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const date = toUtcDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUtcDate(date);
}

// Clamped to the target month's last day, so 31 March minus one month is 28/29 February
// rather than rolling forward into March 3.
export function addMonths(iso: string, months: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return fromUtcDate(target);
}

export function startOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

// DD.MM.YYYY, the format Georgian accounting documents use. Built by hand rather than through
// toLocaleDateString("ka-GE"), whose output differs between ICU versions — the same
// server/browser mismatch formatPrice in lib/product-data.ts avoids.
export function formatIsoDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}
