import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, safeNext } from "@/lib/auth";
import { MfaForm } from "../forms";

export const metadata: Metadata = { title: "Enter your code" };
export const dynamic = "force-dynamic";

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const s = await getSession();
  if (!s) redirect("/admin/login");
  if (!s.hasTotp) redirect("/admin/security");
  if (s.aal2) redirect(safeNext(sp.next));
  return <MfaForm next={safeNext(sp.next)} />;
}
