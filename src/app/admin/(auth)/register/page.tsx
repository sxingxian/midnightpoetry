import type { Metadata } from "next";
import { publicEnv } from "@/lib/env";
import { RegisterForm } from "../forms";

export const metadata: Metadata = { title: "Request access" };
export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return <RegisterForm siteKey={publicEnv().turnstileSiteKey} />;
}
