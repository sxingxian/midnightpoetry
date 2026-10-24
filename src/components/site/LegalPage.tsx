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
