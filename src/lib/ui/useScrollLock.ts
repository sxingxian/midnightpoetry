"use client";

import { useEffect } from "react";

/**
 * Stops the page behind an overlay from scrolling while `active`.
 * Locks <html> only — never <body> — and body uses overflow-x: clip (not hidden),
 * so sticky bars keep sticking to the viewport instead of jumping off screen.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = prev;
    };
  }, [active]);
}
