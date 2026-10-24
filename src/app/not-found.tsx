import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export default function NotFound() {
  return (
    <div className="page">
      <SiteHeader />
      <main className="wrap" style={{ paddingTop: 80, paddingBottom: 120 }}>
        <p className="eyebrow">404</p>
        <h1 className="serif" style={{ fontSize: "clamp(44px, 6vw, 80px)", margin: "12px 0 0", fontWeight: 400 }}>
          Nothing here but <em className="accent-em">the quiet.</em>
        </h1>
        <p style={{ marginTop: 20 }}>
          <Link href="/">Back to the poem</Link> or <Link href="/guides">browse the guides</Link>.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
