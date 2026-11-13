import { AlertCircle, Download, Lock, ReceiptText } from "lucide-react";
import Link from "next/link";

import {
  SalesTable,
  StockTable,
} from "@/components/accounting/accounting-tables";
import { PeriodControls } from "@/components/accounting/period-controls";
import {
  DataNotice,
  SalesSummaryCards,
  StockSummaryCards,
  salesNoticeItems,
  stockNoticeItems,
} from "@/components/accounting/summary-cards";
import type { SalesReport, StockReport } from "@/lib/accounting/data";
import {
  buildAccountingHref,
  type AccountingPeriod,
  type AccountingView,
} from "@/lib/accounting/period";
import { cn } from "@/lib/utils";

type AccountingDashboardProps = {
  view: AccountingView;
  period: AccountingPeriod;
  // Null means the query failed — distinct from a report with no rows.
  report: SalesReport | StockReport | null;
};

const VIEW_LABELS: Record<AccountingView, string> = {
  sales: "გაყიდვები",
  stock: "მარაგი",
};

const EMPTY_CARD_CLASS =
  "mt-4 rounded-3xl bg-white px-6 py-14 text-center shadow-[0_10px_20px_rgba(0,0,0,0.04)]";

export function AccountingDashboard({
  view,
  period,
  report,
}: AccountingDashboardProps) {
  // Links carry the current period across a tab switch, so going to stock and back does not
  // reset the sales range.
  const hrefFor = (target: AccountingView) =>
    buildAccountingHref("/accounting", target, period);

  return (
    <section className="px-5 pb-28 pt-4 lg:px-8 lg:pb-16 lg:pt-16 xl:px-16">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold leading-[1.1] tracking-[-0.02em] lg:text-5xl">
            ბუღალტერია
          </h1>
          <p className="mt-3 flex items-center gap-1.5 text-sm leading-relaxed text-quiet-ink lg:mt-4 lg:text-base">
            <Lock aria-hidden="true" className="size-4 shrink-0" />
            შიდა ინფორმაცია — საიტზე არ ჩანს.
          </p>
        </div>

        {/* A plain <a>, not next/link: this is a file download, and a Link would try to
            prefetch it and route to it client-side. Hidden on failure, since there would be
            nothing trustworthy to export. */}
        {report ? (
          <a
            href={buildAccountingHref("/accounting/export", view, period)}
            className="inline-flex h-11.5 items-center justify-center gap-2 rounded-lg bg-walnut px-5 text-sm font-semibold tracking-wider text-white transition-colors hover:bg-walnut-deep"
          >
            <Download aria-hidden="true" className="size-4" />
            Excel-ში ექსპორტი
          </a>
        ) : null}
      </div>

      <nav
        aria-label="ბუღალტერიის ხედი"
        className="mt-6 inline-flex rounded-xl bg-white p-1 shadow-[0_10px_20px_rgba(0,0,0,0.04)]"
      >
        {(Object.keys(VIEW_LABELS) as AccountingView[]).map((target) => (
          <Link
            key={target}
            href={hrefFor(target)}
            aria-current={view === target ? "page" : undefined}
            className={cn(
              "rounded-lg px-5 py-2.5 text-sm font-semibold tracking-wider transition-colors",
              view === target
                ? "bg-walnut text-white"
                : "text-quiet-ink hover:bg-soft-linen",
            )}
          >
            {VIEW_LABELS[target]}
          </Link>
        ))}
      </nav>

      {view === "sales" ? (
        <PeriodControls period={period} />
      ) : (
        <p className="mt-4 text-sm text-quiet-ink">
          მიმდინარე მდგომარეობა: მონახაზი, ხელმისაწვდომი და დაჯავშნილი პროდუქტები.
        </p>
      )}

      <ReportBody report={report} />
    </section>
  );
}

function ReportBody({ report }: { report: SalesReport | StockReport | null }) {
  if (report === null) {
    return (
      <div className={EMPTY_CARD_CLASS}>
        <AlertCircle aria-hidden="true" className="mx-auto size-8 text-destructive" />
        <h2 className="mt-3 text-lg font-semibold">მონაცემები ვერ ჩაიტვირთა</h2>
        <p className="mt-1 text-sm text-quiet-ink">
          განაახლეთ გვერდი ან მოგვიანებით სცადეთ.
        </p>
      </div>
    );
  }

  if (report.view === "sales") {
    return (
      <>
        <SalesSummaryCards summary={report.summary} />
        <DataNotice items={salesNoticeItems(report.summary)} />
        {report.rows.length > 0 ? (
          <SalesTable rows={report.rows} summary={report.summary} />
        ) : (
          <EmptyState
            title="ამ პერიოდში გაყიდვა არ არის"
            body="აირჩიეთ სხვა პერიოდი. პროდუქტი აქ ჩანს, როცა მის სტატუსს „გაყიდული“ დაუყენებთ."
          />
        )}
      </>
    );
  }

  return (
    <>
      <StockSummaryCards summary={report.summary} />
      <DataNotice items={stockNoticeItems(report.summary)} />
      {report.rows.length > 0 ? (
        <StockTable rows={report.rows} summary={report.summary} />
      ) : (
        <EmptyState
          title="მარაგი ცარიელია"
          body="გასაყიდი პროდუქტები აქ გამოჩნდება."
        />
      )}
    </>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className={EMPTY_CARD_CLASS}>
      <ReceiptText aria-hidden="true" className="mx-auto size-8 text-soft-brown" />
      <h2 className="mt-3 text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-quiet-ink">{body}</p>
    </div>
  );
}
