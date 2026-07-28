import * as React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";

import { cn } from "@/lib/utils";

function Button({
  className,
  ...props
}: React.ComponentProps<typeof ButtonPrimitive>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(
        "inline-flex h-[46px] items-center justify-center rounded-lg border border-transparent bg-[#7f512f] px-[17px] text-sm font-semibold tracking-[0.05em] text-white shadow-[0_1px_1px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#6d4528] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7f512f]/30 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Button };
