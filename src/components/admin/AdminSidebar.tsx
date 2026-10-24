"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * The admin sidebar. On phones it folds behind a sticky top bar and opens as a
 * full-screen overlay under it; it closes on navigation and on Escape.
 */
export function AdminSidebar({ brand, children }: { brand: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    // Phone overlay: sit right under the sticky bar, and stop the page behind from scrolling.
    const bar = button.current?.closest<HTMLElement>(".a-mbar");
    if (bar) document.documentElement.style.setProperty("--a-mbar-h", `${Math.round(bar.getBoundingClientRect().bottom)}px`);
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    if (window.matchMedia("(max-width: 800px)").matches) root.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <div className="a-mbar">
        {brand}
        <button ref={button} type="button" className="a-btn sm" aria-expanded={open} aria-controls="admin-side" onClick={() => setOpen((o) => !o)}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
          {open ? "Close" : "Menu"}
        </button>
      </div>
      <aside id="admin-side" className="a-side" data-open={open ? "true" : "false"} aria-label="Admin navigation">
        <div className="a-side-brand">{brand}</div>
        {children}
      </aside>
    </>
  );
}
