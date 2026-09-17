"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";

import {
  deleteCategory,
  type CategoryActionState,
} from "@/app/categories/actions";
import {
  ConfirmDeleteActions,
  ConfirmDeleteDialog,
} from "@/components/ui/confirm-delete-dialog";
import { cn } from "@/lib/utils";

const initialCategoryActionState: CategoryActionState = {
  status: "idle",
  message: "",
};

type DeleteCategoryButtonProps = {
  categoryId: string;
  categoryName: string;
  compact?: boolean;
  redirectAfterDelete?: boolean;
};

export function DeleteCategoryButton({
  categoryId,
  categoryName,
  compact = false,
  redirectAfterDelete = false,
}: DeleteCategoryButtonProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    deleteCategory,
    initialCategoryActionState,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={compact ? `${categoryName} — წაშლა` : undefined}
        className={cn(
          "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive",
          compact
            ? // size-11, not size-8: below 44px a destructive control is a mis-tap waiting
              // to happen, and this one cannot be undone.
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
        title="კატალოგის წაშლა"
        description="წაშლილი კატალოგის აღდგენა შეუძლებელი იქნება."
        subjectLabel="წასაშლელი კატალოგი"
        subjectName={categoryName}
        pending={pending}
        errorMessage={state.status === "error" ? state.message : undefined}
        successMessage={state.status === "success" ? state.message : undefined}
      >
        <form action={formAction}>
          <input type="hidden" name="id" value={categoryId} />
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
