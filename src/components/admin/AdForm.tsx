"use client";

import { useActionState, useState } from "react";
import { saveAd, uploadAdImage } from "@/app/admin/(app)/ads/actions";
import type { Ad } from "@/lib/content/types";
import { Result } from "./ui";

function toLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

async function toWebp(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const size = Math.min(600, bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const sx = (bitmap.width - Math.min(bitmap.width, bitmap.height)) / 2;
  const sy = (bitmap.height - Math.min(bitmap.width, bitmap.height)) / 2;
  const side = Math.min(bitmap.width, bitmap.height);
  canvas.getContext("2d")!.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/webp", 0.85));
  return new File([blob], "ad.webp", { type: "image/webp" });
}

export function AdForm({ ad, canEdit, supabaseUrl }: { ad?: Ad; canEdit: boolean; supabaseUrl: string }) {
  const [state, action, pending] = useActionState(saveAd, {});
  const [kind, setKind] = useState(ad?.kind ?? "sponsor");
  const [headline, setHeadline] = useState(ad?.headline ?? "");
  const [url, setUrl] = useState(ad?.url ?? "");
  const [image, setImage] = useState(ad?.image_path ?? "");
  const [starts, setStarts] = useState(toLocal(ad?.starts_at ?? null));
  const [ends, setEnds] = useState(toLocal(ad?.ends_at ?? null));
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  let urlMsg = "Must start with https://. Opens in a new tab, marked as sponsored.";
  let urlOk = true;
  if (url) {
    try {
      const u = new URL(url);
      urlOk = u.protocol === "https:";
      urlMsg = urlOk ? `Opens ${u.hostname} in a new tab, marked as sponsored.` : "Only https links are allowed.";
    } catch {
      urlOk = false;
      urlMsg = "That doesn't look like a web address.";
    }
  }
  const onFile = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    setUploadErr(null);
    try {
      const fd = new FormData();
      fd.set("file", await toWebp(f));
      const res = await uploadAdImage({}, fd);
      if (res.path) setImage(res.path);
      else setUploadErr(res.error ?? "Upload failed.");
    } catch {
      setUploadErr("That image couldn't be read.");
    } finally {
      setBusy(false);
    }
  };
  const spots = ad?.spots ?? ["inline"];
  return (
    <form action={action} className="a-panel" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
        {ad ? <input type="hidden" name="id" value={ad.id} /> : null}
        <input type="hidden" name="image_path" value={image} />
        <input type="hidden" name="starts_at" value={starts ? new Date(starts).toISOString() : ""} />
        <input type="hidden" name="ends_at" value={ends ? new Date(ends).toISOString() : ""} />
        <Result state={state} />
        <div className="a-two">
          <div className="a-field">
            <label htmlFor="name">Name (only you see this)</label>
            <input id="name" name="name" className="a-input" defaultValue={ad?.name} maxLength={80} required placeholder="e.g. Spring sponsor, guides" />
          </div>
          <div className="a-field">
            <label htmlFor="kind">Kind</label>
            <select id="kind" name="kind" className="a-select" value={kind} onChange={(e) => setKind(e.target.value as "sponsor" | "house")}>
              <option value="sponsor">Sponsor</option>
              <option value="house">House ad (our own products)</option>
            </select>
          </div>
          {kind === "sponsor" ? (
            <div className="a-field">
              <label htmlFor="sponsor_name">Sponsor name (shown as “Sponsored by …”)</label>
              <input id="sponsor_name" name="sponsor_name" className="a-input" defaultValue={ad?.sponsor_name} maxLength={60} required />
            </div>
          ) : (
            <div className="a-field">
              <label htmlFor="eyebrow">Small label</label>
              <input id="eyebrow" name="eyebrow" className="a-input" defaultValue={ad?.eyebrow || "From the studio"} maxLength={40} />
            </div>
          )}
          <div className="a-field">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" className="a-select" defaultValue={ad?.status ?? "draft"}>
              <option value="draft">Draft</option>
              <option value="live">Live</option>
              <option value="paused">Paused</option>
            </select>
          </div>
        </div>
        <div className="a-field">
          <span className="a-row" style={{ justifyContent: "space-between" }}>
            <label htmlFor="headline" className="a-label">
              Headline
            </label>
            <span className="mono" style={{ fontSize: 11, color: headline.length > 70 ? "var(--a-warn)" : "var(--a-muted)" }}>
              {headline.length}/70
            </span>
          </span>
          <input id="headline" name="headline" className="a-input" value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={90} required />
        </div>
        <div className="a-field">
          <label htmlFor="body">One line about the offer (optional)</label>
          <input id="body" name="body" className="a-input" defaultValue={ad?.body} maxLength={140} />
        </div>
        <div className="a-two">
          <div className="a-field">
            <label htmlFor="url">Link</label>
            <input id="url" name="url" type="url" className="a-input mono" value={url} onChange={(e) => setUrl(e.target.value)} aria-invalid={!urlOk} aria-describedby="url-msg" placeholder="https://" required />
            <span id="url-msg" className="a-help" style={{ color: urlOk ? undefined : "var(--a-warn)" }}>
              {urlMsg}
            </span>
          </div>
          <div className="a-field">
            <label htmlFor="cta_label">Button text</label>
            <input id="cta_label" name="cta_label" className="a-input" defaultValue={ad?.cta_label ?? "Learn more"} maxLength={24} />
          </div>
        </div>
        <div className="a-field">
          <span className="a-label">Image (optional, square)</span>
          <div className="a-row">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element -- uploaded preview
              <img src={`${supabaseUrl}/storage/v1/object/public/media/${image}`} alt="" width={72} height={72} style={{ borderRadius: 10, objectFit: "cover" }} />
            ) : null}
            <label className="a-btn sm">
              {busy ? "Uploading…" : image ? "Replace" : "Upload"}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} disabled={busy} />
            </label>
            {image ? (
              <button type="button" className="a-btn sm" onClick={() => setImage("")}>
                Remove
              </button>
            ) : null}
          </div>
          <span className="a-help">PNG, JPG or WebP. It&apos;s re-saved as WebP in your browser, which also removes location data. SVG isn&apos;t accepted.</span>
          {uploadErr ? (
            <p className="a-alert err" role="alert">
              {uploadErr}
            </p>
          ) : null}
        </div>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="a-label">Shows in</legend>
          <div className="a-row">
            {(
              [
                ["inline", "In the article"],
                ["end", "End of article"],
                ["side", "Sidebar"],
                ["hub", "Guides hub"],
              ] as const
            ).map(([k, l]) => (
              <label key={k} className="a-check">
                <input type="checkbox" name="spots" value={k} defaultChecked={spots.includes(k)} />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="a-two">
          <div className="a-field">
            <label htmlFor="starts">Starts (optional)</label>
            <input id="starts" type="datetime-local" className="a-input" value={starts} onChange={(e) => setStarts(e.target.value)} style={{ colorScheme: "dark" }} />
          </div>
          <div className="a-field">
            <label htmlFor="ends">Ends (optional)</label>
            <input id="ends" type="datetime-local" className="a-input" value={ends} onChange={(e) => setEnds(e.target.value)} style={{ colorScheme: "dark" }} />
          </div>
        </div>
        {canEdit ? (
          <div className="a-row" style={{ justifyContent: "flex-end" }}>
            <button className="a-btn primary" disabled={pending || !urlOk}>
              {pending ? "Saving…" : ad ? "Save ad" : "Create ad"}
            </button>
          </div>
        ) : null}
      </fieldset>
    </form>
  );
}
