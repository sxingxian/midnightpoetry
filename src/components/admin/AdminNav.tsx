"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: React.ReactNode };

const I = (d: string) => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export function AdminNav({ isOwner }: { isOwner: boolean }) {
  const path = usePathname();
  const items: Item[] = [
    { href: "/admin", label: "Content", icon: I("M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z") },
    { href: "/admin/products", label: "Products", icon: I("M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z") },
    { href: "/admin/guides", label: "Guides", icon: I("M4 4h11l5 5v11H4zM8 12h8M8 16h6") },
    { href: "/admin/ads", label: "Ads on guides", icon: I("M3 10v4h3l6 4V6L6 10zM16 9a4 4 0 0 1 0 6") },
    ...(isOwner
      ? [
          { href: "/admin/users", label: "People & roles", icon: I("M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M17 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6") },
          { href: "/admin/audit", label: "Audit log", icon: I("M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6zM9 12l2 2 4-4") },
        ]
      : []),
    { href: "/admin/security", label: "Two-step sign-in", icon: I("M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4") },
  ];
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(href + "/"));
  return (
    <nav aria-label="Sections" className="a-nav">
      {items.map((it) => (
        <Link key={it.href} href={it.href} aria-current={active(it.href) ? "page" : undefined}>
          {it.icon}
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
