import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { signOut } from "../(auth)/actions";

export const dynamic = "force-dynamic";

export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin("viewer");
  return (
    <div className="a-shell">
      <aside className="a-side" aria-label="Admin navigation">
        <Link href="/" className="a-brand" style={{ textDecoration: "none", color: "var(--a-ink)" }}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F2B661" strokeWidth="1.8" strokeLinecap="round">
            <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
          </svg>
          studio admin
        </Link>
        <AdminNav isOwner={profile.role === "owner"} />
        <div className="a-me">
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 13 }}>{profile.display_name || profile.email}</span>
            <span style={{ fontSize: 12, color: "var(--a-muted)", textTransform: "capitalize" }}>{profile.role}</span>
          </div>
          <form action={signOut}>
            <button className="a-btn sm">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="a-main">{children}</main>
    </div>
  );
}
