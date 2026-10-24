import type * as THREE_NS from "three";
import type { SkySample } from "./sky";

/**
 * Zeno in 3D, built in code from the 2D mascot sheet's shapes and colours:
 * egg-shaped head, heart-shaped face, small dark eyes, shaded ears, pale belly,
 * pink paws, shaded feet and a curled tail (no towel on this site). Short
 * "shell" fur gives him a soft, furry edge. Swap for a rigged GLB later
 * without touching the page code — only build() changes.
 */

type Three = typeof THREE_NS;
export type Pose = "run" | "sit" | "wave" | "nap";

const P = {
  fur: 0xdcd3c6,
  shade: 0xc7bcad,
  belly: 0xe9e2d7,
  face: 0xf0c1b9,
  ear: 0xedb3ac,
  paw: 0xe9b8b0,
  eye: 0x2a2a30,
  mouth: 0x9a6660,
  mouthIn: 0xe9a49c,
  blush: 0xe79c98,
};

type Rig = {
  root: THREE_NS.Group;
  hips: THREE_NS.Group;
  torso: THREE_NS.Group;
  neck: THREE_NS.Group;
  eyes: THREE_NS.Group;
  armL: THREE_NS.Group;
  armR: THREE_NS.Group;
  legL: THREE_NS.Group;
  legR: THREE_NS.Group;
  tail: THREE_NS.Group;
  shadow: THREE_NS.Mesh;
  rim: { value: THREE_NS.Color };
  rimK: { value: number };
  blinkT: number;
};

export class Zeno3D {
  private ren: THREE_NS.WebGLRenderer;
  private scene: THREE_NS.Scene;
  private cam: THREE_NS.PerspectiveCamera;
  private hemi: THREE_NS.HemisphereLight;
  private key: THREE_NS.DirectionalLight;
  private rimLight: THREE_NS.DirectionalLight;
  private z: Rig;
  facing = 0;

  constructor(private T: Three, canvas: HTMLCanvasElement, opts: { shells: number }) {
    this.ren = new T.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.ren.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.ren.setSize(150, 190, false);
    this.ren.outputColorSpace = T.SRGBColorSpace;
    this.ren.toneMapping = T.ACESFilmicToneMapping;
    this.ren.toneMappingExposure = 1.05;
    this.scene = new T.Scene();
    this.cam = new T.PerspectiveCamera(26, 150 / 190, 0.1, 50);
    this.cam.position.set(0, 1.15, 6.2);
    this.cam.lookAt(0, 1.0, 0);
    this.hemi = new T.HemisphereLight(0xa9aec9, 0x3a3440, 1.2);
    this.key = new T.DirectionalLight(0xe6e8f5, 1.9);
    this.key.position.set(-2, 3, 4);
    this.rimLight = new T.DirectionalLight(0x9fb4ff, 1.4);
    this.rimLight.position.set(3, 2, -3);
    this.scene.add(this.hemi, this.key, this.rimLight);
    this.z = this.build(opts.shells);
    this.scene.add(this.z.root);
  }

