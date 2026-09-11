import type { QueryData, SupabaseClient } from "@supabase/supabase-js";

import type { Product, ProductImage } from "@/components/products/types";
import type { Database } from "@/lib/database.types";

export const productSelect = `
  id,
  slug,
  name,
  description,
  price,
  category_id,
  created_at,
  updated_at,
  category:categories!products_category_id_fkey (
    id,
    name,
    slug
  ),
  images:product_images (
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
function productQuery(supabase: SupabaseClient<Database>) {
  return supabase.from("products").select(productSelect);
}

export type ProductQueryRow = QueryData<ReturnType<typeof productQuery>>[number];

type ProductImageQueryRow = ProductQueryRow["images"][number];

function normalizeProductImage(row: ProductImageQueryRow): ProductImage {
  return {
    id: row.id,
    originalName: row.original_name,
    contentType: row.content_type,
    sizeBytes: Number(row.size_bytes),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export function normalizeProduct(row: ProductQueryRow): Product | null {
  const category = row.category;

  if (!category) {
    return null;
  }

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    categoryId: row.category_id,
    category,
    images: (row.images ?? [])
      .map(normalizeProductImage)
      .sort(
        (first, second) =>
          first.sortOrder - second.sortOrder ||
          first.createdAt.localeCompare(second.createdAt),
      ),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function normalizeProducts(rows: ProductQueryRow[]): Product[] {
  return rows
    .map(normalizeProduct)
    .filter((product): product is Product => product !== null);
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat("ka-GE", {
    minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export function getProductImageUrl(imageId: string) {
  return `/api/product-images/${imageId}`;
}
