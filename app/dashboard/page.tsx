import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProductsDashboard } from "@/components/dashboard/products-dashboard";
import { createClient } from "@/lib/server";

export const metadata: Metadata = {
  title: "პროდუქტები | Home Mix ადმინისტრაცია",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/");
  }

  return <ProductsDashboard />;
}
