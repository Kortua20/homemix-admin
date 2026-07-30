import Link from "next/link";
import { PackageX } from "lucide-react";

export default function ProductNotFound() {
  return (
    <section className="flex flex-1 items-center justify-center px-5 py-16">
      <div className="w-full max-w-md rounded-3xl bg-white px-6 py-12 text-center shadow-[0_16px_30px_rgba(0,0,0,0.04)]">
        <PackageX
          aria-hidden="true"
          className="mx-auto size-10 text-[#83746b]"
        />
        <h1 className="mt-4 text-2xl font-bold text-[#1b1c1c]">
          პროდუქტი ვერ მოიძებნა
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#605e5b]">
          მითითებული პროდუქტი არ არსებობს ან წაშლილია.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-[#7f512f] px-5 text-sm font-semibold text-white"
        >
          პროდუქტებზე დაბრუნება
        </Link>
      </div>
    </section>
  );
}
