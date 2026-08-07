import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { CategoryForm } from "@/components/categories/category-form";
import {
  categorySelect,
  normalizeCategory,
  type CategoryQueryRow,
} from "@/lib/category-data";
import { createClient } from "@/lib/server";
import { decodeSlugParam } from "@/lib/slug";

export const metadata: Metadata = {
  title: "კატალოგის რედაქტირება | Home Mix ადმინისტრაცია",
};

type EditCategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function EditCategoryPage({
  params,
}: EditCategoryPageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlugParam(rawSlug);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select(categorySelect)
    .eq("slug", slug)
    .maybeSingle();
  const category = data
    ? normalizeCategory(data as CategoryQueryRow)
    : null;

  if (error || !category) {
    notFound();
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-5 pb-32 pt-5 lg:px-8 lg:pb-16 lg:pt-12">
      <Link
        href={`/category/${category.slug}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#605e5b] transition-colors hover:text-[#7f512f]"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        კატალოგის დეტალებზე დაბრუნება
      </Link>

      <div className="mt-5">
        <h1 className="text-3xl font-bold tracking-[-0.02em] lg:text-5xl">
          კატალოგის რედაქტირება
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#605e5b] lg:text-base">
          განაახლეთ კატალოგის ტექსტი, დაამატეთ ახალი ფოტოები ან წაშალეთ
          არსებული.
        </p>
      </div>

      <CategoryForm mode="edit" category={category} />
    </section>
  );
}
