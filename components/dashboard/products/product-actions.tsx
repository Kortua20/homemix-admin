import { Pencil } from "lucide-react";
import Link from "next/link";

import type { Product } from "@/components/products/types";
import { DeleteProductButton } from "@/components/products/delete-product-button";

type ProductActionsProps = {
  product: Product;
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
          className="flex size-8 items-center justify-center rounded-lg text-[#605e5b]"
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
        className="flex h-10 flex-1 items-center justify-center rounded-lg border border-[#7f512f] text-sm font-semibold tracking-[0.05em] text-[#7f512f]"
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
