// A declarative description of a list's filters.
//
// The point of this file is that <FilterBar> and the URL parser know nothing about
// products. A list declares an array of these descriptors; the generic machinery renders
// the controls, reads the URL and writes it back. Adding orders later means writing a
// schema, not new UI.
//
// Everything here is plain data with no React import, so both server components (parsing
// searchParams) and client components (rendering controls) can use it.

export type FilterOption = {
  value: string;
  label: string;
  // Only colours carry one. Rendered as a swatch when present.
  hex?: string;
};

// A free-text box. Matched with ilike by the query layer.
export type TextFilterField = {
  kind: "text";
  param: string;
  label: string;
  placeholder?: string;
  // Text fields can live in the always-visible bar rather than the expanded panel. Exactly
  // one field per schema should set this, and it is the one that gets the search icon.
  primary?: boolean;
};

// A closed set, one value. Rendered as a <select>.
export type SelectFilterField = {
  kind: "select";
  param: string;
  label: string;
  options: FilterOption[];
  // Shown as the "no filter" choice.
  placeholder?: string;
};

// A closed set, several values, OR'd together. Rendered as checkboxes.
export type MultiFilterField = {
  kind: "multi";
  param: string;
  label: string;
  options: FilterOption[];
};

// Two numeric bounds sharing a label, written to `${param}Min` / `${param}Max`.
//
// Split into two params rather than one "10-200" string so each bound is independently
// clearable and a malformed half cannot poison the other.
export type RangeFilterField = {
  kind: "range";
  param: string;
  label: string;
  // Appended after each input — "₾", "სმ".
  unit?: string;
  min?: number;
  max?: number;
};

export type FilterField =
  | TextFilterField
  | SelectFilterField
  | MultiFilterField
  | RangeFilterField;

export type FilterSchema = readonly FilterField[];

// Parsed values, keyed by param name. The shape per field kind:
//   text   -> string
//   select -> string
//   multi  -> string[]
//   range  -> { min?: number; max?: number }
export type RangeValue = { min?: number; max?: number };
export type FilterValue = string | string[] | RangeValue;
export type FilterValues = Record<string, FilterValue>;

// Narrowing helpers. The generic renderer switches on `kind`, but callers reading parsed
// values back out need to assert the shape they expect — these keep that honest instead of
// casting at each use.
export function asText(values: FilterValues, param: string): string {
  const value = values[param];
  return typeof value === "string" ? value : "";
}

export function asList(values: FilterValues, param: string): string[] {
  const value = values[param];
  return Array.isArray(value) ? value : [];
}

export function asRange(values: FilterValues, param: string): RangeValue {
  const value = values[param];
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}
