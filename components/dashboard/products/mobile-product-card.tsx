import { Package } from "lucide-react";
import Link from "next/link";

import { ProductActions } from "@/components/dashboard/products/product-actions";
import type { Product } from "@/components/products/types";
import { formatPrice } from "@/lib/product-data";

type MobileProductCardProps = {
  product: Product;
};

export function MobileProductCard({ product }: MobileProductCardProps) {
  return (
    <article className="relative flex min-h-27 w-full min-w-0 max-w-full items-center overflow-hidden rounded-2xl bg-white p-3 shadow-[0_10px_20px_rgba(0,0,0,0.04)] lg:hidden">
      <Link
        href={`/product/${product.slug}`}
        aria-label={`${product.name} — დეტალების ნახვა`}
        className="flex min-w-0 flex-1 items-center gap-3 pr-9"
      >
        <div className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-[#f0eded] text-[#a89082]">
          <Package aria-hidden="true" className="size-7" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="line-clamp-2 text-[15px] font-semibold leading-5 text-[#1b1c1c]">
            {product.name}
          </h2>
          <p className="mt-0.5 truncate text-[13px] leading-4 text-[#605e5b]">
            {product.category.name}
          </p>
          <span className="mt-1.5 text-sm font-semibold text-[#7f512f]">
            {formatPrice(product.price)} ₾
          </span>
        </div>
      </Link>

      <ProductActions product={product} compact />
    </article>
  );
}
