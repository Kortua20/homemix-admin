import {
  addDays,
  addMonths,
  isValidIsoDate,
  startOfMonth,
  todayInTbilisi,
} from "@/lib/business-date";

// The accounting page's state lives in the URL, like the dashboard's filters: the queries run
// on the server, and a period that survives a reload can be bookmarked or sent to the
// accountant as a link.
//
//   ?view=sales|stock
//   ?period=this-month|7d|1m|3m|6m|1y|all|custom
//   ?from=YYYY-MM-DD&to=YYYY-MM-DD   (custom only)

export const ACCOUNTING_VIEWS = ["sales", "stock"] as const;
export type AccountingView = (typeof ACCOUNTING_VIEWS)[number];

export const PERIOD_PRESETS = [
  "this-month",
  "7d",
  "1m",
  "3m",
  "6m",
  "1y",
  "all",
  "custom",
] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  "this-month": "მიმდინარე თვე",
  "7d": "ბოლო 7 დღე",
  "1m": "ბოლო თვე",
  "3m": "ბოლო 3 თვე",
  "6m": "ბოლო 6 თვე",
  "1y": "ბოლო წელი",
  all: "მთელი პერიოდი",
  custom: "თარიღების მიხედვით",
};

// The calendar month, not a rolling 30 days: monthly reporting and tax periods are
// calendar months, so this is the view an accountant opens most.
const DEFAULT_PRESET: PeriodPreset = "this-month";

export type AccountingPeriod = {
  preset: PeriodPreset;
  // Inclusive bounds. Null means open-ended on that side; both null is "all time".
  from: string | null;
  to: string | null;
  // Set when a custom bound was unusable and ignored, so the page can say so instead of
  // showing totals for a range nobody asked for without comment.
  error?: string;
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export function parseView(params: SearchParams): AccountingView {
  const view = first(params.view);
  return (ACCOUNTING_VIEWS as readonly string[]).includes(view)
    ? (view as AccountingView)
    : "sales";
}

// Rolling presets end today and include it, so "last 7 days" is today and the six days
// before it — seven calendar days, not seven-and-a-bit.
export function resolvePeriod(
  params: SearchParams,
  today: string = todayInTbilisi(),
): AccountingPeriod {
  const raw = first(params.period);
  const rawFrom = first(params.from);
  const rawTo = first(params.to);
  // A link carrying dates but no preset (hand-edited, or from an older version) means
  // custom; anything unrecognised falls back to the default rather than erroring.
  const preset: PeriodPreset = (PERIOD_PRESETS as readonly string[]).includes(raw)
    ? (raw as PeriodPreset)
    : rawFrom || rawTo
      ? "custom"
      : DEFAULT_PRESET;

  switch (preset) {
    case "this-month":
      return { preset, from: startOfMonth(today), to: today };
    case "7d":
      return { preset, from: addDays(today, -6), to: today };
    case "1m":
      return { preset, from: addDays(addMonths(today, -1), 1), to: today };
    case "3m":
      return { preset, from: addDays(addMonths(today, -3), 1), to: today };
    case "6m":
      return { preset, from: addDays(addMonths(today, -6), 1), to: today };
    case "1y":
      return { preset, from: addDays(addMonths(today, -12), 1), to: today };
    case "all":
      return { preset, from: null, to: null };
    case "custom":
      return resolveCustomPeriod(rawFrom, rawTo);
  }
}

function resolveCustomPeriod(rawFrom: string, rawTo: string): AccountingPeriod {
  const fromValid = rawFrom === "" || isValidIsoDate(rawFrom);
  const toValid = rawTo === "" || isValidIsoDate(rawTo);
  // An invalid bound is dropped on its own; the other one still applies.
  let from = fromValid && rawFrom ? rawFrom : null;
  let to = toValid && rawTo ? rawTo : null;

  // Reversed bounds are swapped rather than rejected: the intent is unambiguous, and the page
  // always prints the range actually applied, so nothing happens silently.
  if (from && to && from > to) {
    [from, to] = [to, from];
  }

  return {
    preset: "custom",
    from,
    to,
    error:
      fromValid && toValid
        ? undefined
        : "ერთ-ერთი თარიღი არასწორია და არ იქნა გათვალისწინებული.",
  };
}

// Builds a link to the page (or the export) for a given view and period. Only the params
// that mean something are written, so links stay short and readable.
export function buildAccountingHref(
  pathname: string,
  view: AccountingView,
  period: Pick<AccountingPeriod, "preset" | "from" | "to">,
) {
  const params = new URLSearchParams({ view });

  if (view === "sales") {
    params.set("period", period.preset);
    if (period.preset === "custom") {
      if (period.from) params.set("from", period.from);
      if (period.to) params.set("to", period.to);
    }
  }

  return `${pathname}?${params.toString()}`;
}
