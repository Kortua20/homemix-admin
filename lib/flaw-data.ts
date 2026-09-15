// Flaw vocabulary. Mirrors products_flaws_flaw_type_check and
// product_flaws_severity_check in supabase/schemas/05a_condition_detail.sql.
//
// The database is the authority: these arrays exist so the form can render the options and
// the server can reject anything outside them with a useful message instead of a raw 23514.
// Adding a value here without adding it to the CHECK constraint produces a runtime failure,
// not a type error — keep them in step.

export const FLAW_TYPES = [
  "scratch",
  "dent",
  "stain",
  "chip",
  "crack",
  "fade",
  "wear",
  "odour",
  "missing_part",
  "repair",
  "other",
] as const;

export const FLAW_SEVERITIES = ["minor", "moderate", "significant"] as const;

export type FlawType = (typeof FLAW_TYPES)[number];
export type FlawSeverity = (typeof FLAW_SEVERITIES)[number];

export const FLAW_TYPE_LABELS: Record<FlawType, string> = {
  scratch: "ნაკაწრი",
  dent: "ჩაჭყლეტა",
  stain: "ლაქა",
  chip: "ჩამოტეხილი",
  crack: "ბზარი",
  fade: "გახუნებული",
  wear: "ცვეთა",
  odour: "სუნი",
  missing_part: "ნაკლული დეტალი",
  repair: "შეკეთებული",
  other: "სხვა",
};

export const FLAW_SEVERITY_LABELS: Record<FlawSeverity, string> = {
  minor: "მცირე",
  moderate: "საშუალო",
  significant: "მნიშვნელოვანი",
};

export function isFlawType(value: string): value is FlawType {
  return (FLAW_TYPES as readonly string[]).includes(value);
}

export function isFlawSeverity(value: string): value is FlawSeverity {
  return (FLAW_SEVERITIES as readonly string[]).includes(value);
}
