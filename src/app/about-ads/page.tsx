import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = { title: "About ads", description: "Where ads appear on Midnight Poetry Studio's guides, who chooses them and how to control ad cookies.", alternates: { canonical: "/about-ads" } };

export default function AboutAds() {
  return (
    <LegalPage title="About ads">
      <p>Ads help keep the guides free. They only appear on guide pages — never on the landing page or inside our apps — and every one is labelled “Advertisement”.</p>
      <ul>
        <li>Sponsor and house ads are chosen by us and served from this site. Clicking one is counted on our server, without cookies.</li>
        <li>Spots nobody has booked may show an ad from Google AdSense. Google asks for your consent before using cookies for personalised ads where the law requires it.</li>
        <li>We keep ads off guides about privacy and other sensitive topics, never place them above a guide&apos;s first heading, and never use pop-ups, sound or autoplaying video.</li>
        <li>Short guides carry no ads at all, and longer ones carry one or two at most, so there is always far more guide than advertising.</li>
      </ul>
      <p>
        Our <Link href="/privacy">privacy policy</Link> explains the cookies involved and the choices you have. To ask about sponsoring a guide, see the <Link href="/contact">contact page</Link>.
      </p>
    </LegalPage>
  );
}
