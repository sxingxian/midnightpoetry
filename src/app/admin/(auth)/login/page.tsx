import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { publicEnv } from "@/lib/env";
import { getSession, safeNext } from "@/lib/auth";
import { LoginForm } from "../forms";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; link?: string }> }) {
  const sp = await searchParams;
  const s = await getSession();
  if (s?.aal2) redirect(safeNext(sp.next));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 420 }}>
      {sp.link === "expired" ? (
        <p className="a-alert warn" role="status">
          That link has expired or was already used. Sign in, or request a new link.
        </p>
      ) : null}
      <LoginForm siteKey={publicEnv().turnstileSiteKey} next={safeNext(sp.next)} />
    </div>
  );
}
