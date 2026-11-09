"use client";

// An in-form link that scrolls a field into view and moves focus to it.
//
// A real anchor, not a button: it works before hydration, and the browser's own focus
// handling is more reliable than scrollIntoView alone on a form this tall. The click handler
// only improves on the default jump — centred and smooth instead of flush to the top edge.
//
// The target must be focusable: an input, or a section wrapper with tabIndex={-1}.
export function JumpLink({
  targetId,
  className,
  children,
}: {
  targetId: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={`#${targetId}`}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        const target = document.getElementById(targetId);
        target?.scrollIntoView({ block: "center", behavior: "smooth" });
        target?.focus({ preventScroll: true });
      }}
    >
      {children}
    </a>
  );
}
