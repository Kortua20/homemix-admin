import type { QueryData, SupabaseClient } from "@supabase/supabase-js";

import type { Category, CategoryImage } from "@/components/categories/types";
import type { Database } from "@/lib/database.types";

export const categorySelect = `
  id,
  slug,
  name,
  description,
  images:category_images (
    id,
    original_name,
    content_type,
    size_bytes,
    sort_order,
    created_at
  )
`;

// Derived from the query itself rather than hand-written, so a schema change shows up
// here as a type error instead of being silently papered over at each call site.
function categoryQuery(supabase: SupabaseClient<Database>) {
  return supabase.from("categories").select(categorySelect);
}

export type CategoryQueryRow = QueryData<
  ReturnType<typeof categoryQuery>
>[number];

type CategoryImageQueryRow = CategoryQueryRow["images"][number];

function normalizeCategoryImage(row: CategoryImageQueryRow): CategoryImage {
  return {
    id: row.id,
    originalName: row.original_name,
    contentType: row.content_type,
    sizeBytes: Number(row.size_bytes),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export function normalizeCategory(row: CategoryQueryRow): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    images: (row.images ?? [])
      .map(normalizeCategoryImage)
      .sort(
        (first, second) =>
          first.sortOrder - second.sortOrder ||
          first.createdAt.localeCompare(second.createdAt),
      ),
  };
}

export function normalizeCategories(rows: CategoryQueryRow[]): Category[] {
  return rows.map(normalizeCategory);
}

export function getCategoryImageUrl(imageId: string) {
  return `/api/category-images/${imageId}`;
}
