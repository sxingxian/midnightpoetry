/**
 * The 2D sky: gradient by time of day, twinkling stars, shooting stars, the
 * moon crossing the night and the sun rising at dawn (or crossing the day).
 * Also reports where the light source is, so the clouds and Zeno can be lit by it.
 */

type Key = [p: number, top: string, bottom: string, stars: number, lit: string, shade: string, cover: number];

export const SKY_DARK: Key[] = [
  [0, "#1B2450", "#E39A74", 0.15, "#E39A80", "#3A3566", 0.42],
  [0.2, "#0B1030", "#3B3566", 0.7, "#8A80AE", "#1A1C42", 0.34],
  [0.45, "#03050D", "#10153A", 1, "#7E86AC", "#0A0E24", 0.22],
  [0.7, "#0A0F2C", "#3A3060", 0.8, "#9187B6", "#17183A", 0.28],
  [0.88, "#34447A", "#E9AE88", 0.3, "#EFA88E", "#454A80", 0.44],
  [1, "#6F93CC", "#F3CC9E", 0.05, "#FFE0C6", "#8D98C6", 0.48],
];

export const SKY_LIGHT: Key[] = [
  [0, "#9CC3EA", "#F7E1C8", 0, "#FFFDF8", "#C9D6EA", 0.45],
  [0.4, "#6FA6E0", "#CFE3F5", 0, "#FFFFFF", "#C2D2E8", 0.48],
  [0.75, "#86AEDC", "#F3D9B8", 0, "#FFF3E2", "#B9C3DD", 0.45],
  [1, "#7C93C8", "#F4B88C", 0, "#FFD3A6", "#9C8DB4", 0.5],
];

export type Rgb = [number, number, number];
export type SkySample = { top: Rgb; bottom: Rgb; stars: number; lit: Rgb; shade: Rgb; cover: number };
export type Light = { x: number; y: number; k: number };

