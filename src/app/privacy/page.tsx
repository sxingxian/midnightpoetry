import { SitePageView, sitePageMetadata } from "@/components/site/LegalPage";

export const dynamic = "force-dynamic";
export const generateMetadata = () => sitePageMetadata("privacy");

export default function PrivacyPage() {
  return <SitePageView slug="privacy" />;
}
