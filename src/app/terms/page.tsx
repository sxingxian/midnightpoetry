import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = { title: "Terms", alternates: { canonical: "/terms" } };

export default function Terms() {
  return (
    <LegalPage title="Terms">
      <p>
        <strong>[To complete before launch.]</strong>
      </p>
      <p>The guides are general information to help you use the studio&apos;s apps. Check figures against your own receipts and rules before relying on them.</p>
    </LegalPage>
  );
}
