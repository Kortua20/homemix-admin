import type { QueryData, SupabaseClient } from "@supabase/supabase-js";

import type {
  ListingKind,
  Product,
  ProductImage,
  ProductStatus,
} from "@/components/products/types";
import type { Database } from "@/lib/database.types";

export const productSelect = `
  id,
  slug,
  name,
  description,
  price,
  compare_at_price,
  category_id,
  created_at,
  updated_at,
  published_at,
  status,
  listing_kind,
  condition_summary,
  stock_quantity,
  width_cm,
  depth_cm,
  height_cm,
  seat_height_cm,
  weight_kg,
  dimension_note,
  conditionGrade:condition_grades!products_condition_grade_fkey (
    code,
    sort_order,
    label_ka,
    label_en,
    description_ka
  ),
  conditionAspects:product_condition_aspects (
    aspect_code,
    grade_code,
    note
  ),
  flaws:product_flaws (
    id,
    image_id,
    flaw_type,
    severity,
    location_ka,
    note_ka,
    sort_order
  ),
  materials:product_materials ( material_code ),
  colours:product_colours ( colour_code ),
  styles:product_styles ( style_code ),
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

  const grade = row.conditionGrade;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    // Number(null) is 0, which would turn "not discounted" into a compare-at price of zero
    // — the same guard the dimensions below need, for the same reason.
    compareAtPrice:
      row.compare_at_price === null ? null : Number(row.compare_at_price),
    publishedAt: row.published_at,
    categoryId: row.category_id,
    category,
    images: (row.images ?? [])
      .map(normalizeProductImage)
      .sort(
        (first, second) =>
          first.sortOrder - second.sortOrder ||
          first.createdAt.localeCompare(second.createdAt),
      ),
    status: row.status as ProductStatus,
    listingKind: row.listing_kind as ListingKind,
    conditionGrade: grade
      ? {
          code: grade.code,
          sortOrder: grade.sort_order,
          labelKa: grade.label_ka,
          labelEn: grade.label_en,
          descriptionKa: grade.description_ka,
        }
      : null,
    conditionSummary: row.condition_summary ?? "",
    stockQuantity: row.stock_quantity === null ? null : Number(row.stock_quantity),
    conditionAspects: (row.conditionAspects ?? []).map((aspect) => ({
      aspectCode: aspect.aspect_code,
      gradeCode: aspect.grade_code,
      note: aspect.note,
    })),
    flaws: (row.flaws ?? [])
      .map((flaw) => ({
        id: flaw.id,
        imageId: flaw.image_id,
        flawType: flaw.flaw_type,
        severity: flaw.severity,
        locationKa: flaw.location_ka,
        noteKa: flaw.note_ka,
        sortOrder: flaw.sort_order,
      }))
      .sort((first, second) => first.sortOrder - second.sortOrder),
    // Only the codes are needed here: the form renders checkboxes against the full
    // vocabulary and marks these as selected. The labels come from the vocabulary fetch,
    // so embedding the lookup rows too would be redundant.
    materialCodes: (row.materials ?? []).map((m) => m.material_code),
    colourCodes: (row.colours ?? []).map((c) => c.colour_code),
    styleCodes: (row.styles ?? []).map((s) => s.style_code),
    // Number(null) is 0, so each field is guarded: a missing measurement must stay null.
    dimensions: {
      widthCm: row.width_cm === null ? null : Number(row.width_cm),
      depthCm: row.depth_cm === null ? null : Number(row.depth_cm),
      heightCm: row.height_cm === null ? null : Number(row.height_cm),
      seatHeightCm:
        row.seat_height_cm === null ? null : Number(row.seat_height_cm),
      weightKg: row.weight_kg === null ? null : Number(row.weight_kg),
      note: row.dimension_note,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function normalizeProducts(rows: ProductQueryRow[]): Product[] {
  return rows
    .map(normalizeProduct)
    .filter((product): product is Product => product !== null);
}

// "en-US" rather than "ka-GE" on purpose: ICU versions disagree on whether
// Georgian groups thousands, so "ka-GE" renders 2450 on the server and 2,450 in
// the browser and breaks hydration. en-US groups identically to what we want
// here (comma thousands, dot decimals) and is stable across ICU versions.
export function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export function getProductImageUrl(imageId: string) {
  return `/api/product-images/${imageId}`;
}

// Georgian labels for the status values. The database constrains the set; this only names
// them for display.
export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "მონახაზი",
  available: "ხელმისაწვდომი",
  reserved: "დაჯავშნილი",
  sold: "გაყიდული",
  archived: "დაარქივებული",
};

export const LISTING_KIND_LABELS: Record<ListingKind, string> = {
  used_unique: "მეორადი",
  new_stocked: "ახალი",
};
