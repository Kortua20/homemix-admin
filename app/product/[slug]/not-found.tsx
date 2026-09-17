import Link from "next/link";
import { PackageX } from "lucide-react";

export default function ProductNotFound() {
  return (
    <section className="flex flex-1 items-center justify-center px-5 py-16">
      <div className="w-full max-w-md rounded-3xl bg-white px-6 py-12 text-center shadow-[0_16px_30px_rgba(0,0,0,0.04)]">
        <PackageX
          aria-hidden="true"
          className="mx-auto size-10 text-soft-brown"
        />
        <h1 className="mt-4 text-2xl font-bold text-ink">
          პროდუქტი ვერ მოიძებნა
        </h1>
        <p className="mt-2 text-sm leading-6 text-quiet-ink">
          მითითებული პროდუქტი არ არსებობს ან წაშლილია.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-walnut px-5 text-sm font-semibold text-white"
        >
          პროდუქტებზე დაბრუნება
        </Link>
      </div>
    </section>
  );
}
