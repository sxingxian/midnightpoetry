import type * as THREE_NS from "three";
import type { Bodies } from "./sky";

type Three = typeof THREE_NS;

/**
 * The 3D scene's moon and sun: real spheres in front of the 2D sky and behind the
 * clouds, placed wherever the sky says they are this frame.
 * - Moon: a slowly turning sphere with procedural maria and craters (colour + bump map),
 *   lit from the side so the relief shows at the edge.
 * - Sun: a sphere with a moving granulated surface and limb darkening, plus a soft halo.
 * Everything is generated in code (no image downloads).
 */

function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Equirectangular moon map, drawn once: soft dark maria, then craters with a lit rim. */
function moonCanvas(): HTMLCanvasElement {
  const W = 512;
  const H = 256;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const r = seeded(19);
  g.fillStyle = "#dad3c0";
  g.fillRect(0, 0, W, H);
  // Wrap shapes across the seam so the sphere has no visible join.
  const wrap = (x: number, draw: (x: number) => void) => {
    draw(x);
    if (x < 60) draw(x + W);
    if (x > W - 60) draw(x - W);
  };
  for (let i = 0; i < 9; i++) {
    const x = r() * W;
    const y = H * (0.25 + r() * 0.5);
    const rad = 26 + r() * 46;
    wrap(x, (xx) => {
      const gr = g.createRadialGradient(xx, y, rad * 0.2, xx, y, rad);
      gr.addColorStop(0, "rgba(118,110,96,0.45)");
      gr.addColorStop(1, "rgba(118,110,96,0)");
      g.fillStyle = gr;
      g.beginPath();
      g.arc(xx, y, rad, 0, Math.PI * 2);
      g.fill();
    });
  }
  for (let i = 0; i < 70; i++) {
    const x = r() * W;
    const y = H * (0.08 + r() * 0.84);
    const rad = 1.5 + Math.pow(r(), 3) * 12;
    wrap(x, (xx) => {
      g.fillStyle = "rgba(112,104,90,0.22)";
      g.beginPath();
      g.arc(xx, y, rad, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "rgba(250,244,228,0.26)";
      g.lineWidth = Math.max(0.8, rad * 0.22);
      g.beginPath();
      g.arc(xx - rad * 0.12, y - rad * 0.12, rad, Math.PI * 0.9, Math.PI * 1.9);
      g.stroke();
    });
  }
  // Fine grain.
  const img = g.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 14;
    img.data[i] = img.data[i]! + n;
    img.data[i + 1] = img.data[i + 1]! + n;
    img.data[i + 2] = img.data[i + 2]! + n;
  }
  g.putImageData(img, 0, 0);
  return c;
}

