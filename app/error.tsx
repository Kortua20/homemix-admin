"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

// The admin's error boundary. Without it an unhandled error shows Next's default screen —
// English, stack-shaped, and offering nothing to do about it. This keeps the person in the
// product's own language and gives them the two moves that actually help.
//
// Placed at the app root so it covers every admin route rather than only the dashboard.
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Logged, not displayed: the message may name a table or a constraint, which belongs in
    // the server console rather than on screen. The digest below is the safe handle.
    console.error("Admin route error:", error);
  }, [error]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-[#fcf9f8] px-5 py-10">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-[0_24px_30px_rgba(0,0,0,0.04)]">
        <AlertCircle
          aria-hidden="true"
          className="mx-auto size-10 text-[#c62828]"
        />
        <h1 className="mt-4 text-2xl font-bold tracking-[-0.02em] text-[#1b1c1c]">
          დაფიქსირდა შეცდომა
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#605e5b]">
          გვერდის ჩატვირთვა ვერ მოხერხდა. სცადეთ თავიდან, ან დაბრუნდით
          პროდუქტების სიაში.
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#7f512f] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#6d4528] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7f512f]"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            თავიდან ცდა
          </button>
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-[#d6c3b8] px-5 text-sm font-semibold text-[#605e5b] transition-colors hover:bg-[#f6f3f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7f512f]"
          >
            პროდუქტებზე დაბრუნება
          </Link>
        </div>

        {/* The digest is what ties this screen to a specific server log entry. Shown only
            when Next produced one, so it never renders as an empty label. */}
        {error.digest ? (
          <p className="mt-6 text-xs text-[#786961]">
            შეცდომის კოდი: <code className="font-mono">{error.digest}</code>
          </p>
        ) : null}
      </section>
    </main>
  );
}
