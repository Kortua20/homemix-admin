import { Pencil, Trash2 } from "lucide-react";

type MockProductActionsProps = {
  compact?: boolean;
};

export function MockProductActions({
  compact = false,
}: MockProductActionsProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="რედაქტირება"
          aria-disabled="true"
          className="cursor-default p-1 text-[#605e5b]"
        >
          <Pencil aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          aria-label="წაშლა"
          aria-disabled="true"
          className="cursor-default p-1 text-[#605e5b]"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-disabled="true"
        className="h-10 flex-1 cursor-default rounded-lg border border-[#7f512f] text-sm font-semibold tracking-[0.05em] text-[#7f512f]"
      >
        რედაქტირება
      </button>
      <button
        type="button"
        aria-label="წაშლა"
        aria-disabled="true"
        className="cursor-default p-2.5 text-[#c62828]"
      >
        <Trash2 aria-hidden="true" className="size-[18px]" />
      </button>
    </div>
  );
}