  private build(shellCount: number): Rig {
    const T = this.T;
    const rim = { value: new T.Color(0xbfd0ff) };
    const rimK = { value: 0.5 };
    const rimmed = (m: THREE_NS.MeshStandardMaterial) => {
      m.onBeforeCompile = (sh) => {
        sh.uniforms.rimColor = rim;
        sh.uniforms.rimK = rimK;
        sh.fragmentShader =
          "uniform vec3 rimColor; uniform float rimK;\n" +
          sh.fragmentShader.replace(
            "#include <emissivemap_fragment>",
            "#include <emissivemap_fragment>\n float fr = 1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0);\n totalEmissiveRadiance += rimColor * rimK * pow(fr, 2.6);",
          );
      };
      return m;
    };
    const std = (c: number, r: number) => rimmed(new T.MeshStandardMaterial({ color: c, roughness: r, metalness: 0 }));
    const M = {
      fur: std(P.fur, 1),
      shade: std(P.shade, 1),
      belly: std(P.belly, 1),
      face: std(P.face, 0.6),
      ear: std(P.ear, 0.7),
      paw: std(P.paw, 0.65),
      eye: new T.MeshStandardMaterial({ color: P.eye, roughness: 0.12 }),
      glint: new T.MeshBasicMaterial({ color: 0xffffff }),
      mouth: new T.MeshStandardMaterial({ color: P.mouth, roughness: 0.5 }),
      mouthIn: new T.MeshStandardMaterial({ color: P.mouthIn, roughness: 0.6, side: T.DoubleSide }),
      blush: new T.MeshBasicMaterial({ color: P.blush, transparent: true, opacity: 0.5, depthWrite: false }),
    };
    const S = (r: number, w = 32, h = 24) => new T.SphereGeometry(r, w, h);
    const add = (parent: THREE_NS.Object3D, g: THREE_NS.BufferGeometry, m: THREE_NS.Material, x = 0, y = 0, z = 0, sx?: number, sy?: number, sz?: number) => {
      const o = new T.Mesh(g, m);
      o.position.set(x, y, z);
      if (sx !== undefined) o.scale.set(sx, sy ?? sx, sz ?? sx);
      parent.add(o);
      return o;
    };

    const root = new T.Group();
    const hips = new T.Group();
    hips.position.y = 0.42;
    root.add(hips);
    const leg = (s: number) => {
      const g = new T.Group();
      g.position.set(s * 0.13, 0.02, 0.02);
      hips.add(g);
      add(g, new T.CapsuleGeometry(0.075, 0.14, 6, 14), M.fur, 0, -0.15, 0);
      add(g, S(0.12, 20, 16), M.shade, 0, -0.31, 0.06, 0.82, 0.58, 1.32);
      return g;
    };
    const legL = leg(1);
    const legR = leg(-1);
    const torso = new T.Group();
    hips.add(torso);
    add(torso, S(0.33, 36, 28), M.fur, 0, 0.29, 0, 0.92, 1.08, 0.84);
    add(torso, S(0.22, 28, 22), M.belly, 0, 0.25, 0.17, 1, 1.12, 0.62);
    const tail = new T.Group();
    tail.position.set(0.05, 0.08, -0.24);
    torso.add(tail);
    const tc = new T.CatmullRomCurve3([
      new T.Vector3(0, 0, 0),
      new T.Vector3(0.1, -0.05, -0.14),
      new T.Vector3(0.24, 0.04, -0.2),
      new T.Vector3(0.3, 0.2, -0.14),
      new T.Vector3(0.22, 0.28, -0.08),
      new T.Vector3(0.15, 0.22, -0.08),
    ]);
    add(tail, new T.TubeGeometry(tc, 40, 0.045, 10, false), M.shade);
    add(tail, S(0.045, 12, 10), M.shade, 0.15, 0.22, -0.08);
    const arm = (s: number) => {
      const g = new T.Group();
      g.position.set(s * 0.27, 0.5, 0.03);
      torso.add(g);
      add(g, new T.CapsuleGeometry(0.068, 0.2, 6, 14), M.fur, 0, -0.14, 0);
      add(g, S(0.082, 18, 14), M.paw, 0, -0.29, 0.02, 1.05, 0.85, 1);
      return g;
    };
    const armL = arm(1);
    const armR = arm(-1);

    const neck = new T.Group();
    neck.position.y = 0.6;
    torso.add(neck);
    const head = new T.Group();
    head.position.y = 0.36;
    neck.add(head);
    const hg = S(0.42, 44, 34);
    const hp = hg.attributes.position!;
    for (let i = 0; i < hp.count; i++) {
      const y = hp.getY(i) / 0.42;
      const k = y > 0 ? 1 - 0.16 * Math.pow(y, 1.6) : 1 - 0.04 * y * y; // narrower crown, like the drawing
      hp.setX(i, hp.getX(i) * k);
      hp.setZ(i, hp.getZ(i) * k);
    }
    hg.computeVertexNormals();
    add(head, hg, M.fur, 0, 0, 0, 1, 1.05, 0.95);
    for (const s of [-1, 1]) {
      const ear = new T.Group();
      ear.position.set(s * 0.4, -0.01, -0.04);
      ear.rotation.y = s * 0.3;
      head.add(ear);
      add(ear, S(0.12, 22, 16), M.shade, 0, 0, 0, 0.5, 1, 1);
      add(ear, S(0.066, 18, 14), M.ear, s * 0.035, 0, 0.02, 0.4, 1, 1);
    }
    const face = new T.Group();
    face.position.set(0, 0, 0.345);
    head.add(face);
    add(face, S(0.185), M.face, -0.088, 0.045, 0, 1, 1.04, 0.42);
    add(face, S(0.185), M.face, 0.088, 0.045, 0, 1, 1.04, 0.42);
    add(face, S(0.19), M.face, 0, -0.12, 0.012, 1.08, 0.9, 0.44);
    const eyes = new T.Group();
    eyes.position.set(0, 0, 0.074);
    face.add(eyes);
    for (const s of [-1, 1]) {
      const e = add(eyes, S(0.042, 20, 16), M.eye, s * 0.098, 0, 0, 1, 1, 0.6);
      add(e, S(0.013, 10, 8), M.glint, 0.014, 0.016, 0.034);
    }
    const smile = add(face, new T.TorusGeometry(0.052, 0.009, 8, 20, Math.PI), M.mouth, 0, -0.17, 0.093);
    smile.rotation.set(0.35, 0, Math.PI);
    const mi = add(face, new T.CircleGeometry(0.05, 20, Math.PI, Math.PI), M.mouthIn, 0, -0.17, 0.091);
    mi.rotation.x = 0.35;
    for (const s of [-1, 1]) {
      const b = add(face, new T.CircleGeometry(0.045, 20), M.blush, s * 0.16, -0.12, 0.078, 1, 0.58, 1);
      b.rotation.y = s * 0.5;
    }

    const shadow = new T.Mesh(
      new T.CircleGeometry(0.62, 40),
      new T.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { op: { value: 0.3 } },
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: "varying vec2 vUv; uniform float op; void main(){ float d = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(0.03, 0.03, 0.08, op * smoothstep(1.0, 0.0, d)); }",
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.005;
    shadow.scale.set(0.9, 0.62, 1);
    root.add(shadow);

    // Shell fur: offset copies of each furry mesh, cut into strands by a 3D hash.
    const furry: [THREE_NS.MeshStandardMaterial, number][] = [
      [M.fur, 0.022],
      [M.shade, 0.02],
      [M.belly, 0.018],
    ];
    const cache = new Map<string, THREE_NS.MeshStandardMaterial>();
    const shellMat = (base: THREE_NS.MeshStandardMaterial, i: number, len: number) => {
      const m = base.clone();
      const off = { value: (len * i) / shellCount };
      const frac = { value: i / shellCount };
      m.onBeforeCompile = (sh, r) => {
        base.onBeforeCompile(sh, r);
        sh.uniforms.off = off;
        sh.uniforms.frac = frac;
        sh.vertexShader = "uniform float off; varying vec3 vObj;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n vObj = position; transformed += normal * off;");
        sh.fragmentShader =
          "uniform float frac; varying vec3 vObj;\n float h31(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }\n" +
          sh.fragmentShader.replace(
            "#include <alphatest_fragment>",
            "vec3 cp = vObj * 110.0; float hh = h31(floor(cp)); float dd = length(fract(cp) - 0.5);\n if (hh < frac * 0.92 || dd > 0.62 * (1.0 - frac * 0.55)) discard;\n diffuseColor.rgb *= mix(0.8, 1.05, frac);\n#include <alphatest_fragment>",
          );
      };
      m.customProgramCacheKey = () => "zeno-shell";
      return m;
    };
    const targets: THREE_NS.Mesh[] = [];
    root.traverse((o) => {
      const mesh = o as THREE_NS.Mesh;
      if (mesh.isMesh && furry.some(([m]) => m === mesh.material)) targets.push(mesh);
    });
    for (const mesh of targets) {
      const fi = furry.findIndex(([m]) => m === mesh.material);
      const [base, len] = furry[fi]!;
      for (let i = 1; i <= shellCount; i++) {
        const k = `${fi}:${i}`;
        if (!cache.has(k)) cache.set(k, shellMat(base, i, len));
        mesh.add(new T.Mesh(mesh.geometry, cache.get(k)!));
      }
    }

    return { root, hips, torso, neck, eyes, armL, armR, legL, legR, tail, shadow, rim, rimK, blinkT: 2 };
  }

