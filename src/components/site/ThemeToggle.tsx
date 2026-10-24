"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

function currentTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(currentTheme());
    const onExternal = () => setTheme(currentTheme());
    window.addEventListener("mp-theme", onExternal);
    return () => window.removeEventListener("mp-theme", onExternal);
  }, []);

  const toggle = () => {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("mp-theme", next);
    } catch {
      /* private mode: theme just won't persist */
    }
    setTheme(next);
    window.dispatchEvent(new Event("mp-theme"));
  };

  const label = theme === "light" ? "Switch to dark theme" : "Switch to light theme";
  return (
    <button type="button" className="icon-btn press" aria-label={label} title={label} onClick={toggle} style={{ marginLeft: 6 }}>
      {theme === "light" ? (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
        </svg>
      ) : (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )}
    </button>
  );
}
