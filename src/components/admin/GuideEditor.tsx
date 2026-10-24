"use client";

import { useKeptForm } from "@/components/admin/useKeptForm";
import Link from "next/link";
import { useMemo, useState } from "react";
import { saveGuide, uploadGuideImage } from "@/app/admin/(app)/guides/actions";
import { BLOCK_LABELS, emptyBlock, type Block, type BlockType } from "@/lib/content/blocks";
import type { Category, Guide, Product } from "@/lib/content/types";
import { Result, StatusPill } from "./ui";

type Props = {
  guide?: Guide;
  products: Pick<Product, "id" | "name" | "slug">[];
  categories: Category[];
  canEdit: boolean;
  siteUrl: string;
  supabaseUrl: string;
  defaultAuthor: string;
};

const TYPES: BlockType[] = ["heading", "paragraph", "list", "callout", "table", "faq", "image", "cta"];

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Re-encode to WebP in the browser: strips EXIF/location data and keeps files small. */
async function toWebp(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/webp", 0.85));
  return new File([blob], "image.webp", { type: "image/webp" });
}

export function GuideEditor({ guide, products, categories, canEdit, siteUrl, supabaseUrl, defaultAuthor }: Props) {
  const [state, action, pending] = useKeptForm(saveGuide, {});
  // Each block keeps a stable key so reordering never mixes up half-typed fields.
  const [items, setItems] = useState<{ key: string; b: Block }[]>(() =>
    (guide?.blocks ?? [emptyBlock("callout"), emptyBlock("heading"), emptyBlock("paragraph")]).map((b, i) => ({ key: `k${i}-${Math.random().toString(36).slice(2)}`, b })),
  );
  const blocks = items.map((x) => x.b);
  const [productId, setProductId] = useState(guide?.product_id ?? products[0]?.id ?? "");
  const [title, setTitle] = useState(guide?.title ?? "");
  const [slug, setSlug] = useState(guide?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!guide);
  const [metaTitle, setMetaTitle] = useState(guide?.meta_title ?? "");
  const [metaDesc, setMetaDesc] = useState(guide?.meta_description ?? "");
  const [adsEnabled, setAdsEnabled] = useState(guide?.ads_enabled ?? true);
  const [spots, setSpots] = useState<string[]>(guide?.ad_spots ?? ["inline", "side"]);
  const [publishAt, setPublishAt] = useState(toLocalInput(guide?.publish_at));

  const product = products.find((p) => p.id === productId);
  const cats = categories.filter((c) => c.product_id === productId);
  const status = guide?.status ?? "draft";

  const update = (i: number, b: Block) => setItems((all) => all.map((x, j) => (j === i ? { ...x, b } : x)));
  const move = (i: number, d: -1 | 1) =>
    setItems((all) => {
      const j = i + d;
      if (j < 0 || j >= all.length) return all;
      const copy = [...all];
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
      return copy;
    });
  const remove = (i: number) => setItems((all) => all.filter((_, j) => j !== i));
  const add = (t: BlockType) => setItems((all) => [...all, { key: `n-${Math.random().toString(36).slice(2)}`, b: emptyBlock(t) }]);

  const checks = useMemo(
    () => [
      { ok: title.trim().length > 0, label: "Title set" },
      { ok: blocks.length > 0, label: "Has content" },
      { ok: metaTitle.length > 0 && metaTitle.length <= 60, label: "Search title is 1–60 characters" },
      { ok: metaDesc.length >= 70 && metaDesc.length <= 160, label: "Search description is 70–160 characters" },
      { ok: blocks.every((b) => b.type !== "image" || (b.path && b.alt.trim())), label: "Every image has alt text" },
    ],
    [title, blocks, metaTitle, metaDesc],
  );

  let headingCount = 0;
  const showAdMarker = adsEnabled && spots.includes("inline");

  return (
    <form onSubmit={action}>
      {guide ? <input type="hidden" name="id" value={guide.id} /> : null}
      <input type="hidden" name="blocks" value={JSON.stringify(blocks)} />
      <input type="hidden" name="publish_at" value={publishAt ? new Date(publishAt).toISOString() : ""} />

      <div className="a-top">
        <div className="a-row">
          <h1>{guide ? "Edit guide" : "New guide"}</h1>
          <StatusPill status={status} />
          {guide ? <span style={{ fontSize: 12, color: "var(--a-muted)" }}>Version {guide.version}</span> : null}
        </div>
        <div className="a-row">
          {guide ? (
            <Link href={`/admin/guides/${guide.id}/preview`} className="a-btn" target="_blank">
              Preview
            </Link>
          ) : null}
          {canEdit ? (
            <>
              <button className="a-btn" name="intent" value="draft" disabled={pending}>
                {status === "published" ? "Save changes (live)" : "Save draft"}
              </button>
              {status === "published" ? (
                <button className="a-btn" name="intent" value="unpublish" disabled={pending}>
                  Unpublish
                </button>
              ) : (
                <button className="a-btn primary" name="intent" value="publish" disabled={pending || !checks[0]!.ok || !checks[1]!.ok}>
                  Publish
                </button>
              )}
            </>
          ) : null}
        </div>
      </div>

      <div className="a-layout">
        <fieldset className="main" disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0 }}>
          <Result state={state} />
          <div className="a-field">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              name="title"
              className="a-input"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugTouched)
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, "")
                      .slice(0, 80),
                  );
              }}
              maxLength={140}
              required
              style={{ fontFamily: "var(--font-serif)", fontSize: 32, minHeight: 56 }}
            />
          </div>
          <div className="a-field">
            <label htmlFor="standfirst">Standfirst (the line under the title)</label>
            <textarea id="standfirst" name="standfirst" className="a-textarea" defaultValue={guide?.standfirst} maxLength={400} rows={2} />
          </div>

          <ol className="blocks" aria-label="Guide content">
            {items.map(({ key, b }, i) => {
              if (b.type === "heading") headingCount++;
              const marker = showAdMarker && b.type === "heading" && headingCount === 3;
              return (
                <li key={key} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {marker ? <div className="ad-marker">Ad slot · the in-article ad appears here, after the 2nd section. Added automatically.</div> : null}
                  <div className="block">
                    <div className="block-head">
                      <span className="block-type">
                        {i + 1}. {BLOCK_LABELS[b.type]}
                      </span>
                      <span className="a-row">
                        <button type="button" className="a-btn sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move block ${i + 1} up`}>
                          ↑
                        </button>
                        <button type="button" className="a-btn sm" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label={`Move block ${i + 1} down`}>
                          ↓
                        </button>
                        <button type="button" className="a-btn sm danger" onClick={() => remove(i)} aria-label={`Remove block ${i + 1}`}>
                          Remove
                        </button>
                      </span>
                    </div>
                    <BlockFields block={b} index={i} onChange={(nb) => update(i, nb)} supabaseUrl={supabaseUrl} />
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="a-panel" style={{ borderStyle: "dashed" }}>
            <p className="a-label" style={{ margin: "0 0 10px" }}>
              Add a block
            </p>
            <div className="a-row">
              {TYPES.map((t) => (
                <button key={t} type="button" className="a-btn sm" onClick={() => add(t)}>
                  {BLOCK_LABELS[t]}
                </button>
              ))}
            </div>
            <p className="a-help" style={{ margin: "10px 0 0" }}>
              Guides are built from these blocks only, so every article matches the house layout. In text, use **bold**, *italic* and [link text](https://…).
            </p>
          </div>
        </fieldset>

        <fieldset className="aside" disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0 }}>
          <section className="a-panel" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 13 }}>Placement</h2>
            <div className="a-two">
              <div className="a-field">
                <label htmlFor="product_id">Product</label>
                <select id="product_id" name="product_id" className="a-select" value={productId} onChange={(e) => setProductId(e.target.value)}>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="a-field">
                <label htmlFor="category_id">Category</label>
                <select id="category_id" name="category_id" className="a-select" defaultValue={guide?.category_id ?? ""} key={productId}>
                  <option value="">None</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="a-field">
              <label htmlFor="slug">Address</label>
              <div className="a-row" style={{ flexWrap: "nowrap", gap: 0, border: "1px solid var(--a-line2)", borderRadius: 8, background: "var(--a-panel)" }}>
                <span className="mono" style={{ padding: "0 0 0 10px", fontSize: 12, color: "var(--a-faint)", whiteSpace: "nowrap" }}>
                  /guides/{product?.slug ?? "…"}/
                </span>
                <input
                  id="slug"
                  name="slug"
                  className="a-input mono"
                  style={{ border: 0, paddingLeft: 2 }}
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value.toLowerCase());
                  }}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  maxLength={80}
                  required
                />
              </div>
              <span className="a-help">
                Publishes to {siteUrl.replace(/^https?:\/\//, "")}/guides/{product?.slug ?? "…"}/{slug || "…"}
              </span>
            </div>
            <label className="a-check">
              <input type="checkbox" name="start_here" defaultChecked={guide?.start_here ?? false} />
              Pin under “Start here”
            </label>
          </section>

          <section className="a-panel" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 13 }}>Search and sharing</h2>
            <div className="a-field">
              <span className="a-row" style={{ justifyContent: "space-between" }}>
                <label htmlFor="meta_title" className="a-label">
                  Search title
                </label>
                <span className="mono" style={{ fontSize: 11, color: metaTitle.length > 60 ? "var(--a-warn)" : "var(--a-muted)" }}>
                  {metaTitle.length}/60
                </span>
              </span>
              <input id="meta_title" name="meta_title" className="a-input" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} maxLength={70} />
            </div>
            <div className="a-field">
              <span className="a-row" style={{ justifyContent: "space-between" }}>
                <label htmlFor="meta_description" className="a-label">
                  Search description
                </label>
                <span className="mono" style={{ fontSize: 11, color: metaDesc.length > 160 || (metaDesc.length > 0 && metaDesc.length < 70) ? "var(--a-warn)" : "var(--a-muted)" }}>
                  {metaDesc.length}/160
                </span>
              </span>
              <textarea id="meta_description" name="meta_description" className="a-textarea" value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} maxLength={170} rows={3} />
            </div>
            <div style={{ padding: 12, borderRadius: 8, background: "#F4F2EC", color: "#1F1F1F", fontFamily: "Arial, sans-serif" }}>
              <p style={{ margin: 0, fontSize: 12, color: "#4D5156" }}>
                {siteUrl.replace(/^https?:\/\//, "")} › guides › {product?.slug}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 16, color: "#1A0DAB" }}>{metaTitle || title || "Search title"}</p>
              <p style={{ margin: "4px 0 0", fontSize: 13, lineHeight: 1.45, color: "#4D5156" }}>{metaDesc || "Search engines will pick a sentence from the page until you write one."}</p>
            </div>
          </section>

          <section className="a-panel" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="a-row" style={{ justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, fontSize: 13 }}>Ads on this guide</h2>
              <Link href="/admin/ads" style={{ fontSize: 12 }}>
                Ad settings
              </Link>
            </div>
            <label className="a-check">
              <input type="checkbox" name="ads_enabled" checked={adsEnabled} onChange={(e) => setAdsEnabled(e.target.checked)} />
              Show ads on this guide
            </label>
            {adsEnabled ? (
              <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="a-label" style={{ marginBottom: 4 }}>
                  Where (from the site&apos;s allowed spots)
                </legend>
                {(
                  [
                    ["inline", "In the article, after the 2nd section"],
                    ["end", "End of the article"],
                    ["side", "Sidebar (wide screens only)"],
                  ] as const
                ).map(([k, label]) => (
                  <label key={k} className="a-check">
                    <input type="checkbox" name="ad_spots" value={k} checked={spots.includes(k)} onChange={(e) => setSpots((s) => (e.target.checked ? [...s, k] : s.filter((x) => x !== k)))} />
                    {label}
                  </label>
                ))}
              </fieldset>
            ) : (
              spots.map((s) => <input key={s} type="hidden" name="ad_spots" value={s} />)
            )}
            <span className="a-help">Ads are labelled “Advertisement” and never appear above the first heading. Turn them off for guides about privacy, money trouble or safety.</span>
          </section>

          <section className="a-panel" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 13 }}>Publishing</h2>
            <div className="a-field">
              <label htmlFor="author_name">Author</label>
              <input id="author_name" name="author_name" className="a-input" defaultValue={guide?.author_name ?? defaultAuthor} maxLength={80} />
            </div>
            <div className="a-field">
              <label htmlFor="when">Publish on (optional)</label>
              <input id="when" type="datetime-local" className="a-input" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} style={{ colorScheme: "dark" }} />
            </div>
            {canEdit ? (
              <div className="a-row">
                <button className="a-btn sm" name="intent" value="schedule" disabled={pending || !publishAt}>
                  Schedule
                </button>
                {guide && status !== "archived" ? (
                  <button className="a-btn sm danger" name="intent" value="archive" disabled={pending}>
                    Archive
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="a-panel" aria-labelledby="checks-h">
            <h2 id="checks-h" style={{ margin: "0 0 8px", fontSize: 13 }}>
              Before publishing
            </h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {checks.map((c) => (
                <li key={c.label} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: c.ok ? "var(--a-ink2)" : "var(--a-warn)" }}>
                  <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: "50%", background: c.ok ? "var(--a-ok)" : "var(--a-amber)", color: "#0A0D1C", fontSize: 11, fontWeight: 700 }}>
                    {c.ok ? "✓" : "!"}
                  </span>
                  {c.label}
                  <span className="sr-only">{c.ok ? "passed" : "needs attention"}</span>
                </li>
              ))}
            </ul>
          </section>
        </fieldset>
      </div>
    </form>
  );
}

