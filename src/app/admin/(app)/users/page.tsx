import { SavedVersion } from "@/components/admin/SavedVersion";
import { requireAdmin } from "@/lib/auth";
import { RoleForm } from "@/components/admin/RoleForm";
import { fmtDate } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "People & roles" };

export default async function UsersPage() {
  const { supabase, user } = await requireAdmin("owner", "/admin/users");
  const { data } = await supabase.from("profiles").select("id, email, display_name, role, created_at").order("created_at", { ascending: false });
  const rows = data ?? [];
  const { data: status } = await supabase.rpc("admin_user_status");
  const ready = new Map<string, { email: boolean; totp: boolean }>(
    ((status ?? []) as { id: string; email_confirmed: boolean; has_totp: boolean }[]).map((s) => [s.id, { email: s.email_confirmed, totp: s.has_totp }]),
  );
  const pending = rows.filter((r) => r.role === "pending").length;
  return (
    <>
      <div className="a-top">
        <div className="a-row">
          <h1>People &amp; roles</h1>
          {pending ? <span className="pill warn">{pending} waiting</span> : null}
        </div>
      </div>
      <p className="a-help a-section" style={{ maxWidth: 720 }}>
        <strong>Viewer</strong> can look around. <strong>Editor</strong> writes guides, products and ads. <strong>Owner</strong> also manages ad settings, people and the audit log. Everyone signs in with a
        password and a code from an authenticator app. A role can only be given once the person has confirmed their email and set up their authenticator app.
      </p>
      <div className="a-section a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th scope="col">Person</th>
              <th scope="col">Joined</th>
              <th scope="col">Sign-in</th>
              <th scope="col">Role</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.display_name || "—"}
                  {r.id === user.id ? <span className="pill" style={{ marginLeft: 8 }}>You</span> : null}
                  <span className="a-sub">{r.email}</span>
                </td>
                <td data-label="Joined" className="mono" style={{ fontSize: 12, color: "var(--a-muted)" }}>
                  {fmtDate(r.created_at)}
                </td>
                <td data-label="Sign-in">
                  <div className="a-row" style={{ gap: 6 }}>
                    <span className={ready.get(r.id)?.email ? "pill ok" : "pill warn"}>{ready.get(r.id)?.email ? "Email confirmed" : "Email not confirmed"}</span>
                    <span className={ready.get(r.id)?.totp ? "pill ok" : "pill warn"}>{ready.get(r.id)?.totp ? "Authenticator on" : "No authenticator"}</span>
                  </div>
                </td>
                <td data-label="Role">
                  <SavedVersion version={r.role}>
                    <RoleForm id={r.id} role={r.role} label={r.email} ready={!!ready.get(r.id)?.email && !!ready.get(r.id)?.totp} />
                  </SavedVersion>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
