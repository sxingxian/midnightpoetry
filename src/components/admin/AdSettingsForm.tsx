"use client";

import { useKeptForm } from "@/components/admin/useKeptForm";
import { useState } from "react";
import { saveAdSettings } from "@/app/admin/(app)/ads/actions";
import type { AdSettings, Category } from "@/lib/content/types";
import { Result } from "./ui";

const SPOT_LABELS = [
  ["inline", "Guide · in the article, after the 2nd section", "640 × 140 · all screens"],
  ["end", "Guide · end of the article", "640 × 140 · all screens"],
  ["side", "Guide · sidebar", "300 × 250 · wide screens only"],
  ["hub", "Guides hub · between “Start here” and “All guides”", "full width × 120 · all screens"],
] as const;

export function AdSettingsForm({ settings, categories, isOwner }: { settings: AdSettings; categories: (Category & { product: string })[]; isOwner: boolean }) {
  const [state, action, pending] = useKeptForm(saveAdSettings, {});
  const [network, setNetwork] = useState(settings.network_enabled);
  const [client, setClient] = useState(settings.adsense_client ?? "");
  const pub = /^ca-pub-\d{16}$/.test(client) ? client.replace(/^ca-/, "") : "pub-[your ID]";
  return (
    <form onSubmit={action} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <fieldset disabled={!isOwner} style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 22 }}>
        {!isOwner ? <p className="a-alert warn">Only owners can change ad settings. You can still manage the ads themselves below.</p> : null}
        <Result state={state} />
        <section className="a-panel">
          <label className="a-check" style={{ fontSize: 16, fontWeight: 600, color: "var(--a-ink)" }}>
            <input type="checkbox" name="enabled" defaultChecked={settings.enabled} />
            Show ads on guides
          </label>
          <p className="a-help" style={{ margin: "4px 0 0 28px" }}>
            Only on midnightpoetry.studio/guides. Never on the landing page, inside Zeno or Zyra, or in this admin.
          </p>
        </section>

        <section aria-labelledby="src-h" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 id="src-h" style={{ margin: 0, fontSize: 14, color: "var(--a-ink2)" }}>
            Where ads come from
          </h2>
          <p className="a-help" style={{ margin: 0 }}>
            Sponsor and house ads always go first; Google AdSense only fills spots nobody has booked.
          </p>
          <div className="a-two">
            <label className="a-panel a-check" style={{ alignItems: "flex-start" }}>
              <input type="checkbox" name="house_enabled" defaultChecked={settings.house_enabled} style={{ marginTop: 2 }} />
              <span>
                <strong style={{ color: "var(--a-ink)" }}>Sponsors and house ads</strong> <span className="pill ok">Recommended</span>
                <br />
                <span className="a-help">Served from our own domain: no third-party scripts, no tracking cookies.</span>
              </span>
            </label>
            <label className="a-panel a-check" style={{ alignItems: "flex-start" }}>
              <input type="checkbox" name="network_enabled" checked={network} onChange={(e) => setNetwork(e.target.checked)} style={{ marginTop: 2 }} />
              <span>
                <strong style={{ color: "var(--a-ink)" }}>Google AdSense</strong>
                <br />
                <span className="a-help">Fills empty spots with our own ad units (Auto ads stay off). Adds Google&apos;s scripts and cookies, and a looser security policy on guide pages.</span>
              </span>
            </label>
          </div>
          <div className="a-panel" style={{ display: "flex", flexDirection: "column", gap: 12, borderColor: network ? "rgba(242,182,97,.35)" : undefined }}>
            {network ? (
              <p className="a-alert warn" style={{ margin: 0 }}>
                Before switching AdSense on: the site must be approved in AdSense, ads.txt must be live, Google&apos;s consent message (Privacy &amp; messaging) must be published for the EEA, UK and Switzerland, and the privacy policy must name Google AdSense.
              </p>
            ) : null}
            <div className="a-field" style={{ maxWidth: 360 }}>
              <label htmlFor="adsense_client">AdSense publisher ID</label>
              <input id="adsense_client" name="adsense_client" className="a-input mono" value={client} onChange={(e) => setClient(e.target.value.trim())} placeholder="ca-pub-0000000000000000" pattern="ca-pub-[0-9]{16}" />
            </div>
            <div className="a-field">
              <span className="a-label">Ad unit for each spot (AdSense › Ads › By ad unit)</span>
              {SPOT_LABELS.map(([k, label]) => (
                <div key={k} className="a-row" style={{ flexWrap: "wrap" }}>
                  <label htmlFor={`unit_${k}`} style={{ flex: "1 1 240px", color: "var(--a-ink2)", fontSize: 13 }}>
                    {label}
                  </label>
                  <input id={`unit_${k}`} name={`unit_${k}`} className="a-input mono" defaultValue={settings.adsense_units?.[k] ?? ""} inputMode="numeric" pattern="[0-9]{6,20}" placeholder="[ad unit ID]" style={{ flex: "0 1 200px", width: "auto" }} />
                </div>
              ))}
            </div>
            <div className="a-field">
              <span className="a-label">ads.txt — served automatically at midnightpoetry.studio/ads.txt</span>
              <code className="mono" style={{ display: "block", padding: "10px 12px", borderRadius: 8, background: "var(--a-bg)", border: "1px solid var(--a-line)", fontSize: 12, overflowWrap: "anywhere" }}>
                google.com, {pub}, DIRECT, f08c47fec0942fa0
              </code>
            </div>
          </div>
        </section>

        <section aria-labelledby="spots-h" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 id="spots-h" style={{ margin: 0, fontSize: 14, color: "var(--a-ink2)" }}>
            Where they can appear
          </h2>
          <div className="a-panel" style={{ display: "flex", flexDirection: "column" }}>
            {SPOT_LABELS.map(([k, label, size]) => (
              <label key={k} className="a-check" style={{ justifyContent: "space-between" }}>
                <span>
                  {label}
                  <span className="a-sub">{size}</span>
                </span>
                <input type="checkbox" name="spots" value={k} defaultChecked={settings.spots.includes(k)} />
              </label>
            ))}
          </div>
          <div className="a-row">
            <label htmlFor="max_per_page" style={{ color: "var(--a-ink2)" }}>
              Most ads on one page
            </label>
            <select id="max_per_page" name="max_per_page" className="a-select" defaultValue={String(settings.max_per_page)} style={{ width: 80 }}>
              <option>1</option>
              <option>2</option>
              <option>3</option>
            </select>
          </div>
          <div className="a-panel">
            <p className="a-label" style={{ margin: "0 0 8px" }}>
              Always true, can&apos;t be changed
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--a-ink2)", fontSize: 13, lineHeight: 1.6 }}>
              <li>Never above the first heading, and never inside tables, receipts or worked examples.</li>
              <li>Every ad is labelled “Advertisement” and its link is marked as sponsored.</li>
              <li>The space is reserved, so the page never jumps when an ad loads.</li>
              <li>No pop-ups, no sound, no video that plays by itself.</li>
            </ul>
          </div>
        </section>

        <section aria-labelledby="ex-h" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 id="ex-h" style={{ margin: 0, fontSize: 14, color: "var(--a-ink2)" }}>
            Keep ads off these topics
          </h2>
          <div className="a-panel" style={{ display: "flex", flexWrap: "wrap", gap: "0 20px" }}>
            {categories.map((c) => (
              <label key={c.id} className="a-check">
                <input type="checkbox" name="excluded" value={c.id} defaultChecked={settings.excluded_category_ids.includes(c.id)} />
                {c.product} · {c.name}
              </label>
            ))}
            {!categories.length ? <span className="a-help">No categories yet.</span> : null}
          </div>
        </section>

        {isOwner ? (
          <div className="a-row" style={{ justifyContent: "flex-end" }}>
            <button className="a-btn primary" disabled={pending}>
              {pending ? "Saving…" : "Save ad settings"}
            </button>
          </div>
        ) : null}
      </fieldset>
    </form>
  );
}
