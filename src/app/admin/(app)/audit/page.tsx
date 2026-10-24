import { requireAdmin } from "@/lib/auth";
import { fmtDate } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit log" };

export default async function AuditPage() {
  const { supabase } = await requireAdmin("owner", "/admin/audit");
  const { data } = await supabase.from("audit_events").select("id, actor_email, action, entity, summary, created_at").order("created_at", { ascending: false }).limit(300);
  return (
    <>
      <div className="a-top">
        <h1>Audit log</h1>
        <span className="a-help">Last 300 changes. Written by the database itself; nobody can edit or delete entries.</span>
      </div>
      <div className="a-section a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Who</th>
              <th scope="col">What</th>
              <th scope="col">Details</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((e) => (
              <tr key={e.id}>
                <td className="mono" style={{ fontSize: 12, color: "var(--a-muted)", whiteSpace: "nowrap" }}>
                  {fmtDate(e.created_at)}
                </td>
                <td data-label="Who">{e.actor_email ?? "System"}</td>
                <td data-label="What">
                  <span className="pill">{e.action}</span> {e.entity.replace("_", " ")}
                </td>
                <td data-label="Details" style={{ color: "var(--a-ink2)" }}>{e.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
