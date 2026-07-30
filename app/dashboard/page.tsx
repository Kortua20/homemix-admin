import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProductsDashboard } from "@/components/dashboard/products-dashboard";
import {
  normalizeProducts,
  productSelect,
  type ProductQueryRow,
} from "@/lib/product-data";
import { createClient } from "@/lib/server";

export const metadata: Metadata = {
  title: "პროდუქტები | Home Mix ადმინისტრაცია",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();

  if (!authData?.claims) {
    redirect("/");
  }

  const { data, error } = await supabase
    .from("products")
    .select(productSelect)
    .order("created_at", { ascending: false });
  const products = error
    ? []
    : normalizeProducts((data ?? []) as ProductQueryRow[]);

  return <ProductsDashboard products={products} loadError={Boolean(error)} />;
}
