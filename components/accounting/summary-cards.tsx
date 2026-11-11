import { AlertTriangle } from "lucide-react";
import Link from "next/link";

import type { SalesSummary, StockSummary } from "@/lib/accounting/data";
import { formatMoney, formatPercent } from "@/lib/accounting/format";
import { cn } from "@/lib/utils";

function SummaryCard({
  label,
  value,
  detail,
  negative = false,
}: {
  label: string;
  value: string;
  detail?: string;
  negative?: boolean;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-[0_10px_20px_rgba(0,0,0,0.04)]">
      <p className="text-sm font-medium text-quiet-ink">{label}</p>
      <p
        className={cn(
          "mt-2 text-2xl font-bold tracking-tight tabular-nums lg:text-[28px]",
          negative ? "text-destructive-ink" : "text-ink",
        )}
      >
        {value}
      </p>
      {detail ? (
        <p className="mt-1 text-xs leading-5 text-quiet-ink">{detail}</p>
      ) : null}
    </div>
  );
}

const GRID_CLASS = "mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 lg:gap-4";

export function SalesSummaryCards({ summary }: { summary: SalesSummary }) {
  const discountGiven = summary.discountTotal >= 0;

  return (
    <div className={GRID_CLASS}>
      <SummaryCard
        label="შემოსავალი (ფაქტიური)"
        value={formatMoney(summary.revenue)}
        detail={`${summary.count} გაყიდვა · ${summary.units} ცალი`}
      />
      <SummaryCard
        label="შესყიდვის ღირებულება"
        value={formatMoney(summary.cost)}
        detail="გაყიდული ცალების შესყიდვის ფასი, გაყიდვის მომენტით"
      />
      <SummaryCard
        label="მოგება"
        value={formatMoney(summary.profit)}
        negative={summary.profit < 0}
        detail={
          summary.profitBaseCount === summary.count
            ? `მარჟა ${formatPercent(summary.margin)}`
            : `მარჟა ${formatPercent(summary.margin)} · დათვლილია ${summary.count}-დან ${summary.profitBaseCount} ნივთზე`
        }
      />
      <SummaryCard
        label={discountGiven ? "ვაჭრობით დათმობილი" : "საიტის ფასზე მეტი"}
        value={formatMoney(Math.abs(summary.discountTotal))}
        detail={`საიტის ფასით იქნებოდა ${formatMoney(summary.listTotal)}`}
      />
    </div>
  );
}

export function StockSummaryCards({ summary }: { summary: StockSummary }) {
  return (
    <div className={GRID_CLASS}>
      <SummaryCard
        label="მარაგში"
        value={`${summary.units} ერთეული`}
        detail={`${summary.count} პროდუქტი`}
      />
      <SummaryCard
        label="ღირებულება შესყიდვის ფასით"
        value={formatMoney(summary.costValue)}
        detail="ჩადებული თანხა, რომელიც ჯერ არ გაყიდულა"
      />
      <SummaryCard
        label="ღირებულება საიტის ფასით"
        value={formatMoney(summary.listValue)}
        detail="თუ ყველაფერი საიტის ფასით გაიყიდება"
      />
      <SummaryCard
        label="მოსალოდნელი მოგება"
        value={formatMoney(summary.potentialProfit)}
        negative={summary.potentialProfit < 0}
        detail={
          summary.missingPurchasePrice > 0
            ? `მხოლოდ შესყიდვის ფასიან ${summary.count - summary.missingPurchasePrice} პროდუქტზე`
            : "საიტის ფასით გაყიდვის შემთხვევაში"
        }
      />
    </div>
  );
}

// Says out loud what the totals above leave out. Without it, a month with three sales that
// have no purchase price recorded would show a profit figure that looks complete and is not.
export function DataNotice({ items }: { items: React.ReactNode[] }) {
  if (items.length === 0) return null;

  return (
    <div
      role="note"
      className="mt-4 flex gap-3 rounded-2xl bg-status-reserved-surface px-4 py-3 text-sm leading-6 text-status-reserved-ink"
    >
      <AlertTriangle aria-hidden="true" className="mt-1 size-4 shrink-0" />
      <ul className="grid gap-1">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function salesNoticeItems(summary: SalesSummary): React.ReactNode[] {
  const items: React.ReactNode[] = [];

  if (summary.unrecordedSoldCount > 0) {
    items.push(
      <>
        {summary.unrecordedSoldCount} პროდუქტი მონიშნულია გაყიდულად, მაგრამ
        გაყიდვა (ფასი და თარიღი) არ არის დაფიქსირებული, ამიტომ არც ერთ პერიოდში არ
        ჩანს.{" "}
        <Link
          href="/dashboard?status=sold"
          className="font-semibold underline underline-offset-2 hover:no-underline"
        >
          გაყიდული პროდუქტების ნახვა
        </Link>
      </>,
    );
  }

  if (summary.missingCost > 0) {
    items.push(
      `${summary.missingCost} გაყიდვას შესყიდვის ფასი არ ჰქონდა მითითებული — მოგება დათვლილია მხოლოდ ${summary.profitBaseCount} გაყიდვაზე.`,
    );
  }

  return items;
}

export function stockNoticeItems(summary: StockSummary): React.ReactNode[] {
  return summary.missingPurchasePrice > 0
    ? [
        `${summary.missingPurchasePrice} პროდუქტს შესყიდვის ფასი არ აქვს მითითებული — შესყიდვის ღირებულებასა და მოსალოდნელ მოგებაში არ ითვლება.`,
      ]
    : [];
}
