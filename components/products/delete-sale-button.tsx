"use client";

import { Undo2 } from "lucide-react";
import { useActionState, useState } from "react";

import { deleteProductSale, type SaleActionState } from "@/app/product/sale-actions";
import {
  ConfirmDeleteActions,
  ConfirmDeleteDialog,
} from "@/components/ui/confirm-delete-dialog";

const initialState: SaleActionState = { status: "idle", message: "" };

// Undoes a stocked sale entered by mistake: delete_product_sale removes the row and puts the
// units back on the stock in one transaction. Same confirm dialog as product delete, because
// it removes a record from the books.
export function DeleteSaleButton({
  saleId,
  slug,
  summary,
}: {
  saleId: string;
  slug: string;
  // e.g. "11.11.2026 · 2 ცალი · 90.00 ₾", named in the dialog so the right row is confirmed.
  summary: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(deleteProductSale, initialState);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`გაყიდვის გაუქმება: ${summary}`}
        className="flex size-11 items-center justify-center rounded-lg text-quiet-ink transition-colors hover:bg-destructive-surface hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
      >
        <Undo2 aria-hidden="true" className="size-4" />
      </button>

      <ConfirmDeleteDialog
        open={open}
        onOpenChange={setOpen}
        title="გაყიდვის გაუქმება"
        description="ჩანაწერი წაიშლება ბუღალტერიიდან და ნივთები მარაგში დაბრუნდება."
        subjectLabel="გასაუქმებელი გაყიდვა"
        subjectName={summary}
        pending={pending}
        errorMessage={state.status === "error" ? state.message : undefined}
        successMessage={state.status === "success" ? state.message : undefined}
      >
        <form action={formAction}>
          <input type="hidden" name="saleId" value={saleId} />
          <input type="hidden" name="slug" value={slug} />
          <ConfirmDeleteActions pending={pending} />
        </form>
      </ConfirmDeleteDialog>
    </>
  );
}
