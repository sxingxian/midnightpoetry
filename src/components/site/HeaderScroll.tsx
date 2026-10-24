"use client";

import { useEffect } from "react";

/** Marks the sticky header once the page has scrolled, so it gains its glass background. */
export function HeaderScroll() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    if (!header) return;
    const sync = () => {
      header.dataset.scrolled = window.scrollY > 8 ? "true" : "false";
    };
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);
  return null;
}
