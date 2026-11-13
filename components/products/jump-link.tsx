"use client";

import { useEffect } from "react";

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

// The cross-page counterpart: a link to `/product/<slug>/edit#product-purchase-price` lands
// on that field the same way JumpLink does — centred and focused, ready to type into — rather
// than the browser's default of flush against the top edge, under the sticky mobile header,
// with focus left on the page.
//
// An effect because it synchronises with the browser (the URL hash and DOM focus), once, on
// mount. Deferred a frame so it runs after the router's own hash scroll instead of losing to
// it.
export function useFocusHashTarget() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;

    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(id);
      if (!target) return;
      target.scrollIntoView({ block: "center" });
      target.focus({ preventScroll: true });
    });

    return () => cancelAnimationFrame(frame);
  }, []);
}
