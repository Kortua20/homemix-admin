import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ImageOff, Pencil } from "lucide-react";
import { notFound } from "next/navigation";

import { DeleteProductButton } from "@/components/products/delete-product-button";
import {
  formatPrice,
  normalizeProduct,
  productSelect,
  type ProductQueryRow,
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
  const product = data ? normalizeProduct(data as ProductQueryRow) : null;

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
          <p className="text-sm font-semibold text-[#7f512f]">
            {product.category.name}
          </p>
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
        <section
          aria-labelledby="product-photo-heading"
          className="flex min-h-72 flex-col items-center justify-center rounded-3xl bg-white p-8 text-center shadow-[0_16px_30px_rgba(0,0,0,0.04)] lg:min-h-[460px]"
        >
          <ImageOff
            aria-hidden="true"
            className="size-12 text-[#a89082]"
          />
          <h2 id="product-photo-heading" className="mt-4 text-xl font-bold">
            ფოტოები ჯერ არ არის
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[#605e5b]">
            პროდუქტის ფოტოების ატვირთვა შემდეგ ეტაპზე დაემატება.
          </p>
        </section>

        <div className="grid gap-4">
          <section
            aria-labelledby="general-information-heading"
            className="rounded-3xl bg-white p-5 shadow-[0_16px_30px_rgba(0,0,0,0.04)] lg:p-7"
          >
            <h2
              id="general-information-heading"
              className="text-xl font-bold"
            >
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
                <dt className="text-sm text-[#605e5b]">კატეგორია</dt>
                <dd className="text-right text-sm font-semibold">
                  {product.category.name}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-4">
                <dt className="text-sm text-[#605e5b]">სლაგი</dt>
                <dd className="max-w-[65%] break-all text-right text-sm font-semibold">
                  /{product.slug}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 pb-0 pt-4">
                <dt className="text-sm text-[#605e5b]">ფასი</dt>
                <dd className="text-xl font-bold text-[#7f512f]">
                  {formatPrice(product.price)} ₾
                </dd>
              </div>
            </dl>
          </section>

          <section
            aria-labelledby="product-description-heading"
            className="rounded-3xl bg-white p-5 shadow-[0_16px_30px_rgba(0,0,0,0.04)] lg:p-7"
          >
            <h2
              id="product-description-heading"
              className="text-xl font-bold"
            >
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
