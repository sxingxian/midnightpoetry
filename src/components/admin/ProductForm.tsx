"use client";

import { useKeptForm } from "@/components/admin/useKeptForm";
import { saveProduct } from "@/app/admin/(app)/products/actions";
import type { Product } from "@/lib/content/types";
import { Result } from "./ui";

const DEFAULTS: Partial<Product> = {
  headline_style: "serif",
  cta_label: "Open",
  accent_dark: "#F0A684",
  accent_light: "#A04A2A",
  button_dark: "#F8F0E1",
  button_light: "#1F1D1A",
  status: "draft",
  sort_order: 10,
  highlights: [],
};

export function ProductForm({ product, canEdit }: { product?: Product; canEdit: boolean }) {
  const p = { ...DEFAULTS, ...product } as Product;
  const [state, action, pending, discard] = useKeptForm(saveProduct, {});
  const hl = [0, 1, 2].map((i) => p.highlights?.[i] ?? { label: "", value: "" });
  return (
    <form onSubmit={action} className="a-panel" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
        {product ? <input type="hidden" name="id" value={product.id} /> : null}
        <Result state={state} onDiscard={discard} />
        <div className="a-two">
          <div className="a-field">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" className="a-input" defaultValue={p.name} required maxLength={60} />
          </div>
          <div className="a-field">
            <label htmlFor="slug">Short name (in links)</label>
            <input id="slug" name="slug" className="a-input mono" defaultValue={p.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={60} />
          </div>
          <div className="a-field">
            <label htmlFor="kind">What it is</label>
            <input id="kind" name="kind" className="a-input" defaultValue={p.kind} maxLength={80} placeholder="e.g. Split the bill, item by item" />
          </div>
          <div className="a-field">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" className="a-select" defaultValue={p.status}>
              <option value="draft">Draft — not on the site</option>
              <option value="live">Live — on the landing page</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
          <div className="a-field">
            <label htmlFor="headline">Headline</label>
            <input id="headline" name="headline" className="a-input" defaultValue={p.headline} maxLength={120} />
          </div>
          <div className="a-field">
            <label htmlFor="headline_em">Headline, coloured part</label>
            <input id="headline_em" name="headline_em" className="a-input" defaultValue={p.headline_em} maxLength={120} />
          </div>
          <div className="a-field">
            <label htmlFor="headline_style">Headline style</label>
            <select id="headline_style" name="headline_style" className="a-select" defaultValue={p.headline_style}>
              <option value="serif">Serif (poetic)</option>
              <option value="sans">Bold sans</option>
            </select>
          </div>
          <div className="a-field">
            <label htmlFor="sort_order">Order on the page</label>
            <input id="sort_order" name="sort_order" type="number" min={0} max={999} className="a-input" defaultValue={p.sort_order} />
          </div>
        </div>
        <div className="a-field">
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" className="a-textarea" defaultValue={p.description} maxLength={400} rows={3} />
        </div>
        <div className="a-field">
          <span className="a-label">Three facts (optional)</span>
          {hl.map((h, i) => (
            <div key={i} className="a-two">
              <input aria-label={`Fact ${i + 1} label`} name={`hl${i}_label`} className="a-input" defaultValue={h.label} maxLength={30} placeholder="Label, e.g. Split" />
              <input aria-label={`Fact ${i + 1} value`} name={`hl${i}_value`} className="a-input" defaultValue={h.value} maxLength={30} placeholder="Value, e.g. By item" />
            </div>
          ))}
        </div>
        <div className="a-two">
          <div className="a-field">
            <label htmlFor="cta_label">Button text</label>
            <input id="cta_label" name="cta_label" className="a-input" defaultValue={p.cta_label} maxLength={40} />
          </div>
          <div className="a-field">
            <label htmlFor="cta_url">Button link</label>
            <input id="cta_url" name="cta_url" type="url" className="a-input mono" defaultValue={p.cta_url ?? ""} placeholder="https://" />
          </div>
          <div className="a-field">
            <label htmlFor="site_url">Product website</label>
            <input id="site_url" name="site_url" type="url" className="a-input mono" defaultValue={p.site_url ?? ""} placeholder="https://" />
          </div>
        </div>
        <div className="a-two">
          {(
            [
              ["accent_dark", "Accent, dark mode"],
              ["accent_light", "Accent, light mode"],
              ["button_dark", "Button, dark mode"],
              ["button_light", "Button, light mode"],
            ] as const
          ).map(([k, label]) => (
            <div key={k} className="a-field">
              <label htmlFor={k}>{label}</label>
              <div className="a-row" style={{ flexWrap: "nowrap" }}>
                <input aria-hidden="true" tabIndex={-1} type="color" defaultValue={p[k]} onChange={(e) => ((document.getElementById(k) as HTMLInputElement).value = e.target.value.toUpperCase())} style={{ width: 40, height: 40, padding: 0, border: 0, background: "none" }} />
                <input id={k} name={k} className="a-input mono" defaultValue={p[k]} pattern="#[0-9A-Fa-f]{6}" required />
              </div>
            </div>
          ))}
        </div>
        <div className="a-row" style={{ justifyContent: "flex-end" }}>
          <button className="a-btn primary" disabled={pending}>
            {pending ? "Saving…" : product ? "Save product" : "Create product"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
