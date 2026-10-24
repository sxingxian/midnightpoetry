import type { ActionResult } from "@/lib/admin/result";

export function Result({ state, onDiscard }: { state: ActionResult; onDiscard?: () => void }) {
  if (state.error)
    return (
      <div className="a-alert err" role="alert" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span>
          <strong>Not saved.</strong> {state.error}
          {onDiscard ? " Your edits are still on screen." : ""}
        </span>
        {onDiscard ? (
          <button type="button" className="a-btn sm" onClick={onDiscard}>
            Discard changes
          </button>
        ) : null}
      </div>
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
