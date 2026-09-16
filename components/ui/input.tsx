import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-[43px] w-full rounded-lg border border-[#d6c3b8] bg-white px-3 text-base text-[#1b1c1c] outline-none transition-shadow placeholder:text-[#c9c6c2] focus-visible:border-[#7f512f] focus-visible:ring-2 focus-visible:ring-[#7f512f]/15 disabled:cursor-not-allowed disabled:opacity-50",
        // Invalid state belongs here, not at each call site: aria-invalid was already set
        // on every field and styled by none of them, which is why a failed submit looked
        // identical to an untouched form.
        "aria-invalid:border-[#c62828] aria-invalid:bg-[#fffafa] aria-invalid:focus-visible:border-[#c62828] aria-invalid:focus-visible:ring-[#c62828]/20",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
