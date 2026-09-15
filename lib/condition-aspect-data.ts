import type { QueryData, SupabaseClient } from "@supabase/supabase-js";

import type { ConditionAspect } from "@/components/products/types";
import type { Database } from "@/lib/database.types";

export const conditionAspectSelect = `
  code,
  sort_order,
  label_ka,
  label_en,
  description_ka
`;

// Derived from the query itself, matching lib/condition-grade-data.ts.
function conditionAspectQuery(supabase: SupabaseClient<Database>) {
  return supabase.from("condition_aspects").select(conditionAspectSelect);
}

export type ConditionAspectQueryRow = QueryData<
  ReturnType<typeof conditionAspectQuery>
>[number];

export function normalizeConditionAspect(
  row: ConditionAspectQueryRow,
): ConditionAspect {
  return {
    code: row.code,
    sortOrder: row.sort_order,
    labelKa: row.label_ka,
    labelEn: row.label_en,
    descriptionKa: row.description_ka,
  };
}

export function normalizeConditionAspects(
  rows: ConditionAspectQueryRow[],
): ConditionAspect[] {
  return rows.map(normalizeConditionAspect);
}
