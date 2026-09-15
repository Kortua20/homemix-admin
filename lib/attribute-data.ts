import type { QueryData, SupabaseClient } from "@supabase/supabase-js";

import type { ProductAttribute } from "@/components/products/types";
import type { Database } from "@/lib/database.types";

// Three vocabularies, one shape. Colours additionally carry a hex swatch, which the other
// two do not — so the select lists differ and `hex` stays optional on the shared type.
export const materialSelect = `code, sort_order, label_ka, label_en`;
export const colourSelect = `code, sort_order, label_ka, label_en, hex`;
export const styleSelect = `code, sort_order, label_ka, label_en`;

// Derived from the queries themselves, matching lib/condition-grade-data.ts.
function materialQuery(supabase: SupabaseClient<Database>) {
  return supabase.from("materials").select(materialSelect);
}

function colourQuery(supabase: SupabaseClient<Database>) {
  return supabase.from("colours").select(colourSelect);
}

function styleQuery(supabase: SupabaseClient<Database>) {
  return supabase.from("styles").select(styleSelect);
}

export type MaterialQueryRow = QueryData<ReturnType<typeof materialQuery>>[number];
export type ColourQueryRow = QueryData<ReturnType<typeof colourQuery>>[number];
export type StyleQueryRow = QueryData<ReturnType<typeof styleQuery>>[number];

export function normalizeMaterials(
  rows: MaterialQueryRow[],
): ProductAttribute[] {
  return rows.map((row) => ({
    code: row.code,
    sortOrder: row.sort_order,
    labelKa: row.label_ka,
    labelEn: row.label_en,
  }));
}

export function normalizeColours(rows: ColourQueryRow[]): ProductAttribute[] {
  return rows.map((row) => ({
    code: row.code,
    sortOrder: row.sort_order,
    labelKa: row.label_ka,
    labelEn: row.label_en,
    hex: row.hex,
  }));
}

export function normalizeStyles(rows: StyleQueryRow[]): ProductAttribute[] {
  return rows.map((row) => ({
    code: row.code,
    sortOrder: row.sort_order,
    labelKa: row.label_ka,
    labelEn: row.label_en,
  }));
}
