import type { Metadata } from "next";
import { BlockRenderer } from "@/components/guides/BlockRenderer";
import { getContactEmail, getSitePage } from "@/lib/content/queries";
import { DEFAULT_PAGES, parsePageBody, type SitePageSlug } from "@/lib/content/site-pages";
import { publicEnv } from "@/lib/env";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="page">
      <SiteHeader />
      <main id="top" className="wrap" style={{ paddingTop: 40, paddingBottom: 96 }}>
        <article className="prose" style={{ maxWidth: 720 }}>
          <h1 className="serif" style={{ fontSize: "clamp(40px, 5vw, 64px)", lineHeight: 1.02, margin: "0 0 28px", fontWeight: 400 }}>
            {title}
          </h1>
          {children}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "");

export async function sitePageMetadata(slug: SitePageSlug): Promise<Metadata> {
  const page = await getSitePage(slug);
  return { title: page.title, description: DEFAULT_PAGES[slug].description, alternates: { canonical: `/${slug}` } };
}

/**
 * A standing page (About, Contact, Privacy, Terms): the text written in the admin,
 * rendered through the same block renderer as the guides, followed by the studio's
 * contact email when an owner has set one.
 */
export async function SitePageView({ slug }: { slug: SitePageSlug }) {
  const [page, email] = await Promise.all([getSitePage(slug), getContactEmail()]);
  // If saved text somehow fails validation, show the built-in text rather than an empty page.
  const parsed = parsePageBody(page.body);
  const blocks = parsed.blocks ?? parsePageBody(DEFAULT_PAGES[slug].body).blocks ?? [];
  const updated = fmt(page.updated_at);
  return (
    <LegalPage title={page.title}>
      {updated && slug !== "about" && slug !== "contact" ? <p style={{ marginTop: -12, fontSize: 15, color: "var(--muted)" }}>Last updated {updated}</p> : null}
      <BlockRenderer blocks={blocks} supabaseUrl={publicEnv().supabaseUrl} />
      {email ? (
        <>
          <h2 id="write-to-us">{slug === "contact" ? "Write to the studio" : "Contact"}</h2>
          <p>
            Email <a href={`mailto:${email}`}>{email}</a>
            {slug === "contact" ? "." : " with any question about this page."}
          </p>
        </>
      ) : null}
    </LegalPage>
  );
}
