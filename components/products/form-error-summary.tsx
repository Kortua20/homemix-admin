"use client";

import { useEffect, useRef } from "react";
import { AlertCircle } from "lucide-react";

// Maps each server fieldError key to the input it belongs to, in the order the fields
// appear on screen. Object key order is not reliable for this — the server builds
// fieldErrors in validation order, which is not visual order — so the sequence is declared
// here and the summary follows it.
//
// `id` is the DOM id to focus; `label` is what the staff member sees in the form, so the
// summary names the field the way the label does rather than the way the code does.
export type FieldDescriptor = { key: string; id: string; label: string };

export function FormErrorSummary({
  fieldErrors,
  fields,
  // Changes on every submit so a second failed attempt re-announces and re-scrolls, even
  // when the errors are identical. Without it, fixing one of three errors and resubmitting
  // would leave the summary silent.
  submitToken,
}: {
  fieldErrors: Record<string, string | undefined> | undefined;
  fields: FieldDescriptor[];
  submitToken: number;
}) {
  const headingRef = useRef<HTMLParagraphElement>(null);

  const listed = fields
    .map((field) => ({ ...field, message: fieldErrors?.[field.key] }))
    .filter((field): field is FieldDescriptor & { message: string } =>
      Boolean(field.message),
    );

  const count = listed.length;
  const firstId = listed[0]?.id;

  useEffect(() => {
    if (count === 0) return;

    // Move the viewport to the summary and focus it, rather than jumping straight to the
    // first bad input. Focusing the input would scroll past the summary, so the person
    // would never learn how many other fields are wrong — they would fix one, resubmit,
    // and be surprised again.
    headingRef.current?.focus();
  }, [count, submitToken]);

  if (count === 0) return null;

  return (
    <div
      className="mb-5 rounded-xl border border-[#f2b8b5] bg-destructive-tint px-4 py-3"
      // "assertive" because the submit the person just made has failed and nothing else is
      // competing for the announcement.
      role="alert"
      aria-live="assertive"
    >
      <p
        ref={headingRef}
        tabIndex={-1}
        className="flex items-center gap-2 text-sm font-semibold text-destructive-ink outline-none"
      >
        <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
        {count === 1
          ? "ერთი ველი საჭიროებს შესწორებას"
          : `${count} ველი საჭიროებს შესწორებას`}
      </p>

      <ul className="mt-2 grid gap-1 pl-6">
        {listed.map((field) => (
          <li key={field.key}>
            {/* A real anchor, not a button: it works before hydration, and the browser's
                own focus handling is more reliable than scrollIntoView on a form this
                tall. */}
            <a
              href={`#${field.id}`}
              className="text-sm text-destructive-ink underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive-ink"
              onClick={(event) => {
                event.preventDefault();
                const target = document.getElementById(field.id);
                target?.scrollIntoView({ block: "center", behavior: "smooth" });
                target?.focus({ preventScroll: true });
              }}
            >
              {field.label}
            </a>
            <span className="text-sm text-destructive-ink"> — {field.message}</span>
          </li>
        ))}
      </ul>

      {firstId ? (
        <p className="sr-only">
          პირველი შეცდომა: {listed[0].label} — {listed[0].message}
        </p>
      ) : null}
    </div>
  );
}
