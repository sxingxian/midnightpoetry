import { SitePageView, sitePageMetadata } from "@/components/site/LegalPage";

export const dynamic = "force-dynamic";
export const generateMetadata = () => sitePageMetadata("about");

export default function AboutPage() {
  return <SitePageView slug="about" />;
}
