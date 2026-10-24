"use client";

import Link from "next/link";

/** Shown if the guides can't be loaded (e.g. the database is briefly unreachable). */
export default function GuidesError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="page">
      <main className="wrap" style={{ paddingTop: 120, paddingBottom: 120 }}>
        <p className="eyebrow">Guides</p>
        <h1 className="serif" style={{ fontSize: "clamp(44px, 6vw, 80px)", margin: "12px 0 0", fontWeight: 400 }}>
          The guides are <em className="accent-em">resting.</em>
        </h1>
        <p style={{ marginTop: 20, maxWidth: 560, lineHeight: 1.6, color: "var(--ink-2)" }}>We couldn&apos;t load them just now. Please try again in a moment.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 28 }}>
          <button type="button" className="btn-ghost press" onClick={reset}>
            Try again
          </button>
          <Link href="/" className="btn-ghost press">
            Back to the poem
          </Link>
        </div>
      </main>
    </div>
  );
}
