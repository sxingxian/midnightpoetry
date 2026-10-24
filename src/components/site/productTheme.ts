import type { CSSProperties } from "react";

/**
 * Inline CSS variables that give an element its product's accent colour in both
 * themes (see .product-theme in globals.css). Colours come from the admin, which
 * only accepts #RRGGBB values.
 */
export function productTheme(p: { accent_dark: string; accent_light: string }): CSSProperties {
  const hex = (c: string, fallback: string) => (/^#[0-9A-Fa-f]{6}$/.test(c) ? c : fallback);
  return { "--p-dark": hex(p.accent_dark, "#F2B661"), "--p-light": hex(p.accent_light, "#6B3404") } as CSSProperties;
}
