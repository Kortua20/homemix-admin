import Link from "next/link";

import { ProductStatusBadge } from "@/components/products/product-status-badge";
import type {
  SaleRow,
  SalesSummary,
  StockRow,
  StockSummary,
} from "@/lib/accounting/data";
import { formatMoney, formatPercent } from "@/lib/accounting/format";
import { formatIsoDate } from "@/lib/business-date";
import { LISTING_KIND_LABELS } from "@/lib/product-data";
import { cn } from "@/lib/utils";

// A real <table>, not a grid of divs: column headers are announced with each cell by screen
// readers, and selecting a block of rows copies into a spreadsheet as rows and columns.
//
// The footer reads from the same summary as the cards above, so a column total and its card
// cannot disagree.

const TABLE_WRAP_CLASS =
  "mt-4 overflow-x-auto rounded-3xl bg-white shadow-[0_10px_20px_rgba(0,0,0,0.04)]";
const TH_CLASS =
  "whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-quiet-ink";
const TH_NUM_CLASS = cn(TH_CLASS, "text-right");
const TD_CLASS = "px-4 py-3 align-top";
const TD_NUM_CLASS = "whitespace-nowrap px-4 py-3 text-right align-top tabular-nums";
const TFOOT_TD_NUM_CLASS =
  "whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums";

// Unknown figures are dimmed so the eye skips them, and carry a title so hovering explains
// the dash.
function Money({
  value,
  signed = false,
}: {
  value: number | null;
  signed?: boolean;
}) {
  if (value === null) {
    return (
      <span className="text-soft-brown" title="არ არის მითითებული">
        —
      </span>
    );
  }

  return (
    <span className={signed && value < 0 ? "text-destructive-ink" : undefined}>
      {formatMoney(value)}
    </span>
  );
}

function ProductCell({
  slug,
  name,
  categoryName,
  detail,
}: {
  slug: string;
  name: string;
  categoryName: string;
  detail?: string;
}) {
  return (
    <td className={cn(TD_CLASS, "min-w-56")}>
      <Link
        href={`/product/${slug}`}
        className="font-semibold text-ink underline-offset-2 hover:text-walnut hover:underline"
      >
        {name}
      </Link>
      <p className="mt-0.5 text-xs text-quiet-ink">
        {categoryName}
        {detail ? ` · ${detail}` : ""}
      </p>
    </td>
  );
}

