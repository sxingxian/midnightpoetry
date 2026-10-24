import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ResetForm } from "../forms";

export const metadata: Metadata = { title: "New password" };
export const dynamic = "force-dynamic";

export default async function ResetPage() {
  const s = await getSession();
  if (!s) redirect("/admin/login?link=expired");
  return <ResetForm />;
}
