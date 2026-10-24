"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { SceneToggle } from "./SceneToggle";

/**
 * Phone-width navigation: a menu button that opens a panel under the header.
 * Closes on Escape, on an outside tap, and when a link is followed; focus goes
 * into the panel on open and back to the button on close.
 */
export function MobileMenu({ current, sceneToggle }: { current?: "products" | "guides"; sceneToggle: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const path = usePathname();

  useEffect(() => setOpen(false), [path]);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus(); // the panel, not a link, so no focus ring flashes on tap; Tab moves into it
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !button.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={button}
        type="button"
        className="icon-btn press menu-btn"
        aria-expanded={open}
        aria-controls={id}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((o) => !o)}
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path className={`mb-l1${open ? " x" : ""}`} d="M4 7h16" />
          <path className={`mb-l2${open ? " x" : ""}`} d="M4 12h16" />
          <path className={`mb-l3${open ? " x" : ""}`} d="M4 17h16" />
        </svg>
      </button>
      <div ref={panel} id={id} tabIndex={-1} className="menu-panel" data-open={open ? "true" : "false"} hidden={!open}>
        <nav aria-label="Menu" className="menu-links">
          <Link href="/#made" aria-current={current === "products" ? "page" : undefined} onClick={() => setOpen(false)}>
            Products
          </Link>
          <Link href="/guides" aria-current={current === "guides" ? "page" : undefined} onClick={() => setOpen(false)}>
            Guides
          </Link>
        </nav>
        {sceneToggle ? (
          <div className="menu-row">
            <span>Scene</span>
            <SceneToggle />
          </div>
        ) : null}
      </div>
    </>
  );
}
