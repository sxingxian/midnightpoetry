import "server-only";
import { serverEnv } from "@/lib/env";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Transactional email through Resend's HTTP API (works on Workers, no SDK).
 * Auth emails (confirm sign-up, reset password) are sent by Supabase Auth through
 * Resend's SMTP — see the README. Failures are logged, never shown to visitors.
 */
export async function sendEmail(opts: { to: string; subject: string; lines: string[]; link?: { href: string; label: string } }): Promise<boolean> {
  const env = serverEnv();
  if (!env) {
    console.warn("[email] RESEND_API_KEY / EMAIL_FROM / OWNER_NOTIFY_EMAIL not set; skipping email");
    return false;
  }
  const text = [...opts.lines, opts.link ? `${opts.link.label}: ${opts.link.href}` : ""].filter(Boolean).join("\n\n");
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#1F1D1A">${opts.lines.map((l) => `<p>${esc(l)}</p>`).join("")}${
    opts.link ? `<p><a href="${esc(opts.link.href)}" style="color:#6B3404">${esc(opts.link.label)}</a></p>` : ""
  }<p style="color:#5E5A52;font-size:13px">Midnight Poetry Studio</p></div>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.emailFrom, to: [opts.to], subject: opts.subject.slice(0, 150), text, html }),
    });
    if (!res.ok) console.error("[email] Resend responded", res.status);
    return res.ok;
  } catch (e) {
    console.error("[email] send failed", e instanceof Error ? e.message : e);
    return false;
  }
}

export function ownerNotifyEmail(): string | null {
  return serverEnv()?.ownerNotifyEmail ?? null;
}
