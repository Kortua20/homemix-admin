import * as React from "react";

import { cn } from "@/lib/utils";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "text-sm font-semibold leading-[1.4] tracking-wider text-[#51443c]",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
