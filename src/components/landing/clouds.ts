import type * as THREE_NS from "three";
import type { Light, SkySample } from "./sky";

type Three = typeof THREE_NS;

const VERT = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";

// Soft drifting clouds (classic 2D fbm technique) lit by the moon or sun.
const FRAG = `precision highp float;
uniform vec2 uRes; uniform float uTime; uniform float uScroll; uniform vec2 uLight; uniform float uLightK;
uniform vec3 uLit; uniform vec3 uShade; uniform float uCover; uniform float uAlpha;
varying vec2 vUv;
const mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
vec2 hash(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return -1.0 + 2.0 * fract(sin(p) * 43758.5453123); }
float noise(vec2 p){
  const float K1 = 0.366025404, K2 = 0.211324865;
  vec2 i = floor(p + (p.x + p.y) * K1); vec2 a = p - i + (i.x + i.y) * K2;
  vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec2 b = a - o + K2; vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
  vec3 n = h * h * h * h * vec3(dot(a, hash(i)), dot(b, hash(i + o)), dot(c, hash(i + 1.0)));
  return dot(n, vec3(70.0));
}
void main(){
  vec2 p = vec2(vUv.x * uRes.x / uRes.y, vUv.y);
  vec2 sp = p + vec2(0.0, -uScroll * 0.35);
  float t = uTime * 0.012;
  vec2 uv = sp * vec2(1.0, 2.4) * 1.15;
  float r = 0.0; vec2 u = uv - t; float w = 0.8;
  for (int i = 0; i < 7; i++){ r += abs(w * noise(u)); u = m * u + t; w *= 0.7; }
  float f = 0.0; u = uv - t; w = 0.7;
  for (int i = 0; i < 7; i++){ f += w * noise(u); u = m * u + t; w *= 0.6; }
  f *= r + f;
  float c = 0.0; float t2 = t * 2.0; u = uv * 2.0 - t2; w = 0.4;
  for (int i = 0; i < 6; i++){ c += w * noise(u); u = m * u + t2; w *= 0.6; }
  float c1 = 0.0; float t3 = t * 3.0; u = uv * 3.0 - t3; w = 0.4;
  for (int i = 0; i < 6; i++){ c1 += abs(w * noise(u)); u = m * u + t3; w *= 0.6; }
  c += c1;
  float y = sp.y;
  float bands = 0.55 * smoothstep(0.16, 0.0, abs(y - 0.70)) + 0.8 * smoothstep(0.2, 0.0, abs(y - 0.40)) + 0.9 * smoothstep(0.22, 0.0, abs(y - 0.08));
  float cover = uCover * 0.9 - 0.55 + bands * 0.55;
  float a = smoothstep(0.05, 0.95, clamp(cover + 7.0 * f * r + c * 0.6, 0.0, 1.0));
  vec2 L = uLight - p; float ld = length(L);
  vec3 col = mix(uShade, uLit, clamp(0.42 + 0.55 * c + (L.y > 0.0 ? 0.0 : 0.075), 0.0, 1.0));
  col += uLit * uLightK * exp(-ld * 2.8) * (0.4 + 1.2 * (1.0 - a));
  gl_FragColor = vec4(col, a * uAlpha);
}`;

export class Clouds {
  private ren: THREE_NS.WebGLRenderer;
  private mat: THREE_NS.ShaderMaterial;
  private scene: THREE_NS.Scene;
  private cam: THREE_NS.OrthographicCamera;
  private size = { w: 1, h: 1 };

  constructor(T: Three, canvas: HTMLCanvasElement) {
    this.ren = new T.WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: "low-power" });
    this.mat = new T.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uRes: { value: new T.Vector2(1, 1) },
        uTime: { value: 40 },
        uScroll: { value: 0 },
        uLight: { value: new T.Vector2(0.2, 0.3) },
        uLightK: { value: 0.5 },
        uLit: { value: new T.Color() },
        uShade: { value: new T.Color() },
        uCover: { value: 0.4 },
        uAlpha: { value: 1 },
      },
    });
    this.scene = new T.Scene();
    this.scene.add(new T.Mesh(new T.PlaneGeometry(2, 2), this.mat));
    this.cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  resize(w: number, h: number) {
    this.size = { w, h };
    this.ren.setPixelRatio(w < 700 ? 0.4 : 0.5); // soft clouds look the same at half resolution
    this.ren.setSize(w, h, false);
    (this.mat.uniforms.uRes!.value as THREE_NS.Vector2).set(w, h);
  }

  render(time: number, progress: number, s: SkySample, light: Light, coverBias = 0) {
    const u = this.mat.uniforms;
    u.uTime!.value = time;
    u.uScroll!.value = progress;
    (u.uLit!.value as THREE_NS.Color).setRGB(s.lit[0] / 255, s.lit[1] / 255, s.lit[2] / 255, "srgb");
    (u.uShade!.value as THREE_NS.Color).setRGB(s.shade[0] / 255, s.shade[1] / 255, s.shade[2] / 255, "srgb");
    u.uCover!.value = Math.max(0, Math.min(1, s.cover + coverBias));
    (u.uLight!.value as THREE_NS.Vector2).set((light.x * this.size.w) / this.size.h, 1 - light.y);
    u.uLightK!.value = light.k;
    this.ren.render(this.scene, this.cam);
  }

  dispose() {
    this.mat.dispose();
    this.ren.dispose();
  }
}
