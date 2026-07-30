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
    <div className="min-h-svh bg-[#fcf9f8] text-[#1b1c1c] lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between rounded-r-xl border-r border-[#d6c3b8] bg-white px-2 py-8 shadow-[20px_0_30px_rgba(0,0,0,0.04)] lg:flex">
        <div>
          <div className="flex items-center gap-3 px-4 pb-16">
            <Image
              src="/logo.png"
              alt="Home Mix"
              width={40}
              height={40}
              priority
              className="size-10 rounded-full bg-[#e6e2de] object-contain"
            />
            <div>
              <p className="text-xl font-semibold leading-7 text-[#7f512f]">
                ადმინისტრაცია
              </p>
              <p className="text-xs font-medium text-[#605e5b]">
                მარაგების მართვა
              </p>
            </div>
          </div>

          <DashboardNavigation />
        </div>

        <div className="border-t border-[#d6c3b8] pt-4">
          <Link
            href="/product/new"
            className="inline-flex h-11.5 w-full items-center justify-center rounded-lg bg-[#7f512f] px-4 text-sm font-semibold tracking-wider text-white transition-colors hover:bg-[#6d4528]"
          >
            პროდუქტის შექმნა
          </Link>
          <form action={signOut} className="mt-4">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold tracking-wider text-[#605e5b]"
            >
              <LogOut aria-hidden="true" className="size-4.5" />
              გასვლა
            </button>
          </form>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center gap-3 bg-[#fcf9f8]/95 px-5 py-3 shadow-[0_10px_20px_rgba(0,0,0,0.04)] backdrop-blur lg:hidden">
        <Image
          src="/logo.png"
          alt="Home Mix"
          width={64}
          height={64}
          priority
          className="size-16 shrink-0 object-contain"
        />
        <p className="min-w-0 flex-1 text-center text-[28px] font-bold tracking-[-0.02em] text-[#7f512f]">
          ადმინისტრაცია
        </p>
        <form action={signOut}>
          <button
            type="submit"
            aria-label="გასვლა"
            className="flex size-10 items-center justify-center rounded-full text-[#605e5b]"
          >
            <LogOut aria-hidden="true" className="size-5" />
          </button>
        </form>
      </header>

      <main className="flex min-h-svh flex-col">
        {children}

        <footer className="mt-auto hidden items-center justify-between border-t border-[#d6c3b8] bg-[#f6f3f2] px-16 py-4 text-xs font-medium text-[#605e5b] lg:flex">
          <span>© 2026 Home Mix ადმინისტრაციის პორტალი</span>
          <div className="flex gap-4">
            <span>კონფიდენციალურობა</span>
            <span>დახმარება</span>
          </div>
        </footer>
      </main>

      {showAddProduct && (
        <Link
          href="/product/new"
          aria-label="პროდუქტის დამატება"
          className="fixed bottom-24 right-5 z-30 flex size-14 items-center justify-center rounded-3xl bg-[#7f512f] text-white shadow-[0_12px_16px_rgba(168,116,79,0.15)] lg:hidden"
        >
          <Plus aria-hidden="true" className="size-6" />
        </Link>
      )}

      <DashboardNavigation mobile />
    </div>
  );
}
