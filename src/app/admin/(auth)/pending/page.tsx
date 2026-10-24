import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { signOut } from "../actions";

export const metadata: Metadata = { title: "Waiting for approval" };
export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const s = await getSession();
  if (!s) redirect("/admin/login");
  if (!s.hasTotp) redirect("/admin/security");
  if (!s.aal2) redirect("/admin/mfa?next=/admin/pending");
  if (s.profile && s.profile.role !== "pending") redirect("/admin");
  return (
    <form action={signOut} className="a-card">
      <h1>Waiting for approval</h1>
      <p>Your account is set up. An owner has been told you&apos;re here and will give you a role — you&apos;ll get an email when they do.</p>
      <button className="a-btn">Sign out</button>
    </form>
  );
}
