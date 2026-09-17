import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

// A deliberate near-copy of the storefront's pager rather than a shared package: the two
// apps have separate component trees and different palettes, and the only thing they truly
// share is the windowing rule below. Extracting ~60 lines into a workspace package to avoid
// that duplication would cost more than it saves.

type PaginationProps = {
  page: number;
  pageCount: number;
  buildHref: (page: number) => string;
  className?: string;
};

const WINDOW_SIZE = 5;

// Page numbers to render, null standing for a gap. Always keeps the first and last page
// reachable in one click, with a window around the current page.
function pageItems(page: number, pageCount: number): (number | null)[] {
  if (pageCount <= WINDOW_SIZE + 2) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const half = Math.floor(WINDOW_SIZE / 2);
  let start = Math.max(2, page - half);
  const end = Math.min(pageCount - 1, start + WINDOW_SIZE - 1);
  start = Math.max(2, end - WINDOW_SIZE + 1);

  const items: (number | null)[] = [1];
  if (start > 2) items.push(null);
  for (let current = start; current <= end; current += 1) items.push(current);
  if (end < pageCount - 1) items.push(null);
  items.push(pageCount);

  return items;
}

const baseLinkClass =
  "inline-flex h-10 min-w-10 items-center justify-center rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7f512f]";

export function Pagination({
  page,
  pageCount,
  buildHref,
  className,
}: PaginationProps) {
  if (pageCount <= 1) return null;

  const items = pageItems(page, pageCount);

  return (
    <nav
      aria-label="გვერდების ნავიგაცია"
      className={cn(
        "mt-6 flex items-center justify-center gap-1 pb-4",
        className,
      )}
    >
      {page > 1 ? (
        <Link
          href={buildHref(page - 1)}
          rel="prev"
          aria-label="წინა გვერდი"
          className={cn(baseLinkClass, "text-[#2b2926] hover:bg-[#f0eded]")}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span aria-hidden="true" className={cn(baseLinkClass, "text-[#b5aca6]")}>
          <ChevronLeft className="size-4" />
        </span>
      )}

      {items.map((item, index) =>
        item === null ? (
          <span
            key={`gap-${index}`}
            aria-hidden="true"
            className="inline-flex h-10 w-6 items-center justify-center text-sm text-[#83746b]"
          >
            …
          </span>
        ) : item === page ? (
          <span
            key={item}
            aria-current="page"
            className={cn(baseLinkClass, "bg-[#7f512f] text-white")}
          >
            {item}
          </span>
        ) : (
          <Link
            key={item}
            href={buildHref(item)}
            aria-label={`გვერდი ${item}`}
            className={cn(baseLinkClass, "text-[#2b2926] hover:bg-[#f0eded]")}
          >
            {item}
          </Link>
        ),
      )}

      {page < pageCount ? (
        <Link
          href={buildHref(page + 1)}
          rel="next"
          aria-label="შემდეგი გვერდი"
          className={cn(baseLinkClass, "text-[#2b2926] hover:bg-[#f0eded]")}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span aria-hidden="true" className={cn(baseLinkClass, "text-[#b5aca6]")}>
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
