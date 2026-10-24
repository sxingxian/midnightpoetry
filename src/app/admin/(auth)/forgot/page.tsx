import type { Metadata } from "next";
import { publicEnv } from "@/lib/env";
import { ForgotForm } from "../forms";

export const metadata: Metadata = { title: "Reset password" };
export const dynamic = "force-dynamic";

export default function ForgotPage() {
  return <ForgotForm siteKey={publicEnv().turnstileSiteKey} />;
}
