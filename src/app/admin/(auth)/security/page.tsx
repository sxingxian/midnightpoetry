import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { EnrollForm } from "../forms";

export const metadata: Metadata = { title: "Two-step sign-in" };
export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const s = await getSession();
  if (!s) redirect("/admin/login?next=/admin/security");
  if (s.hasTotp && !s.aal2) redirect("/admin/mfa?next=/admin/security");
  if (s.hasTotp) {
    return (
      <div className="a-card">
        <h1>Two-step sign-in is on</h1>
        <p>You&apos;ll be asked for a code from your authenticator app each time you sign in. If you lose your phone, ask an owner to reset it from Supabase.</p>
        <Link href="/admin" className="a-btn primary">
          Go to the admin
        </Link>
      </div>
    );
  }
  return <EnrollForm />;
}
