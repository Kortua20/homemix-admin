import type {
  Product,
  ProductCategory,
} from "@/components/products/types";

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
  )
`;

export type ProductQueryRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number | string;
  category_id: string;
  created_at: string;
  updated_at: string;
  category: ProductCategory | ProductCategory[] | null;
};

export function normalizeProduct(row: ProductQueryRow): Product | null {
  const category = Array.isArray(row.category)
    ? row.category[0]
    : row.category;

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
