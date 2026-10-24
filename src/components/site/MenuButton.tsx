"use client";

import { forwardRef } from "react";

/** The one menu button used across the site and the admin: three lines that turn into ✕. */
export const MenuButton = forwardRef<HTMLButtonElement, { open: boolean; controls: string; onToggle: () => void; className?: string }>(function MenuButton(
  { open, controls, onToggle, className = "icon-btn press" },
  ref,
) {
  return (
    <button ref={ref} type="button" className={`${className} menu-btn`} aria-expanded={open} aria-controls={controls} aria-label={open ? "Close menu" : "Open menu"} onClick={onToggle}>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <path className={`mb-l1${open ? " x" : ""}`} d="M4 7h16" />
        <path className={`mb-l2${open ? " x" : ""}`} d="M4 12h16" />
        <path className={`mb-l3${open ? " x" : ""}`} d="M4 17h16" />
      </svg>
    </button>
  );
});
