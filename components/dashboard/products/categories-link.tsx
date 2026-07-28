import { Shapes } from "lucide-react";

import { cn } from "@/lib/utils";

type CategoriesLinkProps = {
  mobile?: boolean;
};

export function CategoriesLink({ mobile = false }: CategoriesLinkProps) {
  return (
    <a
      href="/categories"
      aria-disabled="true"
      tabIndex={-1}
      className={cn(
        "pointer-events-none flex cursor-default items-center text-[#605e5b]",
        mobile
          ? "flex-col justify-center gap-1 px-4 py-1 text-[10px]"
          : "gap-2 rounded-lg px-4 py-3 text-sm font-semibold tracking-wider",
      )}
    >
      <Shapes aria-hidden="true" className="size-5" />
      <span>კატეგორიები</span>
    </a>
  );
}
