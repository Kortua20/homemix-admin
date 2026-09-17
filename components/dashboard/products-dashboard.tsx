"use client";

import { AlertCircle, Package, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";

import {
  DesktopProductCard,
  MobileProductCard,
} from "@/components/dashboard/products";
import { FilterBar } from "@/components/filters/filter-bar";
import { Pagination } from "@/components/dashboard/pagination";
import { buildListHref, hasActiveFilters } from "@/lib/filters/url";
import type { FilterSchema, FilterValues } from "@/lib/filters/types";
import type { ProductListPage } from "@/lib/product-data";
import { cn } from "@/lib/utils";

type ProductsDashboardProps = {
  // Null means the fetch failed. Distinct from an empty page, which is a successful query
  // that matched nothing.
  result: ProductListPage | null;
  // The schema and the values the server actually queried with — what the results reflect.
  schema: FilterSchema;
  values: FilterValues;
  loadError?: boolean;
};

export function ProductsDashboard({
  result,
  schema,
  values,
  loadError = false,
}: ProductsDashboardProps) {
  const pathname = usePathname();
  // Owned here rather than inside FilterBar because the grid is what reads it: the
  // transition stays pending until the server's new results have rendered, so it needs no
  // clearing.
  const [isPending, startTransition] = useTransition();

  const items = result?.items ?? [];
  const filtersActive = hasActiveFilters(schema, values);
  // An empty page with matches behind it is a stale `?page=`, not an empty result.
  const isStalePage = result !== null && items.length === 0 && result.total > 0;

  return (
    <section className="px-5 pb-28 pt-4 lg:px-8 lg:pb-16 lg:pt-16 xl:px-16">
      <div className="hidden lg:block">
        <h1 className="text-5xl font-bold leading-[1.1] tracking-[-0.02em]">
          პროდუქტები
        </h1>
        <p className="mt-2 text-base leading-relaxed text-quiet-ink">
          მართეთ პროდუქტები, ფასები და მათი დეტალები.
        </p>
      </div>

      <FilterBar
        schema={schema}
        values={values}
        pathname={pathname}
        startTransition={startTransition}
      />

      {result !== null && result.total > 0 ? (
        <p
          className="mt-3 px-1 text-sm text-quiet-ink"
          role="status"
          aria-live="polite"
        >
          ნაპოვნია: {result.total}
          {result.pageCount > 1
            ? ` — გვერდი ${result.page} / ${result.pageCount}`
            : ""}
        </p>
      ) : null}

      {loadError ? (
        <div className="mt-4 rounded-3xl bg-white px-6 py-14 text-center shadow-[0_10px_20px_rgba(0,0,0,0.04)] lg:mt-6">
          <AlertCircle
            aria-hidden="true"
            className="mx-auto size-8 text-destructive"
          />
          <h2 className="mt-3 text-lg font-semibold">
            პროდუქტები ვერ ჩაიტვირთა
          </h2>
          <p className="mt-1 text-sm text-quiet-ink">
            განაახლეთ გვერდი ან მოგვიანებით სცადეთ.
          </p>
        </div>
      ) : isStalePage ? (
        <div className="mt-4 rounded-3xl bg-white px-6 py-14 text-center shadow-[0_10px_20px_rgba(0,0,0,0.04)] lg:mt-6">
          <Package
            aria-hidden="true"
            className="mx-auto size-8 text-soft-brown"
          />
          <h2 className="mt-3 text-lg font-semibold">ეს გვერდი ცარიელია</h2>
          <p className="mt-1 text-sm text-quiet-ink">
            შესაძლოა პროდუქტები შეიცვალა.
          </p>
          <Link
            href={buildListHref(pathname, schema, values, 1)}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-walnut px-5 text-sm font-semibold text-white"
          >
            პირველი გვერდი
          </Link>
        </div>
      ) : items.length > 0 ? (
        <>
          {/* Dimmed while a new query is in flight, so a slow filter reads as "loading"
              rather than as results that disagree with the controls. */}
          <div
            className={cn(
              "mt-4 grid gap-2 transition-opacity lg:mt-6 lg:grid-cols-3 lg:gap-6 [@media(min-width:1180px)]:grid-cols-4",
              isPending && "opacity-60",
            )}
          >
            {items.map((product) => (
              <div key={product.id} className="min-w-0">
                <DesktopProductCard product={product} />
                <MobileProductCard product={product} />
              </div>
            ))}
          </div>
          <Pagination
            page={result?.page ?? 1}
            pageCount={result?.pageCount ?? 1}
            buildHref={(target) =>
              buildListHref(pathname, schema, values, target)
            }
          />
        </>
      ) : (
        <div className="mt-4 rounded-3xl bg-white px-6 py-14 text-center shadow-[0_10px_20px_rgba(0,0,0,0.04)] lg:mt-6">
          <Package
            aria-hidden="true"
            className="mx-auto size-8 text-soft-brown"
          />
          <h2 className="mt-3 text-lg font-semibold">
            {filtersActive
              ? "პროდუქტი ვერ მოიძებნა"
              : "პროდუქტები ჯერ არ არის"}
          </h2>
          <p className="mt-1 text-sm text-quiet-ink">
            {filtersActive
              ? "შეცვალეთ ან გაასუფთავეთ ფილტრები."
              : "შექმენით პირველი პროდუქტი."}
          </p>
          {!filtersActive && (
            <Link
              href="/product/new"
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-walnut px-5 text-sm font-semibold text-white"
            >
              <Plus aria-hidden="true" className="size-4" />
              პროდუქტის შექმნა
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
