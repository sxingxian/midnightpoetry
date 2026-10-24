import { notFound } from "next/navigation";
import { z } from "zod";
import { atLeast, requireAdmin } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { normaliseGuide } from "@/lib/content/types";
import { GuideEditor } from "@/components/admin/GuideEditor";
import { fmtDate } from "@/components/admin/ui";
import { editorData } from "../editor-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit guide" };

export default async function EditGuidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase, profile } = await requireAdmin("viewer", `/admin/guides/${id}`);
  const [{ data }, { products, categories }, { data: revisions }] = await Promise.all([
    supabase.from("guides").select("*").eq("id", id).maybeSingle(),
    editorData(supabase),
    supabase.from("guide_revisions").select("version, created_at").eq("guide_id", id).order("version", { ascending: false }).limit(10),
  ]);
  if (!data) notFound();
  const env = publicEnv();
  return (
    <>
      <GuideEditor guide={normaliseGuide(data)} products={products} categories={categories} canEdit={atLeast(profile.role, "editor")} siteUrl={env.siteUrl} supabaseUrl={env.supabaseUrl} defaultAuthor={profile.display_name} />
      {revisions?.length ? (
        <section className="a-section a-panel" aria-labelledby="hist-h">
          <h2 id="hist-h" style={{ margin: "0 0 8px", fontSize: 13 }}>
            History
          </h2>
          <ul style={{ margin: 0, paddingLeft: 18, color: "var(--a-ink2)", fontSize: 13, lineHeight: 1.8 }}>
            {revisions.map((r) => (
              <li key={r.version}>
                Version {r.version} · saved {fmtDate(r.created_at)}
              </li>
            ))}
          </ul>
          <p className="a-help" style={{ margin: "8px 0 0" }}>
            Every save keeps the previous version in the database, so nothing is lost.
          </p>
        </section>
      ) : null}
    </>
  );
}
