"use client";

import { Package, Shapes } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function DashboardNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const productsActive =
    pathname === "/dashboard" || pathname.startsWith("/product/");
  const categoryActive =
    pathname.startsWith("/categories") || pathname.startsWith("/category/");

  if (mobile) {
    return (
      <nav
        aria-label="მობილური ნავიგაცია"
        className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around rounded-t-xl border-t border-clay-border/30 bg-white px-8 py-3 shadow-[0_-10px_20px_rgba(0,0,0,0.04)] lg:hidden"
      >
        <Link
          href="/dashboard"
          aria-current={productsActive ? "page" : undefined}
          className={cn(
            "flex flex-col items-center gap-1 rounded-full px-4 py-1 text-[10px]",
            productsActive
              ? "bg-warm-mist/40 font-bold text-walnut"
              : "font-medium text-quiet-ink",
          )}
        >
          <Package aria-hidden="true" className="size-5" />
          პროდუქტები
        </Link>
        <Link
          href="/categories"
          aria-current={categoryActive ? "page" : undefined}
          className={cn(
            "flex flex-col items-center gap-1 rounded-full px-4 py-1 text-[10px]",
            categoryActive
              ? "bg-warm-mist/40 font-bold text-walnut"
              : "font-medium text-quiet-ink",
          )}
        >
          <Shapes aria-hidden="true" className="size-5" />
          კატალოგი
        </Link>
      </nav>
    );
  }

  return (
    <nav aria-label="მთავარი ნავიგაცია" className="grid gap-2">
      <Link
        href="/dashboard"
        aria-current={productsActive ? "page" : undefined}
        className={cn(
          "flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold tracking-wider",
          productsActive
            ? "bg-warm-mist text-walnut"
            : "text-quiet-ink transition-colors hover:bg-soft-linen",
        )}
      >
        <Package aria-hidden="true" className="size-5" />
        პროდუქტები
      </Link>
      <Link
        href="/categories"
        aria-current={categoryActive ? "page" : undefined}
        className={cn(
          "flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold tracking-wider",
          categoryActive
            ? "bg-warm-mist text-walnut"
            : "text-quiet-ink transition-colors hover:bg-soft-linen",
        )}
      >
        <Shapes aria-hidden="true" className="size-5" />
        კატალოგი
      </Link>
    </nav>
  );
}
