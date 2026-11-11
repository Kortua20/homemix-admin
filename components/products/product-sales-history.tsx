import { DeleteSaleButton } from "@/components/products/delete-sale-button";
import type { ProductSale } from "@/components/products/types";
import { formatMoney } from "@/lib/accounting/format";
import { formatIsoDate } from "@/lib/business-date";

// Every recorded sale of one product, newest first. Profit uses the unit cost snapshotted at
// the time of each sale, so it matches the accounting page exactly.
//
// Undo is offered only for stocked items, whose sales are recorded here and reversed by
// delete_product_sale. A used item's sale follows its status in the product form.
export function ProductSalesHistory({
  sales,
  slug,
  canUndo,
}: {
  sales: ProductSale[];
  slug: string;
  canUndo: boolean;
}) {
  if (sales.length === 0) {
    return <p className="text-sm text-quiet-ink">გაყიდვა ჯერ არ დაფიქსირებულა.</p>;
  }

  return (
    <ul className="divide-y divide-hairline">
      {sales.map((sale) => {
        const profit =
          sale.unitCost === null ? null : sale.totalPrice - sale.unitCost * sale.quantity;
        const summary = `${formatIsoDate(sale.soldOn)} · ${sale.quantity} ცალი · ${formatMoney(sale.totalPrice)}`;

        return (
          <li key={sale.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0 text-sm">
              <p className="font-semibold tabular-nums">
                {formatIsoDate(sale.soldOn)} · {sale.quantity} ცალი ·{" "}
                {formatMoney(sale.totalPrice)}
              </p>
              <p className="mt-0.5 text-xs text-quiet-ink tabular-nums">
                საიტის ფასით {formatMoney(sale.listUnitPrice * sale.quantity)} · მოგება{" "}
                <span className={profit !== null && profit < 0 ? "text-destructive-ink" : undefined}>
                  {formatMoney(profit)}
                </span>
              </p>
              {sale.note ? (
                <p className="mt-0.5 break-words text-xs text-quiet-ink">{sale.note}</p>
              ) : null}
            </div>
            {canUndo ? (
              <DeleteSaleButton saleId={sale.id} slug={slug} summary={summary} />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
