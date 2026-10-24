"use server";

import { z } from "zod";
import { requireActionRole } from "@/lib/auth";
import { failure, str, type ActionResult } from "@/lib/admin/result";
import { sendEmail } from "@/lib/email";
import { publicEnv } from "@/lib/env";

export async function setRole(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const parsed = z.object({ id: z.uuid(), role: z.enum(["pending", "viewer", "editor", "owner"]) }).safeParse({ id: str(form.get("id")), role: str(form.get("role")) });
  if (!parsed.success) return { error: "Pick a role." };
  try {
    const { supabase } = await requireActionRole("owner");
    if (parsed.data.role !== "pending") {
      // Only give access to people who confirmed their email and set up two-step sign-in.
      const { data: status, error: statusError } = await supabase.rpc("admin_user_status");
      if (statusError) throw statusError;
      const s = ((status ?? []) as { id: string; email_confirmed: boolean; has_totp: boolean }[]).find((x) => x.id === parsed.data.id);
      if (!s?.email_confirmed || !s.has_totp) return { error: "They need to confirm their email and set up their authenticator app first." };
    }
    const { data: before } = await supabase.from("profiles").select("email, role, display_name").eq("id", parsed.data.id).maybeSingle();
    const { error } = await supabase.from("profiles").update({ role: parsed.data.role }).eq("id", parsed.data.id);
    if (error) {
      if (String(error.message).includes("last owner")) return { error: "There must always be at least one owner." };
      throw error;
    }
    if (before && before.role === "pending" && parsed.data.role !== "pending") {
      await sendEmail({
        to: before.email,
        subject: "You now have access to the studio admin",
        lines: [`Hi ${before.display_name || "there"},`, `An owner gave you the ${parsed.data.role} role in the Midnight Poetry studio admin.`],
        link: { href: `${publicEnv().siteUrl}/admin`, label: "Open the studio admin" },
      });
    }
    return { ok: "Role updated.", n: Date.now() };
  } catch (e) {
    return failure(e);
  }
}
