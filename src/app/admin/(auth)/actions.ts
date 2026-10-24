"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { safeNext } from "@/lib/auth";
import { ownerNotifyEmail, sendEmail } from "@/lib/email";

export type FormState = { error?: string; ok?: string; attempt?: number };

const email = z.email().max(254).transform((v) => v.trim().toLowerCase());
const password = z.string().min(12, "Use at least 12 characters.").max(128);
const captcha = z.string().min(10, "Please complete the security check.").max(4096);
const code = z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your app.");

const bump = (prev: FormState) => (prev.attempt ?? 0) + 1;

export async function signIn(prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ email, password: z.string().min(1).max(128), captcha }).safeParse({
    email: form.get("email"),
    password: form.get("password"),
    captcha: form.get("cf-turnstile-response"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form.", attempt: bump(prev) };
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password, options: { captchaToken: parsed.data.captcha } });
  if (error) {
    // Same message whatever went wrong, so the form can't be used to find accounts.
    const unconfirmed = error.code === "email_not_confirmed";
    return { error: unconfirmed ? "Confirm your email first — check your inbox for the link." : "Email or password is incorrect, or the security check expired. Try again.", attempt: bump(prev) };
  }
  const next = safeNext(form.get("next"));
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const hasTotp = (factors?.totp ?? []).some((f) => f.status === "verified");
  redirect(hasTotp ? `/admin/mfa?next=${encodeURIComponent(next)}` : "/admin/security");
}

export async function register(prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({ name: z.string().trim().min(1, "Add your name.").max(80), email, password, confirm: z.string(), captcha })
    .refine((v) => v.password === v.confirm, { message: "The passwords don't match.", path: ["confirm"] })
    .safeParse({
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
      confirm: form.get("confirm"),
      captcha: form.get("cf-turnstile-response"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form.", attempt: bump(prev) };
  const env = publicEnv();
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      captchaToken: parsed.data.captcha,
      emailRedirectTo: `${env.siteUrl}/admin`,
      data: { display_name: parsed.data.name },
    },
  });
  if (error) {
    const weak = error.code === "weak_password";
    return { error: weak ? "That password is too easy to guess. Try a longer one." : "We couldn't create the account. Try again in a minute.", attempt: bump(prev) };
  }
  const owner = ownerNotifyEmail();
  if (owner) {
    await sendEmail({
      to: owner,
      subject: "New studio admin registration",
      lines: [`${parsed.data.name} (${parsed.data.email}) registered for the studio admin.`, "They can't see or change anything until you give them a role."],
      link: { href: `${env.siteUrl}/admin/users`, label: "Review people and roles" },
    });
  }
  return { ok: "Check your email for a link to confirm your address. An owner will then give you access.", attempt: bump(prev) };
}

export async function forgotPassword(prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ email, captcha }).safeParse({ email: form.get("email"), captcha: form.get("cf-turnstile-response") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form.", attempt: bump(prev) };
  const supabase = await createSessionClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, { captchaToken: parsed.data.captcha, redirectTo: `${publicEnv().siteUrl}/admin/reset` });
  // Always the same answer, whether or not the address has an account.
  return { ok: "If that address has an account, a reset link is on its way.", attempt: bump(prev) };
}

export async function verifyMfa(prev: FormState, form: FormData): Promise<FormState> {
  const parsed = code.safeParse(String(form.get("code") ?? "").replace(/\s/g, ""));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, attempt: bump(prev) };
  const supabase = await createSessionClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = (factors?.totp ?? []).find((f) => f.status === "verified");
  if (!factor) redirect("/admin/security");
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: parsed.data });
  if (error) return { error: "That code didn't work. Codes change every 30 seconds — try the new one.", attempt: bump(prev) };
  redirect(safeNext(form.get("next")));
}

export type EnrollState = FormState & { factorId?: string; qr?: string; secret?: string };

export async function startEnroll(prev: EnrollState): Promise<EnrollState> {
  const supabase = await createSessionClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) redirect("/admin/login");
  const { data: factors } = await supabase.auth.mfa.listFactors();
  // Clear half-finished set-ups so a fresh QR code can be made.
  for (const f of factors?.all ?? []) if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)} ${crypto.randomUUID().slice(0, 4)}` });
  if (error || !data) return { error: "Couldn't start set-up. Refresh and try again.", attempt: bump(prev) };
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret, attempt: bump(prev) };
}

export async function confirmEnroll(prev: EnrollState, form: FormData): Promise<EnrollState> {
  const factorId = z.uuid().safeParse(form.get("factorId"));
  const parsed = code.safeParse(String(form.get("code") ?? "").replace(/\s/g, ""));
  if (!factorId.success) return { ...prev, error: "Start again.", attempt: bump(prev) };
  if (!parsed.success) return { ...prev, error: parsed.error.issues[0]?.message, attempt: bump(prev) };
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factorId.data, code: parsed.data });
  if (error) return { ...prev, error: "That code didn't work. Check your phone's clock and try the newest code.", attempt: bump(prev) };
  redirect("/admin");
}

export async function resetPassword(prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({ password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: "The passwords don't match." })
    .safeParse({ password: form.get("password"), confirm: form.get("confirm") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, attempt: bump(prev) };
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "insufficient_aal") redirect("/admin/mfa?next=/admin/reset");
    if (error.code === "same_password") return { error: "Choose a password you haven't used here before.", attempt: bump(prev) };
    return { error: "Couldn't change the password. The link may have expired — request a new one.", attempt: bump(prev) };
  }
  return { ok: "Password changed.", attempt: bump(prev) };
}

export async function signOut(): Promise<void> {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
