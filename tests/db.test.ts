import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Runs the real migration + seed in an in-memory Postgres (PGlite) with small
 * stand-ins for Supabase's auth and storage schemas, then checks the security
 * rules from the point of view of anon, a pending user, an editor and an owner.
 */

const STUBS = `
create schema if not exists auth;
create schema if not exists storage;
create schema if not exists extensions;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
grant usage on schema public, auth, storage to anon, authenticated;
grant execute on all functions in schema auth to anon, authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
`;

const OWNER = "00000000-0000-0000-0000-000000000001";
const EDITOR = "00000000-0000-0000-0000-000000000002";
const PENDING = "00000000-0000-0000-0000-000000000003";

let db: PGlite;

async function as(role: "anon" | "authenticated" | "postgres", uid?: string, aal: "aal1" | "aal2" = "aal2") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claims', $2, false)", [
    uid ?? "",
    uid ? JSON.stringify({ sub: uid, aal, role: role }) : "",
  ]);
  if (role !== "postgres") await db.exec(`set role ${role}`);
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(STUBS);
  const migration = readFileSync("supabase/migrations/20261024000000_init.sql", "utf8").replace(
    /create extension if not exists pgcrypto[^;]*;/,
    "",
  );
  await db.exec(migration);
  await db.exec(readFileSync("supabase/seed.sql", "utf8"));
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${OWNER}', 'owner@example.com', '{"display_name":"Owner"}'),
      ('${EDITOR}', 'editor@example.com', '{}'),
      ('${PENDING}', 'new@example.com', '{"display_name":"${"x".repeat(200)}"}');
    select public.promote_owner('owner@example.com');
    update public.profiles set role = 'editor' where id = '${EDITOR}';
  `);
});

describe("database security", () => {
  it("creates a pending profile for every new user and trims long names", async () => {
    await as("postgres");
    const r = await db.query<{ role: string; n: number }>(`select role, char_length(display_name) as n from public.profiles where id = '${PENDING}'`);
    expect(r.rows[0]).toEqual({ role: "pending", n: 80 });
  });

  it("lets anyone read live products and published guides, but not drafts", async () => {
    await as("postgres");
    await db.exec(`insert into public.guides (product_id, slug, title, status) select id, 'draft-one', 'Draft', 'draft' from public.products where slug = 'zeno'`);
    await as("anon");
    const products = await db.query(`select slug from public.products order by sort_order`);
    expect((products.rows as { slug: string }[]).map((r) => r.slug)).toEqual(["zyra", "zeno"]);
    const guides = await db.query(`select slug from public.guides`);
    expect((guides.rows as { slug: string }[]).map((r) => r.slug)).toEqual(["split-gst-service-charge"]);
  });

  it("shows scheduled guides only once they are due", async () => {
    await as("postgres");
    await db.exec(`
      insert into public.guides (product_id, slug, title, status, publish_at) select id, 'later', 'Later', 'scheduled', now() + interval '1 day' from public.products where slug = 'zeno';
      insert into public.guides (product_id, slug, title, status, publish_at) select id, 'due', 'Due', 'scheduled', now() - interval '1 minute' from public.products where slug = 'zeno';`);
    await as("anon");
    const r = await db.query(`select slug from public.guides where status = 'scheduled'`);
    expect((r.rows as { slug: string }[]).map((x) => x.slug)).toEqual(["due"]);
  });

  it("blocks writes from anon and from editors without a second factor", async () => {
    await as("anon");
    await expect(db.exec(`insert into public.products (slug, name) values ('x', 'X')`)).rejects.toThrow();
    await as("authenticated", EDITOR, "aal1");
    await expect(db.exec(`insert into public.products (slug, name) values ('x', 'X')`)).rejects.toThrow();
    await as("authenticated", EDITOR, "aal2");
    await db.exec(`insert into public.products (slug, name) values ('x', 'X')`);
  });

  it("stops pending users and editors from changing roles", async () => {
    await as("authenticated", PENDING, "aal2");
    const r = await db.query(`update public.profiles set role = 'owner' where id = '${PENDING}' returning id`);
    expect(r.rows.length).toBe(0); // RLS: no update policy for non-owners
    await as("authenticated", EDITOR, "aal2");
    const r2 = await db.query(`update public.profiles set role = 'owner' where id = '${EDITOR}' returning id`);
    expect(r2.rows.length).toBe(0);
  });

  it("lets owners change roles but never remove the last owner", async () => {
    await as("authenticated", OWNER, "aal2");
    await db.exec(`update public.profiles set role = 'viewer' where id = '${PENDING}'`);
    await expect(db.exec(`update public.profiles set role = 'editor' where id = '${OWNER}'`)).rejects.toThrow(/last owner/);
    await expect(db.exec(`update public.profiles set email = 'x@y.z' where id = '${PENDING}'`)).rejects.toThrow(/read-only/);
  });

  it("keeps a revision for every edit and bumps the version", async () => {
    await as("authenticated", EDITOR, "aal2");
    await db.exec(`update public.guides set title = 'How to split GST fairly' where slug = 'split-gst-service-charge'`);
    await as("postgres");
    const g = await db.query<{ version: number }>(`select version from public.guides where slug = 'split-gst-service-charge'`);
    expect(g.rows[0]?.version).toBe(2);
    const rev = await db.query(`select version from public.guide_revisions`);
    expect(rev.rows.length).toBe(1);
  });

  it("has no way to hard-delete guides", async () => {
    await as("authenticated", OWNER, "aal2");
    const r = await db.query(`delete from public.guides returning id`);
    expect(r.rows.length).toBe(0);
  });

  it("only owners read the audit log, and nobody can write it directly", async () => {
    await as("authenticated", EDITOR, "aal2");
    expect((await db.query(`select * from public.audit_events`)).rows.length).toBe(0);
    await expect(db.exec(`insert into public.audit_events (action, entity) values ('x', 'y')`)).rejects.toThrow();
    await as("authenticated", OWNER, "aal2");
    expect((await db.query(`select * from public.audit_events`)).rows.length).toBeGreaterThan(0);
  });

  it("counts clicks only for running ads and returns their link", async () => {
    await as("anon");
    const live = await db.query<{ id: string }>(`select id from public.ads limit 1`);
    const id = live.rows[0]!.id;
    const r = await db.query<{ url: string }>(`select public.record_ad_click($1) as url`, [id]);
    expect(r.rows[0]?.url).toBe("https://zyra.midnightpoetry.studio/");
    await as("postgres");
    await db.exec(`update public.ads set status = 'paused' where id = '${id}'`);
    await as("anon");
    const r2 = await db.query<{ url: string | null }>(`select public.record_ad_click($1) as url`, [id]);
    expect(r2.rows[0]?.url).toBeNull();
    await expect(db.query(`select * from public.ad_clicks`)).resolves.toBeDefined();
    expect((await db.query(`select * from public.ad_clicks`)).rows.length).toBe(0); // anon can't read clicks
  });

  it("only owners can change ad settings, and AdSense IDs must look real", async () => {
    await as("authenticated", EDITOR, "aal2");
    const r = await db.query(`update public.ad_settings set network_enabled = true returning id`);
    expect(r.rows.length).toBe(0);
    await as("authenticated", OWNER, "aal2");
    await expect(db.exec(`update public.ad_settings set adsense_client = 'ca-pub-123'`)).rejects.toThrow();
    await db.exec(`update public.ad_settings set adsense_client = 'ca-pub-0000000000000000'`);
  });

  it("rejects non-https links and bad slugs", async () => {
    await as("authenticated", EDITOR, "aal2");
    await expect(db.exec(`insert into public.ads (name, kind, headline, url) values ('a', 'house', 'h', 'javascript:alert(1)')`)).rejects.toThrow();
    await expect(db.exec(`insert into public.products (slug, name) values ('Bad Slug', 'X')`)).rejects.toThrow();
  });
});
