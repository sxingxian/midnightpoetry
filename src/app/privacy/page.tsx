import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = { title: "Privacy", alternates: { canonical: "/privacy" } };

export default function Privacy() {
  return (
    <LegalPage title="Privacy">
      <p>
        <strong>[To complete before launch — have this reviewed for the places your visitors come from.]</strong>
      </p>
      <h2>What this site collects</h2>
      <p>Reading the landing page and guides doesn&apos;t need an account. We remember your light or dark theme choice in your own browser.</p>
      <h2>Ads on guides</h2>
      <p>
        Guides can show sponsor and house ads served from our own site; when you click one we count the click, without cookies. Guides may also show ads from Google AdSense, which uses cookies to
        personalise and measure ads where you have agreed to it. You can change that choice any time with “Cookie choices” in the footer of a guide. See Google&apos;s explanation of{" "}
        <a href="https://policies.google.com/technologies/partner-sites">how Google uses information from sites that use its services</a>.
      </p>
      <h2>Studio accounts</h2>
      <p>People who write guides sign in with an email address and password plus a second step. That account data is stored with our database provider, Supabase, and sign-in emails are sent with Resend.</p>
      <h2>Contact</h2>
      <p>[Contact email]</p>
    </LegalPage>
  );
}
