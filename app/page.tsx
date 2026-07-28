import Image from "next/image";
import { redirect } from "next/navigation";

import { SignInForm } from "@/components/sign-in-form";
import { createClient } from "@/lib/server";

export default async function SignInPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-svh flex-col bg-[#fcf9f8] px-4 py-6 sm:px-16 sm:py-8">
      <div className="flex flex-1 justify-center">
        <div className="flex w-full max-w-md flex-col items-center">
          <Image
            src="/logo.png"
            alt="Home Mix"
            width={160}
            height={160}
            priority
            className="size-32 object-contain sm:size-40"
          />

          <section
            aria-labelledby="sign-in-heading"
            className="mt-6 w-full rounded-3xl border border-[#d6c3b8]/30 bg-white px-6 py-8 shadow-[0_10px_20px_rgba(0,0,0,0.04)] sm:mt-8 sm:p-16"
          >
            <div className="text-center">
              <h1
                id="sign-in-heading"
                className="text-[28px] font-semibold leading-[1.2] text-[#1b1c1c] sm:text-[32px]"
              >
                შესვლა
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-[#605e5b] sm:text-base">
                ადმინისტრირების პორტალზე წვდომა
              </p>
            </div>

            <SignInForm />
          </section>
        </div>
      </div>

      <footer className="pt-8 text-center text-xs font-medium leading-[1.4] text-[#605e5b]">
        © 2026 Home Mix ადმინისტრაციის პორტალი
      </footer>
    </main>
  );
}
