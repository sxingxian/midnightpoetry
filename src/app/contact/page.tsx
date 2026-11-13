import { SitePageView, sitePageMetadata } from "@/components/site/LegalPage";

export const dynamic = "force-dynamic";
export const generateMetadata = () => sitePageMetadata("contact");

export default function ContactPage() {
  return <SitePageView slug="contact" />;
}
