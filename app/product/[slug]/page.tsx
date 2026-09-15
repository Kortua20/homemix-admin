import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ImageOff, Pencil } from "lucide-react";
import { notFound } from "next/navigation";

import { DeleteProductButton } from "@/components/products/delete-product-button";
import { ProductStatusBadge } from "@/components/products/product-status-badge";
import {
  formatPrice,
  getProductImageUrl,
  LISTING_KIND_LABELS,
  normalizeProduct,
  productSelect,
} from "@/lib/product-data";
import { createClient } from "@/lib/server";
import { decodeSlugParam } from "@/lib/slug";

export const metadata: Metadata = {
  title: "პროდუქტის დეტალები | Home Mix ადმინისტრაცია",
};

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlugParam(rawSlug);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(productSelect)
    .eq("slug", slug)
    .maybeSingle();
  const product = data ? normalizeProduct(data) : null;

  if (error || !product) {
    notFound();
  }

  return (
    <section className="px-5 pb-32 pt-5 lg:px-8 lg:pb-16 lg:pt-12 xl:px-16">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#605e5b] transition-colors hover:text-[#7f512f]"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        პროდუქტებზე დაბრუნება
      </Link>

      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold text-[#7f512f]">
              {product.category.name}
            </p>
            <ProductStatusBadge status={product.status} />
          </div>
          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-[-0.02em] lg:text-5xl">
            {product.name}
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:flex lg:shrink-0">
          <Link
            href={`/product/${product.slug}/edit`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#7f512f] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#6d4528]"
          >
            <Pencil aria-hidden="true" className="size-4" />
            რედაქტირება
          </Link>
          <DeleteProductButton
            productId={product.id}
            productName={product.name}
            redirectAfterDelete
          />
        </div>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] lg:items-start">
        {product.images.length > 0 ? (
          <section
            aria-labelledby="product-photo-heading"
            className="rounded-3xl bg-white p-3 shadow-[0_16px_30px_rgba(0,0,0,0.04)] lg:p-4"
          >
            <h2 id="product-photo-heading" className="sr-only">
              პროდუქტის ფოტოები
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {product.images.map((image, index) => (
                <div
                  key={image.id}
                  className={
                    index === 0
                      ? "col-span-2 aspect-4/3 overflow-hidden rounded-2xl bg-[#f0eded]"
                      : "aspect-square overflow-hidden rounded-2xl bg-[#f0eded]"
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getProductImageUrl(image.id)}
                    alt={`${product.name} — ფოტო ${index + 1}`}
                    className="size-full object-cover"
                  />
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section
            aria-labelledby="product-photo-heading"
            className="flex min-h-72 flex-col items-center justify-center rounded-3xl bg-white p-8 text-center shadow-[0_16px_30px_rgba(0,0,0,0.04)] lg:min-h-115"
          >
            <ImageOff aria-hidden="true" className="size-12 text-[#a89082]" />
            <h2 id="product-photo-heading" className="mt-4 text-xl font-bold">
              ფოტოები ჯერ არ არის
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[#605e5b]">
              ფოტოების დამატება პროდუქტის რედაქტირების გვერდიდან შეგიძლიათ.
            </p>
          </section>
        )}

        <div className="grid gap-4">
          <section
            aria-labelledby="general-information-heading"
            className="rounded-3xl bg-white p-5 shadow-[0_16px_30px_rgba(0,0,0,0.04)] lg:p-7"
          >
            <h2 id="general-information-heading" className="text-xl font-bold">
              ზოგადი ინფორმაცია
            </h2>
            <dl className="mt-5 divide-y divide-[#e4e2e1]">
              <div className="flex items-center justify-between gap-4 py-4 first:pt-0">
                <dt className="text-sm text-[#605e5b]">დასახელება</dt>
                <dd className="max-w-[65%] text-right text-sm font-semibold">
                  {product.name}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-4">
                <dt className="text-sm text-[#605e5b]">კატალოგი</dt>
                <dd className="text-right text-sm font-semibold">
                  {product.category.name}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-4">
                <dt className="text-sm text-[#605e5b]">ტიპი</dt>
                <dd className="text-right text-sm font-semibold">
                  {LISTING_KIND_LABELS[product.listingKind]}
                </dd>
              </div>
              {product.listingKind === "new_stocked" ? (
                <div className="flex items-center justify-between gap-4 py-4">
                  <dt className="text-sm text-[#605e5b]">მარაგი</dt>
                  <dd className="text-right text-sm font-semibold">
                    {product.stockQuantity ?? 0}
                  </dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4 pb-0 pt-4">
                <dt className="text-sm text-[#605e5b]">ფასი</dt>
                <dd className="text-xl font-bold text-[#7f512f]">
                  {formatPrice(product.price)} ₾
                </dd>
              </div>
            </dl>
          </section>

          {product.dimensions.widthCm !== null ||
          product.dimensions.depthCm !== null ||
          product.dimensions.heightCm !== null ||
          product.dimensions.seatHeightCm !== null ||
          product.dimensions.weightKg !== null ||
          product.dimensions.note ? (
            <section
              aria-labelledby="product-dimensions-heading"
              className="rounded-3xl bg-white p-5 shadow-[0_16px_30px_rgba(0,0,0,0.04)] lg:p-7"
            >
              <h2 id="product-dimensions-heading" className="text-xl font-bold">
                ზომები
              </h2>
              <dl className="mt-5 divide-y divide-[#e4e2e1]">
                {(
                  [
                    ["სიგანე", product.dimensions.widthCm, "სმ"],
                    ["სიღრმე", product.dimensions.depthCm, "სმ"],
                    ["სიმაღლე", product.dimensions.heightCm, "სმ"],
                    ["ჯდომის სიმაღლე", product.dimensions.seatHeightCm, "სმ"],
                    ["წონა", product.dimensions.weightKg, "კგ"],
                  ] as const
                )
                  .filter(([, value]) => value !== null)
                  .map(([label, value, unit]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-4 py-4 first:pt-0"
                    >
                      <dt className="text-sm text-[#605e5b]">{label}</dt>
                      <dd className="text-right text-sm font-semibold">
                        {value} {unit}
                      </dd>
                    </div>
                  ))}
              </dl>
              {product.dimensions.note ? (
                <p className="mt-4 border-t border-[#e4e2e1] pt-4 text-sm leading-6 text-[#605e5b]">
                  {product.dimensions.note}
                </p>
              ) : null}
            </section>
          ) : null}

          {product.conditionGrade ? (
            <section
              aria-labelledby="product-condition-heading"
              className="rounded-3xl bg-white p-5 shadow-[0_16px_30px_rgba(0,0,0,0.04)] lg:p-7"
            >
              <h2 id="product-condition-heading" className="text-xl font-bold">
                მდგომარეობა
              </h2>
              <p className="mt-3 text-sm font-semibold text-[#1b1c1c]">
                {product.conditionGrade.labelKa}
              </p>
              <p className="mt-1 text-sm leading-6 text-[#605e5b]">
                {product.conditionGrade.descriptionKa}
              </p>
              {product.conditionSummary ? (
                <p className="mt-4 whitespace-pre-wrap border-t border-[#e4e2e1] pt-4 text-[15px] leading-7 text-[#605e5b]">
                  {product.conditionSummary}
                </p>
              ) : (
                <p className="mt-4 border-t border-[#e4e2e1] pt-4 text-sm leading-6 text-[#8a6d1f]">
                  ნაკლოვანებების აღწერა ჯერ არ არის დამატებული.
                </p>
              )}
            </section>
          ) : null}

          <section
            aria-labelledby="product-description-heading"
            className="rounded-3xl bg-white p-5 shadow-[0_16px_30px_rgba(0,0,0,0.04)] lg:p-7"
          >
            <h2 id="product-description-heading" className="text-xl font-bold">
              აღწერა
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-[#605e5b]">
              {product.description || "აღწერა არ არის დამატებული."}
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
