import { Pencil } from "lucide-react";
import Link from "next/link";

import type { ProductListItem } from "@/lib/product-data";
import { DeleteProductButton } from "@/components/products/delete-product-button";

type ProductActionsProps = {
  product: ProductListItem;
  compact?: boolean;
};

export function ProductActions({
  product,
  compact = false,
}: ProductActionsProps) {
  if (compact) {
    return (
      <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 flex-col items-center gap-1">
        <Link
          href={`/product/${product.slug}/edit`}
          aria-label={`${product.name} — რედაქტირება`}
          // size-11 to match the delete button beside it: both were 32px, under the 44px
          // minimum, and a pair of undersized controls stacked on a mobile card is where
          // Edit and Delete get confused for each other.
          className="flex size-11 items-center justify-center rounded-lg text-quiet-ink transition-colors hover:bg-soft-linen focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-walnut"
        >
          <Pencil aria-hidden="true" className="size-4" />
        </Link>
        <DeleteProductButton
          productId={product.id}
          productName={product.name}
          compact
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href={`/product/${product.slug}/edit`}
        className="flex h-10 flex-1 items-center justify-center rounded-lg border border-walnut text-sm font-semibold tracking-[0.05em] text-walnut"
      >
        რედაქტირება
      </Link>
      <DeleteProductButton
        productId={product.id}
        productName={product.name}
        compact
      />
    </div>
  );
}
