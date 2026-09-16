import { AlertCircle } from "lucide-react";

// One error line, so every field renders its message identically.
//
// The icon is not decoration: colour alone fails WCAG 1.4.1, and this form is used in a
// warehouse on whatever screen is nearest, where a red that reads clearly on a calibrated
// monitor may not. `role="alert"` is deliberately absent — the errors arrive together after
// a submit, and a dozen simultaneous alerts make a screen reader unusable. The summary at
// the top of the form is the announcement; these are the anchors.
export function FieldError({ id, children }: { id: string; children: string }) {
  return (
    <p
      id={id}
      className="flex items-start gap-1.5 text-xs font-medium text-[#c62828]"
    >
      <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

// Marks a label as required. The asterisk is aria-hidden because the input already carries
// `required`, which screen readers announce — reading "star" after every label is noise.
export function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-0.5 text-[#c62828]">
      *
    </span>
  );
}
