"use client";

import { FolderPlus, ImageOff, Pencil, Plus } from "lucide-react";
import Link from "next/link";

import { DeleteCategoryButton } from "@/components/categories/delete-category-button";
import type { Category } from "@/components/categories/types";
import { getCategoryImageUrl } from "@/lib/category-data";

type CategoriesManagerProps = {
  categories: Category[];
};

function CategoryCard({ category }: { category: Category }) {
  const coverImage = category.images[0];

  return (
    <article className="overflow-hidden rounded-3xl bg-white shadow-[0_16px_30px_rgba(0,0,0,0.04)]">
      <Link
        href={`/category/${category.slug}`}
        className="block aspect-4/3 bg-[#f0eded]"
      >
        {coverImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={getCategoryImageUrl(coverImage.id)}
            alt={category.name}
            className="size-full object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-[#a89082]">
            <ImageOff aria-hidden="true" className="size-9" />
          </span>
        )}
      </Link>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              href={`/category/${category.slug}`}
              className="block truncate text-2xl font-bold tracking-[-0.02em] text-[#1b1c1c] transition-colors hover:text-[#7f512f]"
            >
              {category.name}
            </Link>
            <p className="mt-1 text-sm font-medium text-[#83746b]">
              /{category.slug}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Link
              href={`/category/${category.slug}/edit`}
              aria-label={`${category.name} — რედაქტირება`}
              className="flex size-8 items-center justify-center rounded-lg text-[#605e5b] transition-colors hover:bg-[#f6f3f2] hover:text-[#7f512f]"
            >
              <Pencil aria-hidden="true" className="size-4" />
            </Link>
            <DeleteCategoryButton
              categoryId={category.id}
              categoryName={category.name}
              compact
            />
          </div>
        </div>

        <p className="mt-4 line-clamp-2 min-h-11 text-sm leading-6 text-[#605e5b]">
          {category.description || "აღწერა არ არის დამატებული."}
        </p>

        <p className="mt-5 text-xs font-semibold text-[#83746b]">
          {category.images.length} ფოტო
        </p>
      </div>
    </article>
  );
}

export function CategoriesManager({ categories }: CategoriesManagerProps) {
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.02em] text-[#1b1c1c] lg:text-5xl">
            კატალოგი
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#605e5b] lg:text-base">
            მართეთ კატალოგის დასახელება, აღწერა და ფოტოები.
          </p>
        </div>
        <Link
          href="/category/new"
          className="inline-flex h-11.5 w-full items-center justify-center gap-2 rounded-lg bg-[#7f512f] px-5 text-sm font-semibold text-white sm:w-auto"
        >
          <Plus aria-hidden="true" className="size-4.5" />
          კატალოგის დამატება
        </Link>
      </div>

      {categories.length > 0 ? (
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      ) : (
        <div className="mt-7 rounded-3xl bg-white px-6 py-16 text-center shadow-[0_16px_30px_rgba(0,0,0,0.04)]">
          <FolderPlus
            aria-hidden="true"
            className="mx-auto size-10 text-[#83746b]"
          />
          <h2 className="mt-4 text-xl font-bold">კატალოგი ჯერ არ არის</h2>
          <p className="mt-2 text-sm text-[#605e5b]">
            პირველი კატალოგის შესაქმნელად დააჭირეთ დამატების ღილაკს.
          </p>
          <Link
            href="/category/new"
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#7f512f] px-5 text-sm font-semibold text-white"
          >
            <Plus aria-hidden="true" className="size-4" />
            კატალოგის დამატება
          </Link>
        </div>
      )}
    </>
  );
}