const SUN_VERT = `varying vec3 vN; varying vec3 vP;
void main(){ vN = normalize(normalMatrix * normal); vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const SUN_FRAG = `precision highp float;
uniform float uTime; uniform vec3 uColor;
varying vec3 vN; varying vec3 vP;
float h(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float n3(vec3 p){ vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * n3(p); p *= 2.1; a *= 0.5; } return s; }
void main(){
  float mu = clamp(vN.z, 0.0, 1.0);
  float gran = fbm(vP * 5.0 + vec3(0.0, uTime * 0.06, uTime * 0.04));
  vec3 hot = vec3(1.0, 0.985, 0.94);
  vec3 col = mix(uColor, hot, 0.75 * pow(mu, 1.2));      // white-hot centre, coloured edge
  col *= 0.95 + 0.1 * gran;                               // moving granulation
  col *= 0.86 + 0.14 * pow(mu, 0.35);                     // gentle limb darkening
  gl_FragColor = vec4(min(col, vec3(1.0)), 1.0);
}`;

const HALO_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const HALO_FRAG = `precision highp float;
uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
void main(){
  vec2 d = vUv - 0.5; float r = length(d) * 2.0; float a = atan(d.y, d.x);
  float ray = 1.0 + 0.06 * sin(a * 9.0 + uTime * 0.7) * sin(a * 5.0 - uTime * 0.4);
  float k = pow(clamp(1.0 - r * ray, 0.0, 1.0), 2.2) * 0.7;
  gl_FragColor = vec4(mix(uColor, vec3(1.0), 0.35) * k, k); // premultiplied
}`;

export class Celestial3D {
  private ren: THREE_NS.WebGLRenderer;
  private scene: THREE_NS.Scene;
  private cam: THREE_NS.OrthographicCamera;
  private moon: THREE_NS.Mesh;
  private sun: THREE_NS.Mesh;
  private halo: THREE_NS.Mesh;
  private sunMat: THREE_NS.ShaderMaterial;
  private haloMat: THREE_NS.ShaderMaterial;
  private moonTex: THREE_NS.CanvasTexture;
  private empty = false;

  constructor(private T: Three, canvas: HTMLCanvasElement) {
    this.ren = new T.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: "low-power" });
    this.ren.outputColorSpace = T.SRGBColorSpace;
    this.scene = new T.Scene();
    this.cam = new T.OrthographicCamera(0, 1, 0, -1, -1000, 1000);

    this.moonTex = new T.CanvasTexture(moonCanvas());
    this.moonTex.colorSpace = T.SRGBColorSpace;
    this.moonTex.anisotropy = 4;
    const moonMat = new T.MeshStandardMaterial({
      map: this.moonTex,
      bumpMap: this.moonTex,
      bumpScale: 1.4,
      roughness: 1,
      metalness: 0,
      emissive: new T.Color("#2b2822"),
      emissiveIntensity: 0.55,
    });
    this.moon = new T.Mesh(new T.SphereGeometry(1, 64, 40), moonMat);
    this.moon.rotation.x = 0.35;

    this.sunMat = new T.ShaderMaterial({ vertexShader: SUN_VERT, fragmentShader: SUN_FRAG, uniforms: { uTime: { value: 0 }, uColor: { value: new T.Color() } } });
    this.sun = new T.Mesh(new T.SphereGeometry(1, 48, 32), this.sunMat);
    this.haloMat = new T.ShaderMaterial({
      vertexShader: HALO_VERT,
      fragmentShader: HALO_FRAG,
      transparent: true,
      depthWrite: false,
      premultipliedAlpha: true,
      uniforms: { uTime: { value: 0 }, uColor: { value: new T.Color() } },
    });
    this.halo = new T.Mesh(new T.PlaneGeometry(1, 1), this.haloMat);
    this.halo.renderOrder = -1;

    // Light from just above-left of the viewer: a near-full moon whose craters show relief towards the edge.
    const key = new T.DirectionalLight("#fff6e6", 3.0);
    key.position.set(-0.35, 0.3, 1);
    this.scene.add(key, new T.AmbientLight("#9aa4d6", 0.35), this.moon, this.halo, this.sun);
  }

  resize(w: number, h: number) {
    this.ren.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.ren.setSize(w, h, false);
    this.cam.right = w;
    this.cam.bottom = -h;
    this.cam.updateProjectionMatrix();
  }

  /** time in seconds; bodies from the 2D sky (CSS px). */
  render(time: number, bodies: Bodies) {
    const { moon, sun } = bodies;
    if (!moon && !sun) {
      if (!this.empty) {
        this.moon.visible = this.sun.visible = this.halo.visible = false;
        this.ren.render(this.scene, this.cam);
        this.empty = true;
      }
      return;
    }
    this.empty = false;
    this.moon.visible = !!moon;
    if (moon) {
      this.moon.position.set(moon.x, -moon.y, 0);
      this.moon.scale.setScalar(moon.r);
      this.moon.rotation.y = time * 0.05;
    }
    this.sun.visible = this.halo.visible = !!sun;
    if (sun) {
      const c = new this.T.Color(sun.color[0] / 255, sun.color[1] / 255, sun.color[2] / 255);
      this.sun.position.set(sun.x, -sun.y, 10);
      this.sun.scale.setScalar(sun.r);
      this.sun.rotation.y = time * 0.03;
      this.halo.position.set(sun.x, -sun.y, 5);
      this.halo.scale.setScalar(sun.r * 4);
      (this.sunMat.uniforms.uColor!.value as THREE_NS.Color).copy(c);
      (this.haloMat.uniforms.uColor!.value as THREE_NS.Color).copy(c);
      this.sunMat.uniforms.uTime!.value = time;
      this.haloMat.uniforms.uTime!.value = time;
    }
    this.ren.render(this.scene, this.cam);
  }

  dispose() {
    this.moon.geometry.dispose();
    (this.moon.material as THREE_NS.Material).dispose();
    this.moonTex.dispose();
    this.sun.geometry.dispose();
    this.sunMat.dispose();
    this.halo.geometry.dispose();
    this.haloMat.dispose();
    this.ren.dispose();
    this.ren.forceContextLoss();
  }
}
