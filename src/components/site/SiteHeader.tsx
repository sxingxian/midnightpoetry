import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { SceneToggle } from "./SceneToggle";

export function MoonMark({ size = 22 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round">
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </svg>
  );
}

export function SiteHeader({ current, overlay = false, sceneToggle = false }: { current?: "products" | "guides"; overlay?: boolean; sceneToggle?: boolean }) {
  return (
    <header className={`site-header${overlay ? " overlay" : ""}`}>
      <Link href="/" className="brand">
        <MoonMark />
        midnight poetry
      </Link>
      <nav aria-label="Main" className="nav">
        <Link href="/#made" aria-current={current === "products" ? "page" : undefined}>
          Products
        </Link>
        <Link href="/guides" aria-current={current === "guides" ? "page" : undefined}>
          Guides
        </Link>
        {sceneToggle ? <SceneToggle /> : null}
        <ThemeToggle />
      </nav>
    </header>
  );
}
