import type { Metadata } from "next";
import { AlertCircle } from "lucide-react";

import { CategoriesManager } from "@/components/categories/categories-manager";
import type { Category } from "@/components/categories/types";
import { createClient } from "@/lib/server";

export const metadata: Metadata = {
  title: "კატეგორიები | Home Mix ადმინისტრაცია",
};

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("name", { ascending: true });

  return (
    <section className="px-5 pb-28 pt-5 lg:px-8 lg:pb-16 lg:pt-16 xl:px-16">
      {error ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center shadow-[0_16px_30px_rgba(0,0,0,0.04)]">
          <AlertCircle
            aria-hidden="true"
            className="mx-auto size-9 text-[#c62828]"
          />
          <h1 className="mt-4 text-2xl font-bold">
            კატეგორიები ვერ ჩაიტვირთა
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#605e5b]">
            გთხოვთ, განაახლოთ გვერდი ან მოგვიანებით სცადოთ.
          </p>
        </div>
      ) : (
        <CategoriesManager categories={(data ?? []) as Category[]} />
      )}
    </section>
  );
}
