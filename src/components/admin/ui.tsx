import type { ActionResult } from "@/lib/admin/result";

export function Result({ state }: { state: ActionResult }) {
  if (state.error)
    return (
      <p className="a-alert err" role="alert">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p className="a-alert ok" role="status">
        {state.ok}
      </p>
    );
  return null;
}

export function StatusPill({ status }: { status: string }) {
  const cls = status === "published" || status === "live" ? "ok" : status === "scheduled" ? "info" : status === "draft" ? "warn" : "";
  return <span className={`pill ${cls}`}>{status[0]!.toUpperCase() + status.slice(1)}</span>;
}

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