function BlockFields({ block: b, index, onChange, supabaseUrl }: { block: Block; index: number; onChange: (b: Block) => void; supabaseUrl: string }) {
  const id = (s: string) => `b${index}-${s}`;
  switch (b.type) {
    case "heading":
      return <input aria-label="Heading text" className="a-input" value={b.text} onChange={(e) => onChange({ ...b, text: e.target.value })} maxLength={120} style={{ fontFamily: "var(--font-serif)", fontSize: 22 }} />;
    case "paragraph":
      return <textarea aria-label="Paragraph text" className="a-textarea" value={b.text} onChange={(e) => onChange({ ...b, text: e.target.value })} maxLength={4000} rows={4} />;
    case "list":
      return (
        <>
          <label className="a-check">
            <input type="checkbox" checked={b.ordered} onChange={(e) => onChange({ ...b, ordered: e.target.checked })} />
            Numbered list
          </label>
          <div className="a-field">
            <label htmlFor={id("items")}>One item per line</label>
            <textarea id={id("items")} className="a-textarea" value={b.items.join("\n")} onChange={(e) => onChange({ ...b, items: e.target.value.split("\n").slice(0, 30) })} rows={4} />
          </div>
        </>
      );
    case "callout":
      return (
        <>
          <input aria-label="Callout label" className="a-input" value={b.title} onChange={(e) => onChange({ ...b, title: e.target.value })} maxLength={60} placeholder="e.g. The short version" />
          <textarea aria-label="Callout text" className="a-textarea" value={b.text} onChange={(e) => onChange({ ...b, text: e.target.value })} maxLength={1000} rows={3} />
        </>
      );
    case "table": {
      const text = [b.header, ...b.rows].map((r) => r.join(" | ")).join("\n");
      return (
        <>
          <div className="a-field">
            <label htmlFor={id("table")}>Rows, cells separated by “ | ” — the first line is the header</label>
            <textarea
              id={id("table")}
              className="a-textarea mono"
              defaultValue={text}
              onBlur={(e) => {
                const lines = e.target.value.split("\n").filter((l) => l.trim());
                const header = (lines[0] ?? "").split("|").map((c) => c.trim()).slice(0, 6);
                const rows = lines.slice(1, 41).map((l) => {
                  const cells = l.split("|").map((c) => c.trim());
                  return header.map((_, k) => cells[k] ?? "");
                });
                onChange({ ...b, header, rows });
              }}
              rows={5}
              style={{ fontSize: 13 }}
            />
          </div>
          <input aria-label="Table caption" className="a-input" value={b.caption} onChange={(e) => onChange({ ...b, caption: e.target.value })} maxLength={200} placeholder="Caption (optional)" />
        </>
      );
    }
    case "faq":
      return (
        <>
          {b.items.map((it, k) => (
            <div key={k} style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 8, borderBottom: "1px solid var(--a-line)" }}>
              <input aria-label={`Question ${k + 1}`} className="a-input" value={it.q} onChange={(e) => onChange({ ...b, items: b.items.map((x, j) => (j === k ? { ...x, q: e.target.value } : x)) })} placeholder="Question" maxLength={200} />
              <textarea aria-label={`Answer ${k + 1}`} className="a-textarea" value={it.a} onChange={(e) => onChange({ ...b, items: b.items.map((x, j) => (j === k ? { ...x, a: e.target.value } : x)) })} placeholder="Answer" maxLength={1500} rows={2} />
              {b.items.length > 1 ? (
                <button type="button" className="a-btn sm danger" style={{ alignSelf: "flex-start" }} onClick={() => onChange({ ...b, items: b.items.filter((_, j) => j !== k) })}>
                  Remove question
                </button>
              ) : null}
            </div>
          ))}
          {b.items.length < 15 ? (
            <button type="button" className="a-btn sm" style={{ alignSelf: "flex-start" }} onClick={() => onChange({ ...b, items: [...b.items, { q: "", a: "" }] })}>
              Add question
            </button>
          ) : null}
        </>
      );
    case "image":
      return <ImageFields block={b} onChange={onChange} supabaseUrl={supabaseUrl} />;
    case "cta":
      return (
        <div className="a-two">
          <input aria-label="Call-to-action title" className="a-input" value={b.title} onChange={(e) => onChange({ ...b, title: e.target.value })} maxLength={80} placeholder="Title" />
          <input aria-label="Call-to-action text" className="a-input" value={b.text} onChange={(e) => onChange({ ...b, text: e.target.value })} maxLength={200} placeholder="Short line (optional)" />
          <input aria-label="Button label" className="a-input" value={b.label} onChange={(e) => onChange({ ...b, label: e.target.value })} maxLength={30} placeholder="Button label" />
          <input aria-label="Button link" type="url" className="a-input mono" value={b.url} onChange={(e) => onChange({ ...b, url: e.target.value })} placeholder="https://" />
        </div>
      );
  }
}

