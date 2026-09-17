import type { ProductStatus } from "@/components/products/types";
import { PRODUCT_STATUS_LABELS } from "@/lib/product-data";

// Colour carries meaning here, so the label text is always present rather than relying on
// the swatch alone.
const STATUS_STYLES: Record<ProductStatus, string> = {
  draft: "bg-image-placeholder text-quiet-ink",
  available: "bg-status-available-surface text-status-available-ink",
  reserved: "bg-status-reserved-surface text-status-reserved-ink",
  sold: "bg-status-sold-surface text-status-sold-ink",
  archived: "bg-status-archived-surface text-status-archived-ink",
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      {PRODUCT_STATUS_LABELS[status]}
    </span>
  );
}
