import Image from "next/image";

import { MockProductActions } from "@/components/dashboard/products/mock-product-actions";
import { ProductStatus } from "@/components/dashboard/products/product-status";
import type { Product } from "@/components/dashboard/products/types";

type DesktopProductCardProps = {
  product: Product;
};

export function DesktopProductCard({ product }: DesktopProductCardProps) {
  return (
    <article className="hidden min-w-0 flex-col rounded-3xl bg-white p-6 shadow-[0_24px_30px_rgba(0,0,0,0.04)] lg:flex">
      <div className="relative h-56 overflow-hidden rounded-xl bg-[#f0eded]">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(min-width: 1180px) 210px, (min-width: 1024px) 230px"
          className="object-cover"
        />
        <div className="absolute right-3 top-3">
          <ProductStatus available={product.available} />
        </div>
      </div>

      <div className="flex min-h-[116px] flex-col gap-1 py-4">
        <h2 className="text-2xl font-semibold leading-[1.3] text-[#1b1c1c]">
          {product.name}
        </h2>
        <p className="text-sm font-semibold leading-5 tracking-[0.03em] text-[#605e5b]">
          {product.category} · {product.material}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#e4e2e1] py-4">
        <span className="text-2xl font-semibold text-[#7f512f]">
          {product.price}
        </span>
        <span className="text-right text-[11px] font-medium text-[#605e5b]">
          კოდი: {product.code}
        </span>
      </div>

      <MockProductActions />
    </article>
  );
}
