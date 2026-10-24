// Local stand-in for Supabase's REST API, backed by the real migration + seed in
// PGlite. Only for smoke-testing pages without a Supabase project:
//   node tests/mock-supabase.mjs   (listens on :54321)
import http from "node:http";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const STUBS = `
create schema if not exists auth; create schema if not exists storage; create schema if not exists extensions;
create role anon nologin; create role authenticated nologin;
create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}'::jsonb);
create table auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid, factor_type text, status text);
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
`;

const db = new PGlite();
await db.exec(STUBS);
for (const file of readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort()) {
  await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8").replace(/create extension if not exists pgcrypto[^;]*;/, ""));
}
await db.exec(readFileSync("supabase/seed.sql", "utf8"));

// Optional extra SQL for screenshots, e.g. MOCK_SQL="insert into public.guides …"
if (process.env.MOCK_SQL) await db.exec(process.env.MOCK_SQL);

const ADMIN = process.env.MOCK_ADMIN === "1";
const OWNER = "00000000-0000-0000-0000-0000000000aa";
if (ADMIN) {
  await db.exec(`insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values ('${OWNER}', 'owner@example.com', now(), '{"display_name":"Owner"}');
    insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000bb', 'new@example.com');
    select public.promote_owner('owner@example.com');
    update public.guides set title = title || ' ' where true; update public.guides set title = trim(title) where true;`);
}
const TABLES = new Set(["products", "categories", "guides", "ad_settings", "ads", ...(ADMIN ? ["profiles", "guide_revisions", "ad_clicks", "audit_events"] : [])]);
const PUBLIC_FILTER = {
  products: "status = 'live'",
  guides: "(status = 'published' or (status = 'scheduled' and publish_at <= now()))",
  ads: "status = 'live' and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())",
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const send = (code, body) => {
    res.writeHead(code, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  try {
    if (url.pathname === "/auth/v1/user" && ADMIN)
      return send(200, { id: OWNER, aud: "authenticated", role: "authenticated", email: "owner@example.com", app_metadata: {}, user_metadata: {}, created_at: "2026-10-24T00:00:00Z", factors: [{ id: "11111111-1111-1111-1111-111111111111", factor_type: "totp", status: "verified", friendly_name: "phone", created_at: "2026-10-24T00:00:00Z", updated_at: "2026-10-24T00:00:00Z" }] });
    if (url.pathname.startsWith("/auth/v1/")) return send(401, { message: "no session" });
    if (url.pathname === "/rest/v1/rpc/record_ad_click") {
      let raw = "";
      for await (const c of req) raw += c;
      const { p_ad, p_visitor, p_key } = JSON.parse(raw || "{}");
      const r = await db.query("select public.record_ad_click($1, $2, $3) as url", [p_ad, p_visitor ?? "", p_key ?? ""]);
      return send(200, r.rows[0]?.url ?? null);
    }
    if (url.pathname === "/rest/v1/rpc/admin_user_status" && ADMIN) {
      const r = await db.query("select u.id, u.email_confirmed_at is not null as email_confirmed, u.email = 'owner@example.com' as has_totp from auth.users u");
      return send(200, r.rows);
    }
    const m = url.pathname.match(/^\/rest\/v1\/(\w+)$/);
    if (!m || !TABLES.has(m[1])) return send(404, { message: "not found" });
    const table = m[1];
    const where = [ADMIN ? "true" : (PUBLIC_FILTER[table] ?? "true")];
    const params = [];
    for (const [k, v] of url.searchParams) {
      if (["select", "order", "limit"].includes(k)) continue;
      const eq = v.match(/^eq\.(.*)$/) || null;
      if (eq && /^\w+$/.test(k)) {
        params.push(eq[1]);
        where.push(`${k}::text = $${params.length}`);
      }
    }
    const order = url.searchParams.get("order");
    let orderSql = "";
    if (order) {
      const [col, dir] = order.split(".");
      if (/^\w+$/.test(col)) orderSql = ` order by ${col} ${dir === "desc" ? "desc" : "asc"}`;
    }
    // MOCK_ADMIN only: enough of PostgREST's writes to exercise the admin forms (as a superuser, no RLS).
    if (ADMIN && ["PATCH", "POST", "DELETE"].includes(req.method)) {
      let raw = "";
      for await (const c of req) raw += c;
      const body = raw ? JSON.parse(raw) : null;
      const out = [];
      if (req.method === "PATCH") {
        const cols = Object.keys(body).filter((k) => /^\w+$/.test(k));
        params.push(JSON.stringify(body));
        const n = params.length;
        const set = cols.map((c) => `${c} = (select ${c} from jsonb_populate_record(null::public.${table}, $${n}::jsonb))`).join(", ");
        out.push(...(await db.query(`update public.${table} set ${set} where ${where.join(" and ")} returning *`, params)).rows);
      } else if (req.method === "POST") {
        for (const row of Array.isArray(body) ? body : [body]) {
          const cols = Object.keys(row).filter((k) => /^\w+$/.test(k));
          out.push(...(await db.query(`insert into public.${table} (${cols.join(", ")}) select ${cols.join(", ")} from jsonb_populate_record(null::public.${table}, $1::jsonb) returning *`, [JSON.stringify(row)])).rows);
        }
      } else {
        out.push(...(await db.query(`delete from public.${table} where ${where.join(" and ")} returning *`, params)).rows);
      }
      const rows = JSON.parse(JSON.stringify(out));
      if (!(req.headers.prefer ?? "").includes("return=representation")) { res.writeHead(204); return res.end(); }
      if ((req.headers.accept ?? "").includes("vnd.pgrst.object")) return rows.length === 1 ? send(200, rows[0]) : send(406, { code: "PGRST116", message: "no rows" });
      return send(200, rows);
    }
    const r = await db.query(`select * from public.${table} where ${where.join(" and ")}${orderSql}`, params);
    const rows = JSON.parse(JSON.stringify(r.rows));
    if (req.method === "HEAD") { res.writeHead(200, { "content-range": `0-${rows.length}/${rows.length}` }); return res.end(); }
    if ((req.headers.accept ?? "").includes("vnd.pgrst.object")) {
      if (rows.length !== 1) return send(406, { code: "PGRST116", message: "no rows" });
      return send(200, rows[0]);
    }
    return send(200, rows);
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? String(e.code) : undefined;
    send(code ? 400 : 500, { code, message: String(e) });
  }
});
server.listen(54321, () => console.log("mock supabase on :54321"));
