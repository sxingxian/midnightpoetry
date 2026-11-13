import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { SavedVersion } from "@/components/admin/SavedVersion";
import { SitePageForm } from "@/components/admin/SiteForms";
import { fmtDate } from "@/components/admin/ui";
import { BODY_MAX, DEFAULT_PAGES, isSitePageSlug } from "@/lib/content/site-pages";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit page" };

export default async function SitePageAdmin({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isSitePageSlug(slug)) notFound();
  const { supabase, profile } = await requireAdmin("viewer", `/admin/site/${slug}`);
  const [{ data: page }, { count }] = await Promise.all([
    supabase.from("site_pages").select("slug, title, body, updated_at").eq("slug", slug).maybeSingle(),
    supabase.from("site_page_revisions").select("id", { count: "exact", head: true }).eq("slug", slug),
  ]);
  const legal = slug === "privacy" || slug === "terms";
  return (
    <>
      <div className="a-top">
        <div className="a-row">
          <Link href="/admin/site" className="a-btn sm">
            ← Site &amp; pages
          </Link>
          <h1>{page?.title ?? DEFAULT_PAGES[slug].title}</h1>
        </div>
        <Link href={`/${slug}`} className="a-btn" target="_blank">
          View page
        </Link>
      </div>
      <div className="a-layout">
        <div className="main">
          {page ? (
            <SavedVersion version={String(page.updated_at)}>
              <SitePageForm slug={slug} title={page.title} body={page.body} max={BODY_MAX} isOwner={profile.role === "owner"} />
            </SavedVersion>
          ) : (
            <p className="a-alert err">This page isn&apos;t in the database yet — run the database migration (Actions › Deploy Supabase). Visitors see the built-in text meanwhile.</p>
          )}
        </div>
        <div className="aside">
          <section className="a-panel" aria-labelledby="fmt-h">
            <h2 id="fmt-h" style={{ margin: "0 0 10px", fontSize: 14 }}>
              Writing the text
            </h2>
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--a-ink2)", fontSize: 13, lineHeight: 1.7 }}>
              <li>
                <code className="mono">## Heading</code> starts a section.
              </li>
              <li>
                Lines starting with <code className="mono">- </code> make a bullet list; <code className="mono">1. </code> makes a numbered one.
              </li>
              <li>A blank line starts a new paragraph.</li>
              <li>
                <code className="mono">**bold**</code>, <code className="mono">*italic*</code> and <code className="mono">[label](https://…)</code> or <code className="mono">[label](/contact)</code> for links.
              </li>
            </ul>
            <p className="a-help" style={{ margin: "12px 0 0" }}>
              The contact email from Site &amp; pages is added at the end of the page automatically, so there is no need to type it here.
            </p>
          </section>
          <section className="a-panel">
            <p className="a-help" style={{ margin: 0 }}>
              {page ? `Last saved ${fmtDate(page.updated_at)}. ` : ""}
              {count ? `${count} earlier ${count === 1 ? "version is" : "versions are"} kept in the database.` : "Earlier versions are kept each time you save."}
            </p>
            {legal ? (
              <p className="a-alert warn" style={{ margin: "12px 0 0" }}>
                This is legal text. The starting version is a careful general draft; have it checked against the rules where you and your visitors are before relying on it.
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </>
  );
}
