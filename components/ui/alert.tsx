import * as React from "react";

import { cn } from "@/lib/utils";

function Alert({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "default" | "destructive";
}) {
  return (
    <div
      data-slot="alert"
      className={cn(
        "grid grid-cols-[auto_1fr] items-start gap-x-2 rounded-lg border px-3 py-2.5 text-sm",
        variant === "destructive"
          ? "border-[#f1b7b2] bg-[#fff6f5] text-[#b42318]"
          : "border-[#d6c3b8] bg-white text-[#51443c]",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("leading-5", className)}
      {...props}
    />
  );
}

export { Alert, AlertDescription };
