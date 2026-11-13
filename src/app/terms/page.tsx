import { SitePageView, sitePageMetadata } from "@/components/site/LegalPage";

export const dynamic = "force-dynamic";
export const generateMetadata = () => sitePageMetadata("terms");

export default function TermsPage() {
  return <SitePageView slug="terms" />;
}
