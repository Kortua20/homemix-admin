import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ImageOff, Lock, Pencil } from "lucide-react";
import { notFound } from "next/navigation";

import { DeleteProductButton } from "@/components/products/delete-product-button";
import { ProductSalesHistory } from "@/components/products/product-sales-history";
import type { Product } from "@/components/products/types";
import { ProductPhotoGallery } from "@/components/products/product-photo-gallery";
import { ProductStatusBadge } from "@/components/products/product-status-badge";
import { RecordSaleForm } from "@/components/products/record-sale-form";
import { formatMoney } from "@/lib/accounting/format";
import {
  formatPrice,
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

// Same look as the nudge links in the product form (components/products/product-form.tsx).
const NUDGE_LINK_CLASS =
  "font-semibold text-walnut underline underline-offset-2 hover:no-underline";

// Staff-only figures from product_finances and product_sales. A missing figure is shown as
// "—", never as 0, and profit is totalled only over sales whose cost is known — the count of
// those that are not is shown beside it, as on the accounting page.
function FinanceSection({ product }: { product: Product }) {
  const { finances, sales } = product;
  const isStocked = product.listingKind === "new_stocked";
  const units = sales.reduce((sum, sale) => sum + sale.quantity, 0);
  const revenue = sales.reduce((sum, sale) => sum + sale.totalPrice, 0);
  const costed = sales.filter((sale) => sale.unitCost !== null);
  const profit = costed.reduce(
    (sum, sale) => sum + sale.totalPrice - (sale.unitCost ?? 0) * sale.quantity,
    0,
  );
  const uncosted = sales.length - costed.length;
  // Straight to the field on the edit page, where useFocusHashTarget centres and focuses it.
  const editField = (fieldId: string) => `/product/${product.slug}/edit#${fieldId}`;

  const rows: [string, React.ReactNode][] = [
    [
      isStocked ? "შესყიდვის ფასი (ერთ.)" : "შესყიდვის ფასი",
      // Missing is the common case for everything that existed before this field did, and it
      // is what keeps profit unknown — so the fix is one click away, not a hunt through the
      // edit form.
      finances.purchasePrice === null ? (
        <span className="inline-flex items-center gap-2">
          <span className="text-soft-brown" aria-hidden="true">
            —
          </span>
          <Link href={editField("product-purchase-price")} className={NUDGE_LINK_CLASS}>
            <span className="sr-only">შესყიდვის ფასის </span>დამატება
          </Link>
        </span>
      ) : (
        formatMoney(finances.purchasePrice)
      ),
    ],
    ...(sales.length > 0
      ? ([
          ["გაყიდულია", `${units} ცალი`],
          ["შემოსავალი", formatMoney(revenue)],
          [
            uncosted > 0 ? "მოგება (მხოლოდ ცნობილი შესყიდვის ფასით)" : "მოგება",
            formatMoney(costed.length > 0 ? profit : null),
          ],
        ] as [string, string][])
      : []),
  ];

  return (
    <section
      aria-labelledby="product-finances-heading"
      className="rounded-3xl bg-white p-5 shadow-[0_16px_30px_rgba(0,0,0,0.04)] lg:p-7"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="product-finances-heading" className="text-xl font-bold">
          შიდა ფინანსები
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-soft-linen px-2.5 py-1 text-xs font-semibold text-quiet-ink">
          <Lock aria-hidden="true" className="size-3.5" />
          საიტზე არ ჩანს
        </span>
      </div>
      <dl className="mt-5 divide-y divide-hairline">
        {rows.map(([label, value]) => (
          <div
            key={String(label)}
            className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
          >
            <dt className="text-sm text-quiet-ink">{label}</dt>
            <dd className="text-right text-sm font-semibold tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {/* A used item marked sold before sales were recorded: say so, rather than showing a
          sold item with no sale as if nothing were missing. */}
      {!isStocked && product.status === "sold" && sales.length === 0 ? (
        <p className="mt-4 rounded-xl bg-status-reserved-surface px-4 py-3 text-sm leading-6 text-status-reserved-ink">
          გაყიდულად არის მონიშნული, მაგრამ გაყიდვის ფასი არ არის დაფიქსირებული —
          დაამატეთ, რომ ბუღალტერიაში ჩაითვალოს.{" "}
          <Link
            href={editField("product-sale-price")}
            className="font-semibold underline underline-offset-2 hover:no-underline"
          >
            გაყიდვის ფასის დამატება
          </Link>
        </p>
      ) : null}

      {isStocked ? (
        <div className="mt-6 border-t border-hairline pt-5">
          <h3 className="text-base font-semibold">გაყიდვის დაფიქსირება</h3>
          <div className="mt-4">
            <RecordSaleForm
              productId={product.id}
              slug={product.slug}
              stock={product.stockQuantity ?? 0}
              listPrice={product.price}
              purchasePrice={finances.purchasePrice}
            />
          </div>
        </div>
      ) : null}

      {sales.length > 0 ? (
        <div className="mt-6 border-t border-hairline pt-5">
          <h3 className="text-base font-semibold">გაყიდვების ისტორია</h3>
          <div className="mt-4">
            <ProductSalesHistory
              sales={sales}
              slug={product.slug}
              canUndo={isStocked}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

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
        className="inline-flex items-center gap-2 text-sm font-semibold text-quiet-ink transition-colors hover:text-walnut"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        პროდუქტებზე დაბრუნება
      </Link>

      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold text-walnut">
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
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-walnut px-5 text-sm font-semibold text-white transition-colors hover:bg-walnut-deep"
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
            <ProductPhotoGallery
              images={product.images}
              productName={product.name}
            />
          </section>
        ) : (
          <section
            aria-labelledby="product-photo-heading"
            className="flex min-h-72 flex-col items-center justify-center rounded-3xl bg-white p-8 text-center shadow-[0_16px_30px_rgba(0,0,0,0.04)] lg:min-h-115"
          >
            <ImageOff aria-hidden="true" className="size-12 text-muted-brown" />
            <h2 id="product-photo-heading" className="mt-4 text-xl font-bold">
              ფოტოები ჯერ არ არის
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-quiet-ink">
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
            <dl className="mt-5 divide-y divide-hairline">
              <div className="flex items-center justify-between gap-4 py-4 first:pt-0">
                <dt className="text-sm text-quiet-ink">დასახელება</dt>
                <dd className="max-w-[65%] text-right text-sm font-semibold">
                  {product.name}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-4">
                <dt className="text-sm text-quiet-ink">კატალოგი</dt>
                <dd className="text-right text-sm font-semibold">
                  {product.category.name}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-4">
                <dt className="text-sm text-quiet-ink">ტიპი</dt>
                <dd className="text-right text-sm font-semibold">
                  {LISTING_KIND_LABELS[product.listingKind]}
                </dd>
              </div>
              {product.listingKind === "new_stocked" ? (
                <div className="flex items-center justify-between gap-4 py-4">
                  <dt className="text-sm text-quiet-ink">მარაგი</dt>
                  <dd className="text-right text-sm font-semibold">
                    {product.stockQuantity ?? 0}
                  </dd>
                </div>
              ) : null}
              {/* published_at is staff-facing information: it is what the storefront's
                  "new arrival" badge is derived from, so whoever is editing a listing needs
                  to see whether it has ever been published. Null on every row created
                  before roadmap step 4, which is why it is shown as an absence rather than
                  a date. */}
              <div className="flex items-center justify-between gap-4 py-4">
                <dt className="text-sm text-quiet-ink">გამოქვეყნდა</dt>
                <dd className="text-right text-sm font-semibold">
                  {product.publishedAt
                    ? new Date(product.publishedAt).toLocaleDateString("ka-GE")
                    : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 pb-0 pt-4">
                <dt className="text-sm text-quiet-ink">ფასი</dt>
                <dd className="flex flex-col items-end gap-0.5">
                  <span className="text-xl font-bold text-walnut">
                    {formatPrice(product.price)} ₾
                  </span>
                  {product.compareAtPrice !== null ? (
                    <span className="text-xs text-quiet-ink">
                      <span className="sr-only">ძველი ფასი: </span>
                      <s>{formatPrice(product.compareAtPrice)} ₾</s>
                      {" · "}
                      {/* Derived here too, from the same two numbers the storefront uses.
                          Kept inline rather than shared: the two repos share a database,
                          not code. */}
                      -
                      {Math.round(
                        (1 - product.price / product.compareAtPrice) * 100,
                      )}
                      %
                    </span>
                  ) : null}
                </dd>
              </div>
            </dl>
          </section>

          <FinanceSection product={product} />

          {product.dimensions.widthCm !== null ||
          product.dimensions.lengthCm !== null ||
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
              <dl className="mt-5 divide-y divide-hairline">
                {(
                  [
                    ["სიგანე", product.dimensions.widthCm, "სმ"],
                    ["სიგრძე", product.dimensions.lengthCm, "სმ"],
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
                      <dt className="text-sm text-quiet-ink">{label}</dt>
                      <dd className="text-right text-sm font-semibold">
                        {value} {unit}
                      </dd>
                    </div>
                  ))}
              </dl>
              {product.dimensions.note ? (
                <p className="mt-4 border-t border-hairline pt-4 text-sm leading-6 text-quiet-ink">
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
              <p className="mt-3 text-sm font-semibold text-ink">
                {product.conditionGrade.labelKa}
              </p>
              <p className="mt-1 text-sm leading-6 text-quiet-ink">
                {product.conditionGrade.descriptionKa}
              </p>
              {product.conditionSummary ? (
                <p className="mt-4 whitespace-pre-wrap border-t border-hairline pt-4 text-[15px] leading-7 text-quiet-ink">
                  {product.conditionSummary}
                </p>
              ) : (
                <p className="mt-4 border-t border-hairline pt-4 text-sm leading-6 text-[#8a6d1f]">
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
            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-quiet-ink">
              {product.description || "აღწერა არ არის დამატებული."}
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
