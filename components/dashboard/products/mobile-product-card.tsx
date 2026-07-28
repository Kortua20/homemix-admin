import Image from "next/image";

import { MockProductActions } from "@/components/dashboard/products/mock-product-actions";
import { ProductStatus } from "@/components/dashboard/products/product-status";
import type { Product } from "@/components/dashboard/products/types";

type MobileProductCardProps = {
  product: Product;
};

export function MobileProductCard({ product }: MobileProductCardProps) {
  return (
    <article className="flex min-h-27 min-w-0 items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_10px_20px_rgba(0,0,0,0.04)] lg:hidden">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-[#f6f3f2]">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="80px"
          className="object-cover"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <ProductStatus available={product.available} />
        <h2 className="mt-1 line-clamp-1 text-[15px] font-semibold leading-5 text-[#1b1c1c]">
          {product.name}
        </h2>
        <p className="truncate text-[13px] leading-4 text-[#605e5b]">
          {product.category} · {product.material}
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-[#7f512f]">
            {product.price}
          </span>
          <MockProductActions compact />
        </div>
      </div>
    </article>
  );
}
