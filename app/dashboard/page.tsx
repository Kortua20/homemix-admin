import Image from "next/image";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/server";

import { signOut } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/");
  }

  const email =
    typeof data.claims.email === "string" ? data.claims.email : "ადმინისტრატორი";

  return (
    <main className="flex min-h-svh items-center justify-center bg-[#fcf9f8] p-4">
      <section className="w-full max-w-md rounded-3xl border border-[#d6c3b8]/30 bg-white p-8 text-center shadow-[0_10px_20px_rgba(0,0,0,0.04)]">
        <Image
          src="/logo.png"
          alt="Home Mix"
          width={112}
          height={112}
          priority
          className="mx-auto size-28 object-contain"
        />
        <h1 className="mt-6 text-2xl font-semibold text-[#1b1c1c]">
          თქვენ წარმატებით შეხვედით
        </h1>
        <p className="mt-2 text-sm text-[#605e5b]">{email}</p>
        <form action={signOut} className="mt-8">
          <Button type="submit" className="w-full">
            გასვლა
          </Button>
        </form>
      </section>
    </main>
  );
}