const hex = (c: string): Rgb => {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export function sampleSky(dark: boolean, p: number): SkySample {
  const keys = dark ? SKY_DARK : SKY_LIGHT;
  let i = 0;
  while (i < keys.length - 2 && p > keys[i + 1]![0]) i++;
  const a = keys[i]!;
  const b = keys[i + 1]!;
  const k = Math.min(1, Math.max(0, (p - a[0]) / (b[0] - a[0])));
  const mix = (x: string, y: string): Rgb => {
    const A = hex(x);
    const B = hex(y);
    return [0, 1, 2].map((j) => Math.round(A[j]! + (B[j]! - A[j]!) * k)) as Rgb;
  };
  return { top: mix(a[1], b[1]), bottom: mix(a[2], b[2]), stars: a[3] + (b[3] - a[3]) * k, lit: mix(a[4], b[4]), shade: mix(a[5], b[5]), cover: a[6] + (b[6] - a[6]) * k };
}

const rgb = (c: Rgb) => `rgb(${c[0]},${c[1]},${c[2]})`;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Star = { x: number; y: number; s: number; ph: number; tw: number; warm: boolean };

export class Sky {
  private ctx: CanvasRenderingContext2D;
  private stars: Star[] = [];
  private size = { w: 1, h: 1, dpr: 1 };
  private shoot: { x: number; y: number; t0: number } | null = null;
  private nextShoot = 2500;
  light: Light = { x: 0.1, y: 0.7, k: 0.5 };

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas unavailable");
    this.ctx = ctx;
    const r = mulberry32(41);
    for (let i = 0; i < 380; i++) this.stars.push({ x: r(), y: r() * 0.9, s: r() < 0.06 ? 1.9 : 0.5 + r() * 1.1, ph: r() * 6.28, tw: 0.4 + r() * 1.4, warm: r() < 0.12 });
  }

  resize(w: number, h: number) {
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    while (w * h * dpr * dpr > 3_200_000 && dpr > 0.4) dpr *= 0.85; // pixel budget
    this.size = { w, h, dpr };
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
  }

  draw(t: number, dark: boolean, p: number) {
    const { w, h, dpr } = this.size;
    const g = this.ctx;
    const s = sampleSky(dark, p);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, rgb(s.top));
    sky.addColorStop(1, rgb(s.bottom));
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);

    if (!dark) {
      const sx = w * (0.1 + 0.8 * p);
      const sy = h * (0.62 - 0.5 * Math.sin(Math.min(1, p * 1.05) * Math.PI));
      const sr = Math.max(30, Math.min(w, h) * 0.05);
      const warm = Math.max(0, p - 0.7) / 0.3;
      this.light = { x: sx / w, y: sy / h, k: 0.55 + 0.25 * warm };
      const glow = g.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 7);
      glow.addColorStop(0, `rgba(255,${Math.round(222 - 40 * warm)},${Math.round(150 - 40 * warm)},0.55)`);
      glow.addColorStop(1, "rgba(255,222,150,0)");
      g.fillStyle = glow;
      g.beginPath();
      g.arc(sx, sy, sr * 7, 0, 6.283);
      g.fill();
      g.fillStyle = warm > 0 ? `rgb(255,${Math.round(227 - 50 * warm)},${Math.round(163 - 60 * warm)})` : "#FFE3A3";
      g.beginPath();
      g.arc(sx, sy, sr, 0, 6.283);
      g.fill();
      return;
    }

    if (s.stars > 0.02) {
      g.globalCompositeOperation = "lighter";
      for (const st of this.stars) {
        const x = st.x * w;
        const y = st.y * h;
        g.globalAlpha = s.stars * (t ? 0.55 + 0.45 * Math.sin(t * 0.001 * st.tw + st.ph) : 0.8) * (0.35 + 0.65 * (1 - st.y));
        g.fillStyle = st.warm ? "#F6D9A8" : "#DCE2FF";
        if (st.s > 1.5) {
          g.beginPath();
          g.arc(x, y, st.s * 0.8, 0, 6.283);
          g.fill();
        } else g.fillRect(x, y, st.s, st.s);
      }
      g.globalAlpha = 1;
      if (t && s.stars > 0.6) {
        if (!this.shoot && t > this.nextShoot) this.shoot = { x: w * (0.3 + Math.random() * 0.6), y: h * (0.04 + Math.random() * 0.3), t0: t };
        if (this.shoot) {
          const k = (t - this.shoot.t0) / 1000;
          if (k > 1) {
            this.shoot = null;
            this.nextShoot = t + 3000 + Math.random() * 5000;
          } else {
            const x = this.shoot.x - 380 * k;
            const y = this.shoot.y + 180 * k;
            const gr = g.createLinearGradient(x, y, x + 140, y - 66);
            gr.addColorStop(0, `rgba(255,246,225,${(0.9 * (1 - k)).toFixed(3)})`);
            gr.addColorStop(1, "rgba(255,246,225,0)");
            g.strokeStyle = gr;
            g.lineWidth = 1.6;
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(x + 140, y - 66);
            g.stroke();
          }
        }
      }
      g.globalCompositeOperation = "source-over";
    }

    const mp = Math.min(1, p / 0.9);
    const mx = w * (0.08 + 0.84 * mp);
    const my = h * (0.72 - 0.58 * Math.sin(mp * Math.PI));
    const mr = Math.max(26, Math.min(w, h) * 0.045);
    this.light = { x: mx / w, y: my / h, k: 0.75 * (1 - Math.max(0, p - 0.8) / 0.2) };
    if (mp < 1) {
      const glow = g.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 6);
      glow.addColorStop(0, "rgba(242,226,190,0.2)");
      glow.addColorStop(1, "rgba(242,226,190,0)");
      g.fillStyle = glow;
      g.beginPath();
      g.arc(mx, my, mr * 6, 0, 6.283);
      g.fill();
      const body = g.createRadialGradient(mx - mr * 0.35, my - mr * 0.35, mr * 0.1, mx, my, mr);
      body.addColorStop(0, "#F7F1E3");
      body.addColorStop(1, "#D2C9B4");
      g.fillStyle = body;
      g.beginPath();
      g.arc(mx, my, mr, 0, 6.283);
      g.fill();
      g.fillStyle = "rgba(160,150,128,0.18)";
      for (const [dx, dy, rr] of [[-0.3, -0.2, 0.22], [0.25, 0.1, 0.16], [-0.05, 0.35, 0.12]] as const) {
        g.beginPath();
        g.arc(mx + dx * mr, my + dy * mr, rr * mr, 0, 6.283);
        g.fill();
      }
    }
    if (p > 0.82) {
      const k = (p - 0.82) / 0.18;
      const sx = w * 0.62;
      const sy = h * (1.05 - 0.4 * k);
      const sr = Math.max(30, Math.min(w, h) * 0.05);
      if (k > 0.4) this.light = { x: sx / w, y: sy / h, k: 0.8 * k };
      const glow = g.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 8);
      glow.addColorStop(0, `rgba(255,200,140,${(0.55 * k).toFixed(3)})`);
      glow.addColorStop(1, "rgba(255,200,140,0)");
      g.fillStyle = glow;
      g.beginPath();
      g.arc(sx, sy, sr * 8, 0, 6.283);
      g.fill();
      g.fillStyle = "#FFD596";
      g.beginPath();
      g.arc(sx, sy, sr, 0, 6.283);
      g.fill();
    }
  }
}
