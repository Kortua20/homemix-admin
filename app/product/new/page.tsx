import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";

import { ProductForm } from "@/components/products/product-form";
import {
  conditionAspectSelect,
  normalizeConditionAspects,
} from "@/lib/condition-aspect-data";
import {
  conditionGradeSelect,
  normalizeConditionGrades,
} from "@/lib/condition-grade-data";
import { createClient } from "@/lib/server";

export const metadata: Metadata = {
  title: "პროდუქტის შექმნა | Home Mix ადმინისტრაცია",
};

export default async function NewProductPage() {
  const supabase = await createClient();
  const [categoriesResult, gradesResult, aspectsResult] = await Promise.all([
    supabase.from("categories").select("id, name, slug").order("name"),
    supabase
      .from("condition_grades")
      .select(conditionGradeSelect)
      .order("sort_order"),
    supabase
      .from("condition_aspects")
      .select(conditionAspectSelect)
      .order("sort_order"),
  ]);
  const { data, error } = categoriesResult;
  // A used product cannot be created without a grade, so an empty grade list is a load
  // failure rather than an empty state.
  const gradesError = gradesResult.error || (gradesResult.data ?? []).length === 0;

  return (
    <section className="mx-auto w-full max-w-5xl px-5 pb-32 pt-5 lg:px-8 lg:pb-16 lg:pt-12">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#605e5b] transition-colors hover:text-[#7f512f]"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        პროდუქტებზე დაბრუნება
      </Link>

      <div className="mt-5">
        <h1 className="text-3xl font-bold tracking-[-0.02em] lg:text-5xl">
          პროდუქტის შექმნა
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#605e5b] lg:text-base">
          შეავსეთ პროდუქტის ძირითადი ინფორმაცია. URL-ის სლაგი დასახელებიდან
          ავტომატურად შეიქმნება; ასევე შეგიძლიათ დაამატოთ პროდუქტის ფოტოები.
        </p>
      </div>

      {error || gradesError ? (
        <div className="mt-7 rounded-3xl bg-white px-6 py-14 text-center shadow-[0_16px_30px_rgba(0,0,0,0.04)]">
          <AlertCircle
            aria-hidden="true"
            className="mx-auto size-9 text-[#c62828]"
          />
          <h2 className="mt-4 text-xl font-bold">
            {error ? "კატალოგი ვერ ჩაიტვირთა" : "მდგომარეობის სია ვერ ჩაიტვირთა"}
          </h2>
          <p className="mt-2 text-sm text-[#605e5b]">
            პროდუქტის შექმნამდე განაახლეთ გვერდი და კიდევ სცადეთ.
          </p>
        </div>
      ) : (
        <ProductForm
          mode="create"
          categories={data ?? []}
          conditionGrades={normalizeConditionGrades(gradesResult.data ?? [])}
          conditionAspects={normalizeConditionAspects(aspectsResult.data ?? [])}
        />
      )}
    </section>
  );
}
