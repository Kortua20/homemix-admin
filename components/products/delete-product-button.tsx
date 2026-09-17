"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";

import { deleteProduct, type ProductActionState } from "@/app/product/actions";
import {
  ConfirmDeleteActions,
  ConfirmDeleteDialog,
} from "@/components/ui/confirm-delete-dialog";
import { cn } from "@/lib/utils";

const initialProductActionState: ProductActionState = {
  status: "idle",
  message: "",
};

type DeleteProductButtonProps = {
  productId: string;
  productName: string;
  compact?: boolean;
  redirectAfterDelete?: boolean;
};

export function DeleteProductButton({
  productId,
  productName,
  compact = false,
  redirectAfterDelete = false,
}: DeleteProductButtonProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    deleteProduct,
    initialProductActionState,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={compact ? `${productName} — წაშლა` : undefined}
        className={cn(
          "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive",
          compact
            ? // size-11, not size-8: this is the destructive action sitting beside Edit on
              // a mobile card, and 32px is under the 44px minimum for a reliable tap.
              "flex size-11 items-center justify-center rounded-lg text-destructive hover:bg-destructive-surface"
            : "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-white px-5 text-sm font-semibold text-destructive hover:bg-destructive-surface",
        )}
      >
        <Trash2 aria-hidden="true" className="size-4" />
        {!compact && "წაშლა"}
      </button>

      <ConfirmDeleteDialog
        open={open}
        onOpenChange={setOpen}
        title="პროდუქტის წაშლა"
        description="წაშლილი პროდუქტის აღდგენა შეუძლებელი იქნება."
        subjectLabel="წასაშლელი პროდუქტი"
        subjectName={productName}
        pending={pending}
        errorMessage={state.status === "error" ? state.message : undefined}
        successMessage={state.status === "success" ? state.message : undefined}
      >
        <form action={formAction}>
          <input type="hidden" name="id" value={productId} />
          <input
            type="hidden"
            name="redirectAfterDelete"
            value={String(Boolean(redirectAfterDelete))}
          />
          <ConfirmDeleteActions pending={pending} />
        </form>
      </ConfirmDeleteDialog>
    </>
  );
}
