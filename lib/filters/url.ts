// Reading a filter schema out of the URL, and writing it back.
//
// No "use client": the server parses searchParams with this, the client builds hrefs with
// it, and they must agree exactly. A parser that disagrees with its serializer produces
// links that do not round-trip — the classic symptom being a filter that silently clears
// itself when you change a different one.

import {
  type FilterSchema,
  type FilterValues,
  type RangeValue,
} from "@/lib/filters/types";

// Matches the storefront's cap. Long free-text is either a mistake or an attack surface,
// and neither deserves a database round trip.
const MAX_TEXT_LENGTH = 100;

export const RANGE_MIN_SUFFIX = "Min";
export const RANGE_MAX_SUFFIX = "Max";

type RawParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function listValue(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value.map((v) => v.trim()).filter(Boolean);
  const single = (value ?? "").trim();
  return single ? [single] : [];
}

// undefined rather than 0 for a blank bound: an empty box means "no limit", while 0 is a
// real lower bound. Collapsing the two makes a cleared field look like an active filter.
function parseBound(value: string): number | undefined {
  const text = value.trim();
  if (!text) return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

// Parses raw searchParams into typed values, per the schema.
//
// Unknown params are ignored: the schema is the allowlist, so a hand-edited URL cannot
// introduce a filter the query layer never validated.
export function parseFilters(
  schema: FilterSchema,
  params: RawParams,
): FilterValues {
  const values: FilterValues = {};

  for (const field of schema) {
    switch (field.kind) {
      case "text": {
        values[field.param] = firstValue(params[field.param])
          .trim()
          .slice(0, MAX_TEXT_LENGTH);
        break;
      }
      case "select": {
        const raw = firstValue(params[field.param]).trim();
        // Validated against the declared options rather than passed through: this value
        // reaches an eq() filter, and an unknown one should read as "no filter" instead of
        // silently returning nothing.
        values[field.param] = field.options.some((o) => o.value === raw)
          ? raw
          : "";
        break;
      }
      case "multi": {
        const allowed = new Set(field.options.map((o) => o.value));
        values[field.param] = listValue(params[field.param]).filter((v) =>
          allowed.has(v),
        );
        break;
      }
      case "range": {
        const min = parseBound(firstValue(params[`${field.param}${RANGE_MIN_SUFFIX}`]));
        const max = parseBound(firstValue(params[`${field.param}${RANGE_MAX_SUFFIX}`]));
        // Swapped bounds are corrected rather than rejected: someone typing 200 then 40
        // means the range between them, and returning nothing would look like a bug.
        const range: RangeValue =
          min !== undefined && max !== undefined && min > max
            ? { min: max, max: min }
            : { min, max };
        values[field.param] = range;
        break;
      }
    }
  }

  return values;
}

// True when any filter in the schema is set. Drives the "clear all" affordance and the
// empty state's wording — "no results" and "no products yet" are different messages.
export function hasActiveFilters(
  schema: FilterSchema,
  values: FilterValues,
): boolean {
  return schema.some((field) => {
    const value = values[field.param];
    if (field.kind === "multi") return Array.isArray(value) && value.length > 0;
    if (field.kind === "range") {
      const range = (value ?? {}) as RangeValue;
      return range.min !== undefined || range.max !== undefined;
    }
    return typeof value === "string" && value.length > 0;
  });
}

// How many filters are set, excluding the primary text box. Shown as a badge on the
// "filters" toggle so an admin can see at a glance that a collapsed panel is narrowing
// their results — a hidden active filter that silently changes the list is the main way
// expandable filter UIs mislead people.
export function countActiveFilters(
  schema: FilterSchema,
  values: FilterValues,
): number {
  return schema.filter((field) => {
    if (field.kind === "text" && field.primary) return false;
    const value = values[field.param];
    if (field.kind === "multi") return Array.isArray(value) && value.length > 0;
    if (field.kind === "range") {
      const range = (value ?? {}) as RangeValue;
      return range.min !== undefined || range.max !== undefined;
    }
    return typeof value === "string" && value.length > 0;
  }).length;
}

// Serializes values back to a URLSearchParams, dropping everything empty so the URL stays
// as short as the active filter set and one state has exactly one address.
export function serializeFilters(
  schema: FilterSchema,
  values: FilterValues,
): URLSearchParams {
  const params = new URLSearchParams();

  for (const field of schema) {
    const value = values[field.param];
    switch (field.kind) {
      case "text":
      case "select": {
        if (typeof value === "string" && value) params.set(field.param, value);
        break;
      }
      case "multi": {
        // append, not set: multi-values legitimately repeat in the query string.
        if (Array.isArray(value)) {
          for (const entry of value) params.append(field.param, entry);
        }
        break;
      }
      case "range": {
        const range = (value ?? {}) as RangeValue;
        if (range.min !== undefined)
          params.set(`${field.param}${RANGE_MIN_SUFFIX}`, String(range.min));
        if (range.max !== undefined)
          params.set(`${field.param}${RANGE_MAX_SUFFIX}`, String(range.max));
        break;
      }
    }
  }

  return params;
}

// Builds an href for a list page: current filters, plus an explicit page.
//
// Page 1 is deliberately the bare URL — /dashboard and /dashboard?page=1 would otherwise be
// two addresses for one view.
export function buildListHref(
  pathname: string,
  schema: FilterSchema,
  values: FilterValues,
  page = 1,
): string {
  const params = serializeFilters(schema, values);
  if (page > 1) params.set("page", String(page));
  return params.size ? `${pathname}?${params.toString()}` : pathname;
}
