"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, Trash2, X } from "lucide-react";

import {
  deleteCategory,
  type CategoryActionState,
} from "@/app/categories/actions";
import { Button } from "@/components/ui/button";
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

function DeleteCategoryDialog({
  categoryId,
  categoryName,
  redirectAfterDelete,
  onClose,
}: Omit<DeleteCategoryButtonProps, "compact"> & { onClose: () => void }) {
  const [state, formAction, pending] = useActionState(
    deleteCategory,
    initialCategoryActionState,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1b1c1c]/45 backdrop-blur-[2px] sm:items-center sm:p-5">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-category-dialog-title"
        className="w-full rounded-t-3xl bg-white p-5 shadow-[0_24px_60px_rgba(0,0,0,0.18)] sm:max-w-md sm:rounded-3xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="delete-category-dialog-title"
              className="text-2xl font-bold tracking-[-0.02em]"
            >
              კატალოგის წაშლა
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#605e5b]">
              წაშლილი კატალოგის აღდგენა შეუძლებელი იქნება.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ფანჯრის დახურვა"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f6f3f2] text-[#605e5b]"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <div className="mt-6 rounded-2xl bg-[#fcf9f8] p-4">
          <p className="text-sm text-[#605e5b]">წასაშლელი კატალოგი</p>
          <p className="mt-1 text-lg font-bold text-[#1b1c1c]">
            {categoryName}
          </p>
        </div>

        {state.status === "error" && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-[#ffdad6] px-4 py-3 text-sm font-medium text-[#93000a]"
          >
            {state.message}
          </p>
        )}

        {state.status === "success" ? (
          <div className="mt-6">
            <p className="text-sm font-semibold text-[#287d3c]">
              {state.message}
            </p>
            <Button type="button" onClick={onClose} className="mt-4 w-full">
              დახურვა
            </Button>
          </div>
        ) : (
          <form action={formAction} className="mt-7 grid grid-cols-2 gap-3">
            <input type="hidden" name="id" value={categoryId} />
            <input
              type="hidden"
              name="redirectAfterDelete"
              value={String(Boolean(redirectAfterDelete))}
            />
            <button
              type="button"
              onClick={onClose}
              className="h-11.5 rounded-lg border border-[#d6c3b8] text-sm font-semibold text-[#605e5b]"
            >
              გაუქმება
            </button>
            <Button
              type="submit"
              disabled={pending}
              className="bg-[#c62828] hover:bg-[#a61f1f]"
            >
              {pending && (
                <LoaderCircle
                  aria-hidden="true"
                  className="mr-2 size-4 animate-spin"
                />
              )}
              წაშლა
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}

export function DeleteCategoryButton({
  categoryId,
  categoryName,
  compact = false,
  redirectAfterDelete = false,
}: DeleteCategoryButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={compact ? `${categoryName} — წაშლა` : undefined}
        className={cn(
          compact
            ? "flex size-8 items-center justify-center rounded-lg text-[#c62828]"
            : "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#c62828]/30 bg-white px-5 text-sm font-semibold text-[#c62828]",
        )}
      >
        <Trash2 aria-hidden="true" className="size-4" />
        {!compact && "წაშლა"}
      </button>

      {open && (
        <DeleteCategoryDialog
          categoryId={categoryId}
          categoryName={categoryName}
          redirectAfterDelete={redirectAfterDelete}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
