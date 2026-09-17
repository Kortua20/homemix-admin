"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { LoaderCircle, X } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

// The confirm-and-delete dialog, shared by products and categories.
//
// Built on Radix rather than a hand-rolled portal: the previous implementation declared
// role="dialog" and aria-modal="true" but delivered none of what those promise — Escape did
// nothing, Tab walked out into the page behind it, and focus was never restored on close.
// That is a keyboard trap on an irreversible action. Radix provides the focus trap, the
// Escape handler, the focus restore and the outside-click dismissal, and it is already the
// storefront's dialog primitive, so this follows an existing project pattern.
//
// One component for both deletes: the two were identical apart from their nouns, and two
// copies of dialog a11y is two places for it to regress.

type ConfirmDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // "პროდუქტის წაშლა" / "კატალოგის წაშლა"
  title: string;
  // What cannot be undone, stated plainly.
  description: string;
  // Labels the named thing: "წასაშლელი პროდუქტი".
  subjectLabel: string;
  subjectName: string;
  // The delete form's hidden inputs and submit wiring, owned by the caller because each
  // action takes different fields.
  children: ReactNode;
  pending: boolean;
  // Rendered in place of the form once the delete has succeeded.
  successMessage?: string;
  errorMessage?: string;
};

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  subjectLabel,
  subjectName,
  children,
  pending,
  successMessage,
  errorMessage,
}: ConfirmDeleteDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/45 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out data-[state=open]:fade-in" />
        <DialogPrimitive.Content
          // Closing mid-delete would leave the request in flight with no way to see its
          // result, so the dismissals are suppressed while pending. The cancel button is
          // disabled alongside them for the same reason.
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (pending) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (pending) event.preventDefault();
          }}
          className="fixed inset-x-0 bottom-0 z-50 w-full rounded-t-3xl bg-white p-5 shadow-[0_24px_60px_rgba(0,0,0,0.18)] duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:p-7 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogPrimitive.Title className="text-2xl font-bold tracking-[-0.02em]">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm leading-6 text-quiet-ink">
                {description}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              aria-label="ფანჯრის დახურვა"
              disabled={pending}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-soft-linen text-quiet-ink transition-colors hover:bg-warm-mist focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-walnut disabled:opacity-50"
            >
              <X aria-hidden="true" className="size-5" />
            </DialogPrimitive.Close>
          </div>

          <div className="mt-6 rounded-2xl bg-warm-canvas p-4">
            <p className="text-sm text-quiet-ink">{subjectLabel}</p>
            <p className="mt-1 text-lg font-bold text-ink">
              {subjectName}
            </p>
          </div>

          {errorMessage ? (
            <p
              role="alert"
              className="mt-5 rounded-xl bg-destructive-tint px-4 py-3 text-sm font-medium text-destructive-ink"
            >
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <div className="mt-6">
              <p role="status" className="text-sm font-semibold text-success-ink">
                {successMessage}
              </p>
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="mt-4 w-full"
              >
                დახურვა
              </Button>
            </div>
          ) : (
            children
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// The two buttons every delete form ends with. Shared so cancel and confirm cannot drift
// apart between the product and category dialogs.
export function ConfirmDeleteActions({ pending }: { pending: boolean }) {
  return (
    <div className="mt-7 grid grid-cols-2 gap-3">
      <DialogPrimitive.Close
        disabled={pending}
        className="h-11.5 rounded-lg border border-clay-border text-sm font-semibold text-quiet-ink transition-colors hover:bg-soft-linen focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-walnut disabled:opacity-50"
      >
        გაუქმება
      </DialogPrimitive.Close>
      <Button
        type="submit"
        disabled={pending}
        className="bg-destructive hover:bg-destructive-deep"
      >
        {pending && (
          <LoaderCircle aria-hidden="true" className="mr-2 size-4 animate-spin" />
        )}
        წაშლა
      </Button>
    </div>
  );
}
