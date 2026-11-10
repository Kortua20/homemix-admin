import type { QueryData, SupabaseClient } from "@supabase/supabase-js";

import type {
  FoldingMechanism,
  FoldingMechanismGroup,
} from "@/components/products/types";
import type { Database } from "@/lib/database.types";

// Same shape as lib/attribute-data.ts: the select is a literal so QueryData can read the
// row type off it, and the normaliser maps snake_case to the form's camelCase.
export const foldingMechanismSelect = `code, sort_order, group_code, label_ka, label_en`;

function foldingMechanismQuery(supabase: SupabaseClient<Database>) {
  return supabase.from("folding_mechanisms").select(foldingMechanismSelect);
}

type FoldingMechanismQueryRow = QueryData<
  ReturnType<typeof foldingMechanismQuery>
>[number];

// Labels for the two dropdown sections. The database constrains group_code to these two
// values (folding_mechanisms_group_code_check); this only names them.
export const FOLDING_MECHANISM_GROUP_LABELS: Record<FoldingMechanismGroup, string> = {
  seating: "დივანი / სავარძელი",
  table: "მაგიდა / სხვა",
};

export function normalizeFoldingMechanisms(
  rows: FoldingMechanismQueryRow[],
): FoldingMechanism[] {
  return rows.map((row) => ({
    code: row.code,
    sortOrder: row.sort_order,
    // Narrowed by the CHECK constraint, not by the generated type, which sees plain text.
    groupCode: row.group_code as FoldingMechanismGroup,
    labelKa: row.label_ka,
    labelEn: row.label_en,
  }));
}
