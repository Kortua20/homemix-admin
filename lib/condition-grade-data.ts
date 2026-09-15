import type { QueryData, SupabaseClient } from "@supabase/supabase-js";

import type { ConditionGrade } from "@/components/products/types";
import type { Database } from "@/lib/database.types";

export const conditionGradeSelect = `
  code,
  sort_order,
  label_ka,
  label_en,
  description_ka
`;

// Derived from the query itself rather than hand-written, matching lib/category-data.ts.
function conditionGradeQuery(supabase: SupabaseClient<Database>) {
  return supabase.from("condition_grades").select(conditionGradeSelect);
}

export type ConditionGradeQueryRow = QueryData<
  ReturnType<typeof conditionGradeQuery>
>[number];

export function normalizeConditionGrade(
  row: ConditionGradeQueryRow,
): ConditionGrade {
  return {
    code: row.code,
    sortOrder: row.sort_order,
    labelKa: row.label_ka,
    labelEn: row.label_en,
    descriptionKa: row.description_ka,
  };
}

export function normalizeConditionGrades(
  rows: ConditionGradeQueryRow[],
): ConditionGrade[] {
  return rows.map(normalizeConditionGrade);
}
