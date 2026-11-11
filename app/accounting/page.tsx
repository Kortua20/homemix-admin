import type { Metadata } from "next";

import { AccountingDashboard } from "@/components/accounting/accounting-dashboard";
import { getSalesReport, getStockReport } from "@/lib/accounting/data";
import { parseView, resolvePeriod } from "@/lib/accounting/period";
import { createClient } from "@/lib/server";

export const metadata: Metadata = {
  title: "ბუღალტერია | Home Mix ადმინისტრაცია",
};

type AccountingPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Auth is checked in the layout, like /categories. RLS is the real guard either way:
// product_accounting returns nothing to a caller who is not signed-in staff.
export default async function AccountingPage({
  searchParams,
}: AccountingPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const view = parseView(params);
  const period = resolvePeriod(params);

  const report = await (view === "sales"
    ? getSalesReport(supabase, period)
    : getStockReport(supabase)
  ).catch((error: unknown) => {
    // Logged because the page only says "could not load"; the likeliest cause after a
    // deploy is the product_finances migration not having been applied yet.
    console.error("Accounting report failed", error);
    return null;
  });

  return <AccountingDashboard view={view} period={period} report={report} />;
}
