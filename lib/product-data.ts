import type { QueryData, SupabaseClient } from "@supabase/supabase-js";

import type {
  ListingKind,
  Product,
  ProductImage,
  ProductStatus,
} from "@/components/products/types";
import type { Database } from "@/lib/database.types";
import {
  applyFilterBindings,
  type FilterBindings,
  type FilterableQuery,
} from "@/lib/filters/query";
import {
  asList,
  type FilterSchema,
  type FilterValues,
} from "@/lib/filters/types";

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

// What the dashboard grid renders, and nothing more.
//
// productSelect above exists for the edit form, which genuinely needs every flaw, aspect
// and attribute code. The grid shows a photo, a name, a category, a price and a status
// badge — dragging the full shape through it means the whole catalogue's condition detail
// crosses the wire to render a card that ignores it.
//
// Same literal-string rule as productSelect: QueryData reads the type off the literal, so
// this must not be built by a function.
export const productListSelect = `
  id,
  slug,
  name,
  price,
  status,
  created_at,
  category:categories!products_category_id_fkey ( id, name, slug ),
  images:product_images ( id, sort_order, created_at )
`;

// Derived from the query itself rather than hand-written, so a schema change shows up
// here as a type error instead of being silently papered over at each call site.
function productQuery(supabase: SupabaseClient<Database>) {
  return supabase.from("products").select(productSelect);
}

function productListQuery(supabase: SupabaseClient<Database>) {
  return supabase.from("products").select(productListSelect);
}

export type ProductQueryRow = QueryData<ReturnType<typeof productQuery>>[number];
type ProductListQueryRow = QueryData<
  ReturnType<typeof productListQuery>
>[number];

// The grid's row shape. Deliberately not a subset of Product: it carries `leadImageId`
// rather than an images array, because the cards read images[0] and nothing else.
export type ProductListItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  status: ProductStatus;
  categoryName: string;
  leadImageId: string | null;
};

export type ProductListPage = {
  items: ProductListItem[];
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
};

// 24: divides evenly by the grid's 3 and 4 column counts, so the last full row is never
// ragged at either breakpoint.
export const DASHBOARD_PAGE_SIZE = 24;

function normalizeProductListItem(
  row: ProductListQueryRow,
): ProductListItem | null {
  // Matches normalizeProduct's treatment of a missing category: the join is required by the
  // schema, so a null here means a row mid-write or a broken FK, and rendering it as a card
  // with a blank category is worse than leaving it out.
  if (!row.category) return null;

  // Sorted rather than trusting PostgREST's order, so the card's photo is the one the
  // gallery leads with.
  const images = [...row.images].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    price: Number(row.price),
    status: row.status as ProductStatus,
    categoryName: row.category.name,
    leadImageId: images[0]?.id ?? null,
  };
}

