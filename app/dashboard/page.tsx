import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProductsDashboard } from "@/components/dashboard/products-dashboard";
import { normalizeCategories } from "@/lib/category-data";
import { categorySelect } from "@/lib/category-data";
import {
  colourSelect,
  materialSelect,
  normalizeColours,
  normalizeMaterials,
  normalizeStyles,
  styleSelect,
} from "@/lib/attribute-data";
import { buildProductFilterSchema } from "@/lib/filters/product-filters";
import { parseFilters } from "@/lib/filters/url";
import {
  getDashboardProducts,
  parsePageParam,
  type ProductListPage,
} from "@/lib/product-data";
import { createClient } from "@/lib/server";

export const metadata: Metadata = {
  title: "პროდუქტები | Home Mix ადმინისტრაცია",
};

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();

  if (!authData?.claims) {
    redirect("/");
  }

  // The filter vocabularies. Fetched in parallel with each other because none depends on
  // another, and they are small closed sets rather than user data.
  const [categoryRows, materialRows, colourRows, styleRows] = await Promise.all([
    supabase.from("categories").select(categorySelect).order("name"),
    supabase.from("materials").select(materialSelect).order("sort_order"),
    supabase.from("colours").select(colourSelect).order("sort_order"),
    supabase.from("styles").select(styleSelect).order("sort_order"),
  ]);

  const schema = buildProductFilterSchema({
    categories: normalizeCategories(categoryRows.data ?? []).map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
    })),
    materials: normalizeMaterials(materialRows.data ?? []),
    colours: normalizeColours(colourRows.data ?? []),
    styles: normalizeStyles(styleRows.data ?? []),
  });

  // Filters and page live in the URL rather than in component state: the query runs in SQL,
  // so the server has to see them. It also makes a filtered view something you can reload,
  // bookmark or send to someone.
  const params = await searchParams;
  const values = parseFilters(schema, params);
  const page = parsePageParam(firstValue(params.page));

  const result: ProductListPage | null = await getDashboardProducts(supabase, {
    schema,
    values,
    page,
  }).catch(() => null);

  return (
    <ProductsDashboard
      result={result}
      schema={schema}
      values={values}
      loadError={result === null}
    />
  );
}