  pose(pose: Pose, t: number, dt: number, look: { x: number; y: number }, facingTarget: number) {
    const z = this.z;
    const L = (a: number, b: number, k: number) => a + (b - a) * Math.min(1, k);
    const k = dt * 9;
    const run = pose === "run";
    const nap = pose === "nap";
    const wave = pose === "wave";
    const sit = pose === "sit" || wave;
    const ph = t * 11.5;
    const sw = run ? Math.sin(ph) : 0;
    const bob = run ? Math.abs(Math.sin(ph)) * 0.07 : 0;
    this.facing = L(this.facing, facingTarget, dt * 8);
    z.root.rotation.y = this.facing;
    z.hips.position.y = L(z.hips.position.y, (nap ? 0.13 : sit ? 0.16 : 0.42) + bob, k * 1.4);
    z.torso.rotation.x = L(z.torso.rotation.x, run ? 0.22 : nap ? 0.1 : -0.03, k);
    z.torso.rotation.z = L(z.torso.rotation.z, run ? Math.sin(ph) * 0.05 : nap ? 0.16 : 0, k);
    z.torso.scale.y = nap ? 1 + Math.sin(t * 2.1) * 0.02 : 1;
    z.legL.rotation.x = L(z.legL.rotation.x, run ? sw * 0.95 : -1.35, k * 1.6);
    z.legR.rotation.x = L(z.legR.rotation.x, run ? -sw * 0.95 : -1.35, k * 1.6);
    z.legL.rotation.z = L(z.legL.rotation.z, sit || nap ? 0.25 : 0, k);
    z.legR.rotation.z = L(z.legR.rotation.z, sit || nap ? -0.25 : 0, k);
    z.armL.rotation.x = L(z.armL.rotation.x, run ? -sw : nap ? -0.8 : -0.35, k * 1.6);
    z.armL.rotation.z = L(z.armL.rotation.z, run ? 0.12 : 0.28, k);
    z.armR.rotation.x = L(z.armR.rotation.x, run ? sw : wave ? -0.2 : nap ? -0.8 : -0.35, k * 1.6);
    z.armR.rotation.z = L(z.armR.rotation.z, wave ? -2.55 + Math.sin(t * 9) * 0.35 : run ? -0.12 : -0.28, k * 1.8);
    const lx = sit ? look.x * 0.5 : 0;
    const ly = sit ? look.y * 0.25 : 0;
    z.neck.rotation.y = L(z.neck.rotation.y, nap ? -0.3 : lx, k * 0.6);
    z.neck.rotation.x = L(z.neck.rotation.x, nap ? 0.25 : run ? -0.16 + Math.sin(ph * 2) * 0.035 : ly, k * 0.8);
    z.neck.rotation.z = L(z.neck.rotation.z, nap ? 0.45 : sit ? Math.sin(t * 0.9) * 0.08 : 0, k * 0.6);
    z.tail.rotation.y = Math.sin(t * (run ? 7 : 1.6)) * (run ? 0.25 : 0.12);
    z.blinkT -= dt;
    let ey = 1;
    if (nap) ey = 0.12;
    else {
      if (z.blinkT < 0) z.blinkT = 2.4 + Math.random() * 3;
      if (z.blinkT < 0.12) ey = 0.12;
    }
    z.eyes.scale.y = nap ? L(z.eyes.scale.y, ey, k * 0.3) : ey;
    z.shadow.scale.set(0.9 - bob, 0.62 - bob, 1);
  }

  render(dark: boolean, s: SkySample) {
    const lit = s.lit.map((v) => v / 255) as [number, number, number];
    const top = s.top.map((v) => v / 255) as [number, number, number];
    this.rimLight.color.setRGB(lit[0], lit[1], lit[2], "srgb");
    this.z.rim.value.setRGB(lit[0], lit[1], lit[2], "srgb");
    this.z.rimK.value = dark ? 0.5 : 0.3;
    this.hemi.color.setRGB(0.55 + top[0] * 0.45, 0.55 + top[1] * 0.45, 0.6 + top[2] * 0.4, "srgb");
    this.hemi.intensity = dark ? 1.25 : 1.6;
    if (dark) this.key.color.setRGB(0.85 + lit[0] * 0.15, 0.86 + lit[1] * 0.14, 0.9 + lit[2] * 0.1, "srgb");
    else this.key.color.setHex(0xfff2dd);
    this.key.intensity = dark ? 1.9 : 2.4;
    this.ren.render(this.scene, this.cam);
  }

  dispose() {
    this.scene.traverse((o) => {
      const m = o as THREE_NS.Mesh;
      if (m.isMesh) {
        m.geometry.dispose();
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((x) => x.dispose());
      }
    });
    this.ren.dispose();
  }
}
