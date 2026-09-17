import { Package } from "lucide-react";
import Link from "next/link";

import { ProductActions } from "@/components/dashboard/products/product-actions";
import { ProductStatusBadge } from "@/components/products/product-status-badge";
import {
  formatPrice,
  getProductImageUrl,
  type ProductListItem,
} from "@/lib/product-data";

type DesktopProductCardProps = {
  product: ProductListItem;
};

export function DesktopProductCard({ product }: DesktopProductCardProps) {
  return (
    <article className="hidden min-w-0 flex-col rounded-3xl bg-white p-6 shadow-[0_24px_30px_rgba(0,0,0,0.04)] lg:flex">
      <Link
        href={`/product/${product.slug}`}
        aria-label={`${product.name} — დეტალების ნახვა`}
        className="group"
      >
        <div className="flex h-48 items-center justify-center overflow-hidden rounded-xl bg-image-placeholder text-muted-brown">
          {product.leadImageId ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={getProductImageUrl(product.leadImageId)}
              alt=""
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <Package aria-hidden="true" className="size-12" />
          )}
        </div>

        <div className="flex min-h-28 flex-col gap-1 py-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="line-clamp-2 text-2xl font-semibold leading-[1.3] text-ink transition-colors group-hover:text-walnut">
              {product.name}
            </h2>
            <ProductStatusBadge status={product.status} />
          </div>
          <p className="text-sm font-semibold leading-5 text-quiet-ink">
            {product.categoryName}
          </p>
        </div>

        <div className="border-t border-hairline py-4">
          <span className="text-2xl font-semibold text-walnut">
            {formatPrice(product.price)} ₾
          </span>
        </div>
      </Link>

      <ProductActions product={product} />
    </article>
  );
}
