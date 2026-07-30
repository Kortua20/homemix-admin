import { redirect } from "next/navigation";

import DashboardLayout from "@/app/dashboard/layout";
import { createClient } from "@/lib/server";

export default async function ProductLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/");
  }

  return (
    <DashboardLayout showAddProduct={false}>{children}</DashboardLayout>
  );
}
