import type { Category, CategoryImage } from "@/components/categories/types";

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

type CategoryImageQueryRow = {
  id: string;
  original_name: string;
  content_type: string;
  size_bytes: number | string;
  sort_order: number;
  created_at: string;
};

export type CategoryQueryRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  images: CategoryImageQueryRow[] | null;
};

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