// Clamps a raw `?page=` value to a real page. Bottom only — the total is not known until
// the query runs, so an over-large page returns no rows and the caller decides what that
// means.
export function parsePageParam(value: string | undefined) {
  const parsed = Number((value ?? "").trim());
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

// How each filter param reaches the database. Paired with the schema in
// lib/filters/product-filters.ts — the schema says what a filter is and how it renders,
// this says which column it hits.
//
// materials/colours/styles are "external": they live in join tables, so they cannot be
// expressed as a column filter and are resolved to a set of product ids first — the same
// approach as the storefront's getProductIdsMatchingFacets, and for the same reason
// (PostgREST ANDs across embedded tables, which would also constrain what comes back).
export const productFilterBindings: FilterBindings = {
  q: { type: "ilike", column: "name" },
  status: { type: "in", column: "status" },
  category: { type: "eq", column: "category_id" },
  kind: { type: "eq", column: "listing_kind" },
  price: { type: "range", column: "price" },
  width: { type: "range", column: "width_cm" },
  height: { type: "range", column: "height_cm" },
  materials: { type: "external" },
  colours: { type: "external" },
  styles: { type: "external" },
};

// Resolves the attribute facets to the set of product ids carrying all of them.
//
// Each vocabulary is its own query and the results are intersected in JS, mirroring the
// storefront's getProductIdsMatchingFacets — PostgREST ANDs filters across different
// embedded tables, so expressing "oak AND grey AND modern" in one query would need three
// !inner joins that also constrain what comes back in the embedded arrays.
//
// Returns null when no attribute facet is active, meaning "do not constrain by id".
async function getProductIdsMatchingAttributes(
  supabase: SupabaseClient<Database>,
  materials: string[],
  colours: string[],
  styles: string[],
): Promise<string[] | null> {
  if (
    materials.length === 0 &&
    colours.length === 0 &&
    styles.length === 0
  ) {
    return null;
  }

  // Written out per table rather than looped: the typed client needs a literal table name,
  // and abstracting over it collapses the row type to an error union.
  const groups: Set<string>[] = [];

  if (materials.length > 0) {
    const { data, error } = await supabase
      .from("product_materials")
      .select("product_id")
      .in("material_code", materials);
    if (error)
      throw new Error("Product attribute filter failed", { cause: error });
    groups.push(new Set((data ?? []).map((row) => String(row.product_id))));
  }

  if (colours.length > 0) {
    const { data, error } = await supabase
      .from("product_colours")
      .select("product_id")
      .in("colour_code", colours);
    if (error)
      throw new Error("Product attribute filter failed", { cause: error });
    groups.push(new Set((data ?? []).map((row) => String(row.product_id))));
  }

  if (styles.length > 0) {
    const { data, error } = await supabase
      .from("product_styles")
      .select("product_id")
      .in("style_code", styles);
    if (error)
      throw new Error("Product attribute filter failed", { cause: error });
    groups.push(new Set((data ?? []).map((row) => String(row.product_id))));
  }

  // AND across vocabularies, OR within one: "oak or walnut, in grey" is what facets are
  // expected to mean. reduce with no seed is safe — groups is non-empty by the guard above.
  return [
    ...groups.reduce((acc, set) => new Set([...acc].filter((id) => set.has(id)))),
  ];
}

// The dashboard list. Every filter runs in SQL rather than over a fetched array: with
// paging in place, filtering client-side would only ever search the current page, which
// looks like working search that silently cannot find most products.
//
// Schema-driven — the filters it applies come from the caller's FilterSchema plus
// productFilterBindings, not from a hardcoded list here.
export async function getDashboardProducts(
  supabase: SupabaseClient<Database>,
  {
    schema,
    values,
    page = 1,
  }: { schema: FilterSchema; values: FilterValues; page?: number },
): Promise<ProductListPage> {
  const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  const from = (safePage - 1) * DASHBOARD_PAGE_SIZE;
  const empty: ProductListPage = {
    items: [],
    total: 0,
    page: safePage,
    perPage: DASHBOARD_PAGE_SIZE,
    pageCount: 0,
  };

  // The join-table facets resolve to ids first; the column filters are applied generically.
  const attributeIds = await getProductIdsMatchingAttributes(
    supabase,
    asList(values, "materials"),
    asList(values, "colours"),
    asList(values, "styles"),
  );

  // An empty set means "nothing matches", which is different from null ("no facet active")
  // and must short-circuit rather than fall through to an unfiltered query.
  if (attributeIds !== null && attributeIds.length === 0) return empty;

  // One applier for both the page fetch and the count fallback: the two disagreeing about
  // what matches is how a pager ends up advertising pages that turn out to be empty.
  const applyAll = <T extends FilterableQuery<T>>(builder: T): T => {
    const next = applyFilterBindings(
      builder,
      schema,
      values,
      productFilterBindings,
    );
    return attributeIds === null ? next : next.in("id", attributeIds);
  };

  // Unlike the storefront this lists every status, so it sorts on the full-table
  // products_created_at_idx rather than the available-only partial index. The id tiebreak
  // makes the order total, which is what keeps offset paging from duplicating or skipping
  // rows that share a created_at.
  const { data, error, count } = await applyAll(
    supabase.from("products").select(productListSelect, { count: "exact" }),
  )
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(from, from + DASHBOARD_PAGE_SIZE - 1);

  if (error) {
    // PGRST103 is PostgREST's "range not satisfiable" — a `?page=` past the last page, which
    // is a stale link rather than a failure. See the storefront's getCatalogProducts for the
    // full note; the count is null on that response, so it is re-fetched head-only.
    if (error.code !== "PGRST103") {
      throw new Error("Dashboard products could not be loaded", {
        cause: error,
      });
    }

    const { count: fallbackCount, error: countError } = await applyAll(
      supabase.from("products").select("id", { count: "exact", head: true }),
    );

    return { ...empty, total: countError ? 0 : (fallbackCount ?? 0) };
  }

  const total = count ?? 0;

  return {
    items: (data ?? [])
      .map(normalizeProductListItem)
      .filter((item): item is ProductListItem => item !== null),
    total,
    page: safePage,
    perPage: DASHBOARD_PAGE_SIZE,
    pageCount: Math.ceil(total / DASHBOARD_PAGE_SIZE),
  };
}

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
