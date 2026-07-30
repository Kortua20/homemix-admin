import { Package } from "lucide-react";
import Link from "next/link";

import { ProductActions } from "@/components/dashboard/products/product-actions";
import type { Product } from "@/components/products/types";
import { formatPrice, getProductImageUrl } from "@/lib/product-data";

type DesktopProductCardProps = {
  product: Product;
};

export function DesktopProductCard({ product }: DesktopProductCardProps) {
  return (
    <article className="hidden min-w-0 flex-col rounded-3xl bg-white p-6 shadow-[0_24px_30px_rgba(0,0,0,0.04)] lg:flex">
      <Link
        href={`/product/${product.slug}`}
        aria-label={`${product.name} — დეტალების ნახვა`}
        className="group"
      >
        <div className="flex h-48 items-center justify-center overflow-hidden rounded-xl bg-[#f0eded] text-[#a89082]">
          {product.images[0] ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={getProductImageUrl(product.images[0].id)}
              alt=""
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <Package aria-hidden="true" className="size-12" />
          )}
        </div>

        <div className="flex min-h-28 flex-col gap-1 py-4">
          <h2 className="line-clamp-2 text-2xl font-semibold leading-[1.3] text-[#1b1c1c] transition-colors group-hover:text-[#7f512f]">
            {product.name}
          </h2>
          <p className="text-sm font-semibold leading-5 text-[#605e5b]">
            {product.category.name}
          </p>
        </div>

        <div className="border-t border-[#e4e2e1] py-4">
          <span className="text-2xl font-semibold text-[#7f512f]">
            {formatPrice(product.price)} ₾
          </span>
        </div>
      </Link>

      <ProductActions product={product} />
    </article>
  );
}
