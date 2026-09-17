import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { ProductForm } from "@/components/products/product-form";
import {
  colourSelect,
  materialSelect,
  normalizeColours,
  normalizeMaterials,
  normalizeStyles,
  styleSelect,
} from "@/lib/attribute-data";
import {
  conditionAspectSelect,
  normalizeConditionAspects,
} from "@/lib/condition-aspect-data";
import {
  conditionGradeSelect,
  normalizeConditionGrades,
} from "@/lib/condition-grade-data";
import { normalizeProduct, productSelect } from "@/lib/product-data";
import { createClient } from "@/lib/server";
import { decodeSlugParam } from "@/lib/slug";

export const metadata: Metadata = {
  title: "პროდუქტის რედაქტირება | Home Mix ადმინისტრაცია",
};

type EditProductPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlugParam(rawSlug);
  const supabase = await createClient();
  const [
    productResult,
    categoriesResult,
    gradesResult,
    aspectsResult,
    materialsResult,
    coloursResult,
    stylesResult,
  ] = await Promise.all([
    supabase
      .from("products")
      .select(productSelect)
      .eq("slug", slug)
      .maybeSingle(),
    supabase.from("categories").select("id, name, slug").order("name"),
    supabase
      .from("condition_grades")
      .select(conditionGradeSelect)
      .order("sort_order"),
    supabase
      .from("condition_aspects")
      .select(conditionAspectSelect)
      .order("sort_order"),
    supabase.from("materials").select(materialSelect).order("sort_order"),
    supabase.from("colours").select(colourSelect).order("sort_order"),
    supabase.from("styles").select(styleSelect).order("sort_order"),
  ]);
  const product = productResult.data
    ? normalizeProduct(productResult.data)
    : null;
  const gradesError = gradesResult.error || (gradesResult.data ?? []).length === 0;

  if (productResult.error || !product) {
    notFound();
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-5 pb-32 pt-5 lg:px-8 lg:pb-16 lg:pt-12">
      <Link
        href={`/product/${product.slug}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-quiet-ink transition-colors hover:text-walnut"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        პროდუქტის დეტალებზე დაბრუნება
      </Link>

      <div className="mt-5">
        <h1 className="text-3xl font-bold tracking-[-0.02em] lg:text-5xl">
          პროდუქტის რედაქტირება
        </h1>
        <p className="mt-2 text-sm leading-6 text-quiet-ink lg:text-base">
          განაახლეთ პროდუქტის ინფორმაცია, დაამატეთ ახალი ფოტოები ან წაშალეთ
          არსებული.
        </p>
      </div>

      {categoriesResult.error || gradesError ? (
        <div className="mt-7 rounded-3xl bg-white px-6 py-14 text-center shadow-[0_16px_30px_rgba(0,0,0,0.04)]">
          <AlertCircle
            aria-hidden="true"
            className="mx-auto size-9 text-destructive"
          />
          <h2 className="mt-4 text-xl font-bold">
            {categoriesResult.error
              ? "კატალოგი ვერ ჩაიტვირთა"
              : "მდგომარეობის სია ვერ ჩაიტვირთა"}
          </h2>
          <p className="mt-2 text-sm text-quiet-ink">
            რედაქტირებისთვის განაახლეთ გვერდი და კიდევ სცადეთ.
          </p>
        </div>
      ) : (
        <ProductForm
          mode="edit"
          product={product}
          categories={categoriesResult.data ?? []}
          conditionGrades={normalizeConditionGrades(gradesResult.data ?? [])}
          conditionAspects={normalizeConditionAspects(aspectsResult.data ?? [])}
          materials={normalizeMaterials(materialsResult.data ?? [])}
          colours={normalizeColours(coloursResult.data ?? [])}
          styles={normalizeStyles(stylesResult.data ?? [])}
        />
      )}
    </section>
  );
}
