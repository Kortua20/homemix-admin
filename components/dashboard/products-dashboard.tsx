"use client";

import { AlertCircle, Package, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useState } from "react";

import {
  DesktopProductCard,
  MobileProductCard,
} from "@/components/dashboard/products";
import type { Product } from "@/components/products/types";
import { Input } from "@/components/ui/input";

type ProductsDashboardProps = {
  products: Product[];
  loadError?: boolean;
};

export function ProductsDashboard({
  products,
  loadError = false,
}: ProductsDashboardProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLocaleLowerCase("ka");
  const filteredProducts = normalizedQuery
    ? products.filter((product) =>
        product.name.toLocaleLowerCase("ka").includes(normalizedQuery),
      )
    : products;

  return (
    <section className="px-5 pb-28 pt-4 lg:px-8 lg:pb-16 lg:pt-16 xl:px-16">
      <div className="hidden lg:block">
        <h1 className="text-5xl font-bold leading-[1.1] tracking-[-0.02em]">
          პროდუქტები
        </h1>
        <p className="mt-2 text-base leading-relaxed text-[#605e5b]">
          მართეთ პროდუქტები, ფასები და მათი დეტალები.
        </p>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-[0_10px_20px_rgba(0,0,0,0.04)] lg:mt-8 lg:rounded-xl lg:border lg:border-[#e4e2e1] lg:p-4 lg:shadow-[0_10px_20px_rgba(0,0,0,0.02)]">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-[#605e5b]"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="პროდუქტის სახელით ძიება"
            placeholder="პროდუქტის სახელით ძიება..."
            className="h-12 border-[#d6c3b8] bg-white pl-11 text-base placeholder:text-[#83746b] lg:border-transparent lg:bg-[#fcf9f8]"
          />
        </div>
      </div>

      {loadError ? (
        <div className="mt-4 rounded-3xl bg-white px-6 py-14 text-center shadow-[0_10px_20px_rgba(0,0,0,0.04)] lg:mt-6">
          <AlertCircle
            aria-hidden="true"
            className="mx-auto size-8 text-[#c62828]"
          />
          <h2 className="mt-3 text-lg font-semibold">
            პროდუქტები ვერ ჩაიტვირთა
          </h2>
          <p className="mt-1 text-sm text-[#605e5b]">
            განაახლეთ გვერდი ან მოგვიანებით სცადეთ.
          </p>
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="mt-4 grid gap-2 lg:mt-6 lg:grid-cols-3 lg:gap-6 [@media(min-width:1180px)]:grid-cols-4">
          {filteredProducts.map((product) => (
            <div key={product.id} className="min-w-0">
              <DesktopProductCard product={product} />
              <MobileProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-3xl bg-white px-6 py-14 text-center shadow-[0_10px_20px_rgba(0,0,0,0.04)] lg:mt-6">
          <Package
            aria-hidden="true"
            className="mx-auto size-8 text-[#83746b]"
          />
          <h2 className="mt-3 text-lg font-semibold">
            {products.length === 0
              ? "პროდუქტები ჯერ არ არის"
              : "პროდუქტი ვერ მოიძებნა"}
          </h2>
          <p className="mt-1 text-sm text-[#605e5b]">
            {products.length === 0
              ? "შექმენით პირველი პროდუქტი."
              : "სცადეთ სხვა სახელის მოძებნა."}
          </p>
          {products.length === 0 && (
            <Link
              href="/product/new"
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#7f512f] px-5 text-sm font-semibold text-white"
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
