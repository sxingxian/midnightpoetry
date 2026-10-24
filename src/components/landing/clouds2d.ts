import type { Rgb, SkySample } from "./sky";

/**
 * The 2D scene's clouds: flat, layered bands in the style of the mascot sheet,
 * drawn on a plain 2D canvas (no WebGL). Coloured by the same sky sample as the
 * 3D clouds, so dusk, midnight, dawn and the day all match.
 */

type Cloud = { fx: number; fy: number; scale: number; speed: number; shape: number };

const SHAPES: [dx: number, dy: number, w: number, h: number, lit: boolean][][] = [
  [
    [2, 0, 7, 1, true],
    [0, 0.8, 13, 1, true],
    [4, 1.6, 12, 1, false],
    [1.5, 2.4, 7, 0.8, false],
  ],
  [
    [3, 0, 9, 1, true],
    [0.5, 0.8, 15, 1, true],
    [6, 1.6, 9, 0.9, false],
  ],
  [
    [0, 0, 6, 1, true],
    [1.5, 0.8, 10, 1, true],
    [3, 1.6, 11, 1, false],
    [6, 2.4, 6, 0.8, false],
  ],
];

function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mix = (a: Rgb, b: Rgb, k: number): Rgb => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const rgba = (c: Rgb, a: number) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;

export class FlatClouds {
  private ctx: CanvasRenderingContext2D;
  private clouds: Cloud[] = [];
  private size = { w: 1, h: 1, dpr: 1 };

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas unavailable");
    this.ctx = ctx;
    const r = seeded(7);
    // Spread over the sky in rows so they never stack into one blob.
    const rows = [0.08, 0.2, 0.34, 0.48, 0.62, 0.74];
    for (let i = 0; i < 12; i++) {
      this.clouds.push({
        fx: (i * 0.37 + r() * 0.2) % 1,
        fy: rows[i % rows.length]! + (r() - 0.5) * 0.05,
        scale: 0.6 + r() * 0.65,
        speed: 5 + r() * 9,
        shape: Math.floor(r() * SHAPES.length),
      });
    }
  }

  resize(w: number, h: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.size = { w, h, dpr };
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
  }

  /** time in seconds; progress 0–1 down the page; cover decides how many clouds show. */
  render(time: number, progress: number, s: SkySample) {
    const { w, h, dpr } = this.size;
    const g = this.ctx;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const count = Math.round(Math.min(1, s.cover / 0.5) * this.clouds.length * 0.75);
    const top = rgba(s.lit, 0.92);
    const base = rgba(mix(s.lit, s.shade, 0.55), 0.92);
    const unit = 18 * Math.min(1, w / 900);
    for (let i = 0; i < count; i++) {
      const c = this.clouds[i]!;
      const u = unit * c.scale;
      const span = w + 18 * u;
      const x = ((((c.fx * span + time * c.speed) % span) + span) % span) - 16 * u;
      const y = c.fy * h - progress * h * 0.12 * c.scale; // nearer clouds drift up a little faster as you scroll
      for (const [dx, dy, bw, bh, lit] of SHAPES[c.shape]!) {
        g.fillStyle = lit ? top : base;
        g.beginPath();
        if (g.roundRect) g.roundRect(x + dx * u, y + dy * u, bw * u, bh * u, (bh * u) / 2);
        else g.rect(x + dx * u, y + dy * u, bw * u, bh * u); // very old browsers: square ends
        g.fill();
      }
    }
  }

  dispose() {
    const { w, h } = this.size;
    this.ctx.clearRect(0, 0, w, h);
  }
}
