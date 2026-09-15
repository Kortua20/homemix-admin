import type { ProductStatus } from "@/components/products/types";
import { PRODUCT_STATUS_LABELS } from "@/lib/product-data";

// Colour carries meaning here, so the label text is always present rather than relying on
// the swatch alone.
const STATUS_STYLES: Record<ProductStatus, string> = {
  draft: "bg-[#f0eded] text-[#605e5b]",
  available: "bg-[#e3f1e6] text-[#1d4a38]",
  reserved: "bg-[#fdf0d9] text-[#7a5312]",
  sold: "bg-[#e8e6f3] text-[#443a72]",
  archived: "bg-[#f5e2e0] text-[#8c2f26]",
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
