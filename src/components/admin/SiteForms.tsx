"use client";

import { useState } from "react";
import { saveSitePage, saveSiteSettings } from "@/app/admin/(app)/site/actions";
import { useKeptForm } from "./useKeptForm";
import { Result } from "./ui";

export function SiteSettingsForm({ contactEmail, adsenseClient, adsEnabled, isOwner }: { contactEmail: string; adsenseClient: string; adsEnabled: boolean; isOwner: boolean }) {
  const [state, action, pending, discard] = useKeptForm(saveSiteSettings, {});
  const [client, setClient] = useState(adsenseClient);
  const pub = /^ca-pub-\d{16}$/.test(client) ? client.replace(/^ca-/, "") : null;
  return (
    <form onSubmit={action}>
      <fieldset disabled={!isOwner} style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 18 }}>
        {!isOwner ? <p className="a-alert warn">Only owners can change these settings.</p> : null}
        <Result state={state} onDiscard={discard} />
        <section className="a-panel" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="a-field" style={{ maxWidth: 420 }}>
            <label htmlFor="contact_email">Contact email</label>
            <input id="contact_email" name="contact_email" type="email" className="a-input" defaultValue={contactEmail} maxLength={254} autoComplete="off" placeholder="hello@example.com" />
            <span className="a-help">Shown publicly at the end of the About, Contact, Privacy and Terms pages. Leave empty to show no address.</span>
          </div>
          <div className="a-field" style={{ maxWidth: 420 }}>
            <label htmlFor="site_adsense_client">AdSense publisher ID</label>
            <input id="site_adsense_client" name="adsense_client" className="a-input mono" value={client} onChange={(e) => setClient(e.target.value.trim())} placeholder="ca-pub-0000000000000000" pattern="ca-pub-[0-9]{16}" autoComplete="off" />
            <span className="a-help">
              {pub ? `ads.txt will read: google.com, ${pub}, DIRECT, f08c47fec0942fa0` : "Found in AdSense under Account › Settings › Account information. It fills in ads.txt and tells Google this site is yours; it doesn't show any ads by itself."}
            </span>
          </div>
        </section>
        <section className="a-panel">
          <label className="a-check" style={{ fontSize: 16, fontWeight: 600, color: "var(--a-ink)" }}>
            <input type="checkbox" name="ads_enabled" defaultChecked={adsEnabled} />
            Show ads on guides
          </label>
          <p className="a-help" style={{ margin: "4px 0 0 28px" }}>
            Off hides every ad and every ad space on the guides. On shows sponsor, house and (if switched on under Ads on guides) Google ads. A change reaches visitors within about a minute.
          </p>
        </section>
        {isOwner ? (
          <div className="a-row" style={{ justifyContent: "flex-end" }}>
            <button className="a-btn primary" disabled={pending}>
              {pending ? "Saving…" : "Save settings"}
            </button>
          </div>
        ) : null}
      </fieldset>
    </form>
  );
}

/** `max` is passed in by the server page so this client bundle doesn't pull in the page library. */
export function SitePageForm({ slug, title, body, max, isOwner }: { slug: string; title: string; body: string; max: number; isOwner: boolean }) {
  const [state, action, pending, discard] = useKeptForm(saveSitePage, {});
  const [length, setLength] = useState(body.length);
  return (
    <form onSubmit={action}>
      <input type="hidden" name="slug" value={slug} />
      <fieldset disabled={!isOwner} style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 18 }}>
        {!isOwner ? <p className="a-alert warn">Only owners can edit these pages.</p> : null}
        <Result state={state} onDiscard={discard} />
        <div className="a-field" style={{ maxWidth: 420 }}>
          <label htmlFor="page_title">Title</label>
          <input id="page_title" name="title" className="a-input" defaultValue={title} maxLength={80} required />
        </div>
        <div className="a-field">
          <label htmlFor="page_body">Text</label>
          <textarea id="page_body" name="body" className="a-textarea mono" defaultValue={body} maxLength={max} required rows={28} spellCheck onChange={(e) => setLength(e.target.value.length)} style={{ fontSize: 13, lineHeight: 1.6 }} />
          <span className="a-help" aria-live="polite">
            {length.toLocaleString("en-GB")} of {max.toLocaleString("en-GB")} characters
          </span>
        </div>
        {isOwner ? (
          <div className="a-row" style={{ justifyContent: "flex-end" }}>
            <button className="a-btn primary" disabled={pending}>
              {pending ? "Saving…" : "Save and publish"}
            </button>
          </div>
        ) : null}
      </fieldset>
    </form>
  );
}