export function SalesTable({
  rows,
  summary,
}: {
  rows: SaleRow[];
  summary: SalesSummary;
}) {
  return (
    <div className={TABLE_WRAP_CLASS}>
      <table className="w-full min-w-240 border-collapse text-sm">
        <caption className="sr-only">გაყიდვები</caption>
        <thead className="bg-soft-linen">
          <tr>
            <th scope="col" className={TH_CLASS}>თარიღი</th>
            <th scope="col" className={TH_CLASS}>პროდუქტი</th>
            <th scope="col" className={TH_NUM_CLASS}>რაოდ.</th>
            <th scope="col" className={TH_NUM_CLASS}>შესყიდვის ფასი</th>
            <th scope="col" className={TH_NUM_CLASS}>საიტის ფასით</th>
            <th scope="col" className={TH_NUM_CLASS}>გაყიდვის ფასი</th>
            <th scope="col" className={TH_NUM_CLASS}>ფასდაკლება</th>
            <th scope="col" className={TH_NUM_CLASS}>მოგება</th>
            <th scope="col" className={TH_NUM_CLASS}>მარჟა</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-warm-canvas">
              <td className={cn(TD_CLASS, "whitespace-nowrap tabular-nums")}>
                {formatIsoDate(row.soldOn)}
              </td>
              <ProductCell
                slug={row.slug}
                name={row.name}
                categoryName={row.categoryName}
                detail={[LISTING_KIND_LABELS[row.listingKind], row.note]
                  .filter(Boolean)
                  .join(" · ")}
              />
              <td className={TD_NUM_CLASS}>{row.quantity}</td>
              {/* Every money column is the total for the row's units, so the columns add up
                  across and down; the per-unit sale price is shown beneath for multi-unit
                  sales. */}
              <td className={TD_NUM_CLASS}>
                <Money value={row.cost} />
              </td>
              <td className={cn(TD_NUM_CLASS, "text-quiet-ink")}>
                <Money value={row.listTotal} />
              </td>
              <td className={cn(TD_NUM_CLASS, "font-semibold")}>
                <Money value={row.salePrice} />
                {row.quantity > 1 ? (
                  <span className="mt-0.5 block text-xs font-normal text-quiet-ink">
                    {formatMoney(row.unitSalePrice)} / ც.
                  </span>
                ) : null}
              </td>
              <td className={TD_NUM_CLASS}>
                <Money value={row.discount} />
              </td>
              <td className={cn(TD_NUM_CLASS, "font-semibold")}>
                <Money value={row.profit} signed />
              </td>
              <td className={TD_NUM_CLASS}>{formatPercent(row.margin)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-clay-border bg-soft-linen">
          <tr>
            <th scope="row" colSpan={2} className="px-4 py-3 text-left font-bold">
              სულ · {summary.count} გაყიდვა
            </th>
            <td className={TFOOT_TD_NUM_CLASS}>{summary.units}</td>
            <td className={TFOOT_TD_NUM_CLASS}>{formatMoney(summary.cost)}</td>
            <td className={TFOOT_TD_NUM_CLASS}>{formatMoney(summary.listTotal)}</td>
            <td className={TFOOT_TD_NUM_CLASS}>{formatMoney(summary.revenue)}</td>
            <td className={TFOOT_TD_NUM_CLASS}>
              {formatMoney(summary.discountTotal)}
            </td>
            <td
              className={cn(
                TFOOT_TD_NUM_CLASS,
                summary.profit < 0 && "text-destructive-ink",
              )}
            >
              {formatMoney(summary.profit)}
            </td>
            <td className={TFOOT_TD_NUM_CLASS}>{formatPercent(summary.margin)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function StockTable({
  rows,
  summary,
}: {
  rows: StockRow[];
  summary: StockSummary;
}) {
  return (
    <div className={TABLE_WRAP_CLASS}>
      <table className="w-full min-w-240 border-collapse text-sm">
        <caption className="sr-only">მარაგი</caption>
        <thead className="bg-soft-linen">
          <tr>
            <th scope="col" className={TH_CLASS}>დამატებულია</th>
            <th scope="col" className={TH_CLASS}>პროდუქტი</th>
            <th scope="col" className={TH_CLASS}>სტატუსი</th>
            <th scope="col" className={TH_NUM_CLASS}>რაოდ.</th>
            <th scope="col" className={TH_NUM_CLASS}>შესყიდვის ფასი</th>
            <th scope="col" className={TH_NUM_CLASS}>საიტის ფასი</th>
            <th scope="col" className={TH_NUM_CLASS}>ღირებულება (შესყიდვით)</th>
            <th scope="col" className={TH_NUM_CLASS}>ღირებულება (საიტით)</th>
            <th scope="col" className={TH_NUM_CLASS}>მოსალოდნელი მოგება</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-warm-canvas">
              <td className={cn(TD_CLASS, "whitespace-nowrap tabular-nums")}>
                {row.createdOn ? formatIsoDate(row.createdOn) : "—"}
              </td>
              <ProductCell
                slug={row.slug}
                name={row.name}
                categoryName={row.categoryName}
                detail={LISTING_KIND_LABELS[row.listingKind]}
              />
              <td className={TD_CLASS}>
                <ProductStatusBadge status={row.status} />
              </td>
              <td className={TD_NUM_CLASS}>{row.quantity}</td>
              <td className={TD_NUM_CLASS}>
                <Money value={row.purchasePrice} />
              </td>
              <td className={cn(TD_NUM_CLASS, "text-quiet-ink")}>
                <Money value={row.listPrice} />
              </td>
              <td className={cn(TD_NUM_CLASS, "font-semibold")}>
                <Money value={row.costValue} />
              </td>
              <td className={TD_NUM_CLASS}>
                <Money value={row.listValue} />
              </td>
              <td className={cn(TD_NUM_CLASS, "font-semibold")}>
                <Money value={row.potentialProfit} signed />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-clay-border bg-soft-linen">
          <tr>
            <th scope="row" colSpan={3} className="px-4 py-3 text-left font-bold">
              სულ · {summary.count} პროდუქტი
            </th>
            <td className={TFOOT_TD_NUM_CLASS}>{summary.units}</td>
            {/* Per-unit columns have no meaningful total. */}
            <td className={TFOOT_TD_NUM_CLASS} />
            <td className={TFOOT_TD_NUM_CLASS} />
            <td className={TFOOT_TD_NUM_CLASS}>{formatMoney(summary.costValue)}</td>
            <td className={TFOOT_TD_NUM_CLASS}>{formatMoney(summary.listValue)}</td>
            <td
              className={cn(
                TFOOT_TD_NUM_CLASS,
                summary.potentialProfit < 0 && "text-destructive-ink",
              )}
            >
              {formatMoney(summary.potentialProfit)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
