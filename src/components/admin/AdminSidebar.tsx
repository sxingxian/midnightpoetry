"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MenuButton } from "@/components/site/MenuButton";
import { useScrollLock } from "@/lib/ui/useScrollLock";

/**
 * The admin sidebar. On phones it folds behind a sticky top bar and opens as a
 * full-screen overlay under it — the same pattern as the public site's menu:
 * same button, page behind locked, focus kept inside, Escape or a link closes it.
 */
export function AdminSidebar({ brand, children }: { brand: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const button = useRef<HTMLButtonElement>(null);
  const side = useRef<HTMLElement>(null);

  useEffect(() => setOpen(false), [path]);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const bar = button.current?.closest<HTMLElement>(".a-mbar");
    if (bar) document.documentElement.style.setProperty("--a-mbar-h", `${Math.round(bar.getBoundingClientRect().bottom)}px`);
    side.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !side.current) return;
      const items = [button.current, ...side.current.querySelectorAll<HTMLElement>("a, button:not([disabled])")].filter(Boolean) as HTMLElement[];
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
      if (window.innerWidth > 800) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <>
      <div className="a-mbar">
        {brand}
        <MenuButton ref={button} open={open} controls="admin-side" onToggle={() => setOpen((o) => !o)} className="a-icon-btn" />
      </div>
      <aside ref={side} id="admin-side" tabIndex={-1} className="a-side" data-open={open ? "true" : "false"} aria-label="Admin navigation">
        <div className="a-side-brand">{brand}</div>
        {children}
      </aside>
    </>
  );
}
