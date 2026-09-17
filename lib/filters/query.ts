// Applying parsed filter values to a Supabase query.
//
// The schema says what a filter *is*; this says how it reaches the database. They are
// separate because the mapping is not always one-to-one: `q` is an ilike on `name`, status
// is an `in` on a column, and colours are an intersection over a join table that cannot be
// expressed as a column filter at all.
//
// A list declares one binding per param. Anything without a binding is parsed and rendered
// but never reaches the query — which is a loud bug in development rather than a silent
// filter that does nothing, because applyFilterBindings throws on an unbound active param.

import {
  type FilterSchema,
  type FilterValues,
  type RangeValue,
} from "@/lib/filters/types";

// The minimal surface applyFilterBindings needs. Typed structurally rather than against
// PostgrestFilterBuilder so the same code works for a counted select, a head-only count and
// a plain select, whose builder types differ.
export type FilterableQuery<T> = {
  ilike: (column: string, pattern: string) => T;
  eq: (column: string, value: string) => T;
  in: (column: string, values: string[]) => T;
  gte: (column: string, value: number) => T;
  lte: (column: string, value: number) => T;
};

export type FilterBinding =
  // Free text against one column, wrapped in %...%.
  | { type: "ilike"; column: string }
  // Single value equality.
  | { type: "eq"; column: string }
  // Multi-select against a column: WHERE column IN (...).
  | { type: "in"; column: string }
  // Numeric range against a column.
  | { type: "range"; column: string }
  // Resolved elsewhere (a join-table intersection, say) and applied as an id restriction by
  // the caller. Declared so the unbound-param check below knows it is handled on purpose.
  | { type: "external" };

export type FilterBindings = Record<string, FilterBinding>;

// LIKE wildcards and the PostgREST escape character. Without this a search for "50%" or
// "snake_case" matches far more than it should.
function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, (char) => `\\${char}`);
}

// Applies every bound, non-empty filter to the query.
//
// Generic over the builder type so one implementation serves the page fetch and the
// count fetch — the two disagreeing about what matches is how a pager ends up advertising
// pages that turn out to be empty.
export function applyFilterBindings<T extends FilterableQuery<T>>(
  builder: T,
  schema: FilterSchema,
  values: FilterValues,
  bindings: FilterBindings,
): T {
  let next = builder;

  for (const field of schema) {
    const value = values[field.param];
    const binding = bindings[field.param];

    // Nothing set: no binding needed, whatever the schema says.
    const isEmpty =
      value === undefined ||
      (typeof value === "string" && value === "") ||
      (Array.isArray(value) && value.length === 0) ||
      (field.kind === "range" &&
        (value as RangeValue).min === undefined &&
        (value as RangeValue).max === undefined);
    if (isEmpty) continue;

    if (!binding) {
      // An active filter with nowhere to go would silently return unfiltered results, which
      // looks like working software and is not. Fail loudly instead.
      throw new Error(
        `Filter "${field.param}" is set but has no binding — add one to the list's FilterBindings or mark it { type: "external" }.`,
      );
    }

    if (binding.type === "external") continue;

    switch (binding.type) {
      case "ilike":
        next = next.ilike(
          binding.column,
          `%${escapeLikePattern(String(value))}%`,
        );
        break;
      case "eq":
        next = next.eq(binding.column, String(value));
        break;
      case "in":
        next = next.in(binding.column, value as string[]);
        break;
      case "range": {
        const range = value as RangeValue;
        if (range.min !== undefined) next = next.gte(binding.column, range.min);
        if (range.max !== undefined) next = next.lte(binding.column, range.max);
        break;
      }
    }
  }

  return next;
}
