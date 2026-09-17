import Image from "next/image";
import Link from "next/link";
import { LogOut, Plus } from "lucide-react";

import { signOut } from "@/app/dashboard/actions";
import { DashboardNavigation } from "@/components/dashboard/dashboard-navigation";

export default function DashboardLayout({
  children,
  showAddProduct = true,
}: Readonly<{
  children: React.ReactNode;
  showAddProduct?: boolean;
}>) {
  return (
    <div className="min-h-svh bg-warm-canvas text-ink lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between rounded-r-xl border-r border-clay-border bg-white px-2 py-8 shadow-[20px_0_30px_rgba(0,0,0,0.04)] lg:flex">
        <div>
          <div className="flex items-center gap-3 px-4 pb-16">
            <Image
              src="/logo.png"
              alt="Home Mix"
              width={40}
              height={40}
              priority
              className="size-10 rounded-full bg-warm-mist object-contain"
            />
            <div>
              <p className="text-xl font-semibold leading-7 text-walnut">
                ადმინისტრაცია
              </p>
              <p className="text-xs font-medium text-quiet-ink">
                მარაგების მართვა
              </p>
            </div>
          </div>

          <DashboardNavigation />
        </div>

        <div className="border-t border-clay-border pt-4">
          <Link
            href="/product/new"
            className="inline-flex h-11.5 w-full items-center justify-center rounded-lg bg-walnut px-4 text-sm font-semibold tracking-wider text-white transition-colors hover:bg-walnut-deep"
          >
            პროდუქტის შექმნა
          </Link>
          <form action={signOut} className="mt-4">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold tracking-wider text-quiet-ink"
            >
              <LogOut aria-hidden="true" className="size-4.5" />
              გასვლა
            </button>
          </form>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center gap-3 bg-warm-canvas/95 px-5 py-3 shadow-[0_10px_20px_rgba(0,0,0,0.04)] backdrop-blur lg:hidden">
        <Image
          src="/logo.png"
          alt="Home Mix"
          width={64}
          height={64}
          priority
          className="size-16 shrink-0 object-contain"
        />
        <p className="min-w-0 flex-1 text-center text-[28px] font-bold tracking-[-0.02em] text-walnut">
          ადმინისტრაცია
        </p>
      </header>

      <main className="flex min-h-svh flex-col">
        {children}

        <footer className="mt-auto hidden items-center justify-between border-t border-clay-border bg-soft-linen px-16 py-4 text-xs font-medium text-quiet-ink lg:flex">
          <span>© 2026 Home Mix ადმინისტრაციის პორტალი</span>
        </footer>
      </main>

      {showAddProduct && (
        <Link
          href="/product/new"
          aria-label="პროდუქტის დამატება"
          className="fixed bottom-24 right-5 z-30 flex size-14 items-center justify-center rounded-3xl bg-walnut text-white shadow-[0_12px_16px_rgba(168,116,79,0.15)] lg:hidden"
        >
          <Plus aria-hidden="true" className="size-6" />
        </Link>
      )}

      <DashboardNavigation mobile />
    </div>
  );
}
