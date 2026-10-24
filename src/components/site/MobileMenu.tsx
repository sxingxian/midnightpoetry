"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SceneToggle } from "./SceneToggle";

/**
 * Phone-width navigation: the menu button opens a full-screen overlay under the
 * sticky header. The page behind stops scrolling, focus stays inside the menu,
 * and Escape, a link or the button closes it (focus returns to the button).
 * The overlay is portalled to <body> so the header's glass blur can't clip it.
 */
export function MobileMenu({ current, sceneToggle }: { current?: "products" | "guides"; sceneToggle: boolean }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [top, setTop] = useState(72);
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const path = usePathname();

  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [path]);

  useEffect(() => {
    const header = button.current?.closest<HTMLElement>(".site-header");
    if (!open) {
      if (header) delete header.dataset.menu;
      return;
    }
    if (header) {
      header.dataset.menu = "open";
      setTop(Math.round(header.getBoundingClientRect().bottom));
    }
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      // Keep Tab inside the menu and its button.
      const items = [button.current, ...panel.current.querySelectorAll<HTMLElement>("a, button:not([disabled])")].filter(Boolean) as HTMLElement[];
      const i = items.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && i <= 0) {
        e.preventDefault();
        items[items.length - 1]!.focus();
      } else if (!e.shiftKey && i === items.length - 1) {
        e.preventDefault();
        items[0]!.focus();
      }
    };
    const onResize = () => {
      if (window.innerWidth > 720) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      root.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const overlay = (
    <div ref={panel} id={id} tabIndex={-1} className="menu-overlay" style={{ top }} role="dialog" aria-modal="true" aria-label="Menu" hidden={!open}>
      <nav aria-label="Menu" className="menu-links">
        <Link href="/#made" aria-current={current === "products" ? "page" : undefined} onClick={() => setOpen(false)}>
          Products
          <span aria-hidden="true">→</span>
        </Link>
        <Link href="/guides" aria-current={current === "guides" ? "page" : undefined} onClick={() => setOpen(false)}>
          Guides
          <span aria-hidden="true">→</span>
        </Link>
      </nav>
      {sceneToggle ? (
        <div className="menu-row">
          <span>Scene</span>
          <SceneToggle />
        </div>
      ) : null}
    </div>
  );

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
      {mounted ? createPortal(overlay, document.body) : null}
    </>
  );
}
