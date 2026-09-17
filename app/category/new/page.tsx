import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { CategoryForm } from "@/components/categories/category-form";

export const metadata: Metadata = {
  title: "კატალოგის შექმნა | Home Mix ადმინისტრაცია",
};

export default function NewCategoryPage() {
  return (
    <section className="mx-auto w-full max-w-5xl px-5 pb-32 pt-5 lg:px-8 lg:pb-16 lg:pt-12">
      <Link
        href="/categories"
        className="inline-flex items-center gap-2 text-sm font-semibold text-quiet-ink transition-colors hover:text-walnut"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        კატალოგზე დაბრუნება
      </Link>

      <div className="mt-5">
        <h1 className="text-3xl font-bold tracking-[-0.02em] lg:text-5xl">
          კატალოგის შექმნა
        </h1>
        <p className="mt-2 text-sm leading-6 text-quiet-ink lg:text-base">
          შეავსეთ დასახელება, აღწერა და დაამატეთ იმდენი ფოტო, რამდენიც
          საჭიროა.
        </p>
      </div>

      <CategoryForm mode="create" />
    </section>
  );
}
