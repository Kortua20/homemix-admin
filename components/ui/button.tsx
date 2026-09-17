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
        "inline-flex h-11.5 items-center justify-center rounded-lg border border-transparent bg-walnut px-4.25 text-sm font-semibold tracking-wider text-white shadow-[0_1px_1px_rgba(0,0,0,0.05)] transition-colors hover:bg-walnut-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-walnut/30 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Button };
