"use client";

import { useEffect, useRef } from "react";

// Warns before losing unsaved form edits.
//
// The product form carries name, slug, price, condition grade, per-aspect ratings, flaws,
// dimensions, attributes and images. Losing that to a stray Back button or a nav click is
// the most expensive mistake this admin allows, and until now nothing prevented it.
//
// Two distinct escapes, because they are different mechanisms:
//
//   * Leaving the site (reload, close, external link) — `beforeunload`. The browser shows
//     its own generic dialog; custom text has been ignored by every major browser since
//     2016, so none is attempted here.
//
//   * Navigating within the app (a Link, the sidebar) — captured click on an internal
//     anchor. Next's client router never unloads the document, so `beforeunload` is silent
//     for these, which is exactly the case an admin hits most.
//
// Deliberately not intercepted: the Back button. Blocking it needs history manipulation
// that breaks the button's meaning even when the user confirms, and a guard that lies about
// where Back goes is worse than no guard. Browsers fire `beforeunload` on a back-navigation
// that leaves the site, so the cross-site case is still covered.
export function useUnsavedChangesWarning(enabled: boolean, message: string) {
  // Read through a ref so the listeners are attached once rather than re-bound on every
  // keystroke that flips `enabled`.
  const enabledRef = useRef(enabled);
  const messageRef = useRef(message);

  useEffect(() => {
    enabledRef.current = enabled;
    messageRef.current = message;
  });

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!enabledRef.current) return;
      // preventDefault is the modern signal; returnValue is kept for older browsers that
      // still require it to show the prompt.
      event.preventDefault();
      event.returnValue = "";
    };

    const handleClick = (event: MouseEvent) => {
      if (!enabledRef.current) return;
      // Modified clicks open a new tab or window, so the current one — and its edits —
      // stays put. Nothing to warn about.
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.target && anchor.target !== "_self") return;
      // Only same-origin navigations reach the client router; anything else unloads the
      // document and is already covered by beforeunload above.
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Navigating to the page you are already on changes nothing.
      if (url.pathname === window.location.pathname) return;

      if (!window.confirm(messageRef.current)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    // Capture phase: Next's Link handles clicks on the bubble phase, so this has to run
    // first to be able to stop the navigation.
    document.addEventListener("click", handleClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
    };
  }, []);
}