function ImageFields({ block: b, onChange, supabaseUrl }: { block: Extract<Block, { type: "image" }>; onChange: (b: Block) => void; supabaseUrl: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const webp = await toWebp(file);
      const fd = new FormData();
      fd.set("file", webp);
      const res = await uploadGuideImage({}, fd);
      if (res.error || !res.path) setErr(res.error ?? "Upload failed.");
      else onChange({ ...b, path: res.path });
    } catch {
      setErr("That image couldn't be read. Try a PNG or JPG.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      {b.path ? (
        // eslint-disable-next-line @next/next/no-img-element -- preview of the uploaded image
        <img src={`${supabaseUrl}/storage/v1/object/public/media/${b.path}`} alt="" style={{ maxHeight: 180, width: "auto", borderRadius: 8 }} />
      ) : null}
      <label className="a-btn sm" style={{ alignSelf: "flex-start" }}>
        {busy ? "Uploading…" : b.path ? "Replace image" : "Upload image"}
        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} disabled={busy} />
      </label>
      {err ? (
        <p className="a-alert err" role="alert">
          {err}
        </p>
      ) : null}
      <input aria-label="Alt text (describe the image)" className="a-input" value={b.alt} onChange={(e) => onChange({ ...b, alt: e.target.value })} maxLength={200} placeholder="Alt text — describe the image for screen readers" />
      <input aria-label="Caption" className="a-input" value={b.caption} onChange={(e) => onChange({ ...b, caption: e.target.value })} maxLength={200} placeholder="Caption (optional)" />
    </>
  );
}
