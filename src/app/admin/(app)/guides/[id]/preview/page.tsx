import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { normaliseGuide } from "@/lib/content/types";
import { BlockRenderer } from "@/components/guides/BlockRenderer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Preview" };

/** Draft preview with the public article styles; ads are shown as placeholders. */
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase } = await requireAdmin("viewer", `/admin/guides/${id}/preview`);
  const { data } = await supabase.from("guides").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const g = normaliseGuide(data);
  const ad = (
    <div className="ad-marker" style={{ margin: "32px 0" }}>
      Ad slot (in-article)
    </div>
  );
  return (
    <div style={{ background: "var(--page)", color: "var(--ink)", borderRadius: 16, padding: "32px clamp(16px, 4vw, 48px)" }} data-theme-scope>
      <p className="a-alert warn" style={{ marginBottom: 24 }}>
        Preview · {g.status}. This is how the guide reads; visitors only see it once it&apos;s published.
      </p>
      <header className="article-head" style={{ marginTop: 0 }}>
        <h1>{g.title}</h1>
        {g.standfirst ? <p className="standfirst">{g.standfirst}</p> : null}
      </header>
      <article className="prose" style={{ marginTop: 40 }}>
        <BlockRenderer blocks={g.blocks} supabaseUrl={publicEnv().supabaseUrl} inlineAd={g.ads_enabled && g.ad_spots.includes("inline") ? ad : undefined} />
      </article>
    </div>
  );
}
