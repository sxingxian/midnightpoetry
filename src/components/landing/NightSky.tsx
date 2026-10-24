"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sky, sampleSky } from "./sky";
import type { Clouds } from "./clouds";
import { FlatClouds } from "./clouds2d";
import type { Pose, Zeno3D } from "./zeno3d";
import { ZenoFallback } from "./ZenoFallback";
import { SCENE_EVENT, hasWebgl, markWebglOff, readScene, webglOff, type Scene } from "@/components/site/scene";

const NIGHT = { start: 21 * 60 + 10, end: 30 * 60 + 10 };
const DAY = { start: 7 * 60, end: 19 * 60 };
const HELLO = ["Hi, I'm Zeno.", "Still up? Me too.", "The products arrive at dawn.", "I split bills. Fairly."];

function isDark() {
  return document.documentElement.getAttribute("data-theme") !== "light";
}

function progress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}

/**
 * Fixed background layers for the landing page: the sky, the clouds, the clock and Zeno.
 * - 3D scene: shader clouds and the 3D Zeno (three.js, loaded after first paint).
 * - 2D scene: flat layered clouds and the flat Zeno from the mascot sheet; no WebGL at all.
 * The header's 2D / 3D toggle switches between them; devices without WebGL always get 2D.
 */
export function NightSky() {
  const skyRef = useRef<HTMLCanvasElement>(null);
  const cloudRef = useRef<HTMLCanvasElement>(null);
  const cloud2dRef = useRef<HTMLCanvasElement>(null);
  const zenoCanvasRef = useRef<HTMLCanvasElement>(null);
  const zenoBoxRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  // null until mounted (the server can't know the choice); the 3D canvas renders meanwhile, empty.
  const [scene, setScene] = useState<Scene | null>(null);
  const [noWebgl, setNoWebgl] = useState(false);
  const flat = scene === "2d" || noWebgl;
  const engine = useRef<{ clouds: Clouds | null; flatClouds: FlatClouds | null; zeno: Zeno3D | null }>({ clouds: null, flatClouds: null, zeno: null });
  const drawStillRef = useRef<() => void>(() => {});
  const [pose, setPose] = useState<Pose>("run");
  const [dir, setDir] = useState(1);
  const [bubble, setBubble] = useState<string | null>(null);

  const state = useRef({ x: 80, tx: 520, dir: 1, mode: "run" as Pose, until: 0, look: { x: 0, y: 0 }, reduced: false });
  const poseRef = useRef<Pose>("run");
  const bubbleTimer = useRef<number | undefined>(undefined);

  const say = useCallback((text: string, ms: number) => {
    setBubble(text);
    window.clearTimeout(bubbleTimer.current);
    bubbleTimer.current = window.setTimeout(() => setBubble(null), ms);
  }, []);

  const setPoseBoth = useCallback((p: Pose) => {
    poseRef.current = p;
    setPose(p);
  }, []);

  const napTime = () => {
    const p = progress();
    return isDark() && p > 0.4 && p < 0.62;
  };

  const onHello = () => {
    if (napTime()) {
      say("Shh… Zeno is asleep. Back at dawn.", 2400);
      return;
    }
    state.current.mode = "wave";
    state.current.until = performance.now() + 2600;
    setPoseBoth("wave");
    say(HELLO[Math.floor(Math.random() * HELLO.length)]!, 2600);
    if (state.current.reduced) window.setTimeout(() => setPoseBoth("sit"), 2600);
  };

  useEffect(() => {
    const skyCanvas = skyRef.current;
    if (!skyCanvas) return;
    const S = state.current;
    S.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sky = new Sky(skyCanvas);
    const E = engine.current;
    let raf = 0;
    let frame = 0;
    let prev = performance.now();

    const clampX = (x: number) => Math.max(0, Math.min(window.innerWidth - 150, x));
    const place = () => {
      if (zenoBoxRef.current) zenoBoxRef.current.style.transform = `translateX(${S.x.toFixed(1)}px)`;
    };

    const syncClock = () => {
      const m = Math.round(progress() * 120);
      const sched = isDark() ? NIGHT : DAY;
      const minutes = sched.start + Math.round(((sched.end - sched.start) * m) / 120);
      if (clockRef.current) clockRef.current.textContent = `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    };

    const drawStill = () => {
      const dark = isDark();
      const p = progress();
      sky.draw(0, dark, p);
      const s = sampleSky(dark, p);
      E.clouds?.render(40, p, s, sky.light);
      E.flatClouds?.render(40, p, s);
      if (E.zeno) {
        E.zeno.pose(poseRef.current === "run" ? "sit" : poseRef.current, 1, 1, S.look, 0.35);
        E.zeno.render(dark, s);
      }
      syncClock();
    };
    drawStillRef.current = drawStill;

    const resize = () => {
      sky.resize(window.innerWidth, window.innerHeight);
      E.clouds?.resize(window.innerWidth, window.innerHeight);
      E.flatClouds?.resize(window.innerWidth, window.innerHeight);
      S.x = clampX(S.x);
      place();
      drawStill();
    };

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (t - prev) / 1000);
      prev = t;
      if (napTime()) {
        if (poseRef.current !== "nap") {
          setPoseBoth("nap");
          setBubble(null);
        }
      } else if (poseRef.current === "nap") {
        S.mode = "run";
        S.tx = clampX(S.x + 300);
        setPoseBoth("run");
        say("Morning already?", 2000);
      } else if (S.mode === "run") {
        const dx = S.tx - S.x;
        if (Math.abs(dx) < 2) {
          S.mode = "sit";
          S.until = t + 1800 + Math.random() * 2800;
          setPoseBoth("sit");
        } else {
          const d = dx > 0 ? 1 : -1;
          if (d !== S.dir) {
            S.dir = d;
            setDir(d);
          }
          S.x += Math.sign(dx) * Math.min(Math.abs(dx), 170 * dt);
        }
      } else if (t > S.until) {
        S.mode = "run";
        let nx = clampX(Math.random() * window.innerWidth);
        if (Math.abs(nx - S.x) < 160) nx = clampX(S.x + (S.x > window.innerWidth / 2 ? -320 : 320));
        S.tx = nx;
        setPoseBoth("run");
      }
      place();
      if (document.hidden) return;
      const dark = isDark();
      const p = progress();
      sky.draw(t, dark, p);
      const s = sampleSky(dark, p);
      if ((frame++ & 1) === 0) {
        E.clouds?.render(t / 1000 + 40, p, s, sky.light);
        E.flatClouds?.render(t / 1000 + 40, p, s);
      }
      if (E.zeno) {
        const pz = poseRef.current;
        const facing = pz === "run" ? S.dir * 0.95 : pz === "nap" ? 0.35 : S.dir * 0.45;
        E.zeno.pose(pz, t / 1000, dt, S.look, facing);
        E.zeno.render(dark, s);
      }
    };

    const onScroll = () => {
      syncClock();
      if (S.reduced) drawStill();
    };
    const onTheme = () => drawStill();
    const onPointer = (e: PointerEvent) => {
      const cx = S.x + 75;
      const cy = window.innerHeight - 100;
      S.look.x = Math.max(-1, Math.min(1, (e.clientX - cx) / 420));
      S.look.y = Math.max(-1, Math.min(1, (e.clientY - cy) / 420));
      if (e.clientY > window.innerHeight - 220 && S.mode === "run") S.tx = clampX(e.clientX - 75);
    };

    const foot = document.querySelector("[data-foot]");
    const footIO = new IntersectionObserver(
      (entries) => {
        const away = !!entries[0]?.isIntersecting && document.documentElement.scrollHeight > window.innerHeight * 1.5;
        if (zenoBoxRef.current) {
          zenoBoxRef.current.style.opacity = away ? "0" : "1";
          zenoBoxRef.current.style.visibility = away ? "hidden" : "visible";
        }
      },
      { threshold: 0.3 },
    );
    if (foot) footIO.observe(foot);

    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("mp-theme", onTheme);
    resize();

    if (S.reduced) {
      S.x = clampX(window.innerWidth - 200);
      S.mode = "sit";
      setPoseBoth("sit");
      place();
    } else {
      raf = requestAnimationFrame(tick);
    }

    // Which scene: the visitor's choice, unless this device can't do WebGL.
    if (!hasWebgl()) markWebglOff();
    const syncScene = () => {
      setScene(readScene());
      setNoWebgl(webglOff());
    };
    syncScene();
    window.addEventListener(SCENE_EVENT, syncScene);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener(SCENE_EVENT, syncScene);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("mp-theme", onTheme);
      footIO.disconnect();
      window.clearTimeout(bubbleTimer.current);
    };
  }, [say, setPoseBoth]);

  // Build the chosen scene's clouds and Zeno; tear them down when the scene changes.
  useEffect(() => {
    if (!scene) return;
    const E = engine.current;
    const size = () => [window.innerWidth, window.innerHeight] as const;

    if (flat) {
      if (cloud2dRef.current) {
        try {
          E.flatClouds = new FlatClouds(cloud2dRef.current);
          E.flatClouds.resize(...size());
        } catch {
          E.flatClouds = null;
        }
      }
      drawStillRef.current();
      return () => {
        E.flatClouds?.dispose();
        E.flatClouds = null;
      };
    }

    let disposed = false;
    const cloudCanvas = cloudRef.current;
    const zenoCanvas = zenoCanvasRef.current;
    const lost = (e: Event) => {
      e.preventDefault();
      if (!disposed) markWebglOff(); // the GPU gave up: fall back to 2D for this visit
    };
    // three.js after first paint, in its own chunk.
    const load = async () => {
      try {
        const T = await import("three");
        const { Clouds } = await import("./clouds");
        const { Zeno3D } = await import("./zeno3d");
        if (disposed) return;
        if (cloudCanvas) {
          try {
            E.clouds = new Clouds(T, cloudCanvas);
            E.clouds.resize(...size());
            cloudCanvas.addEventListener("webglcontextlost", lost);
          } catch {
            E.clouds = null;
          }
        }
        if (!zenoCanvas) throw new Error("no canvas");
        E.zeno = new Zeno3D(T, zenoCanvas, { shells: window.innerWidth < 700 ? 5 : 8 });
        zenoCanvas.addEventListener("webglcontextlost", lost);
        drawStillRef.current();
      } catch {
        if (!disposed) markWebglOff();
      }
    };
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const timer = idle ? (idle(() => void load()), 0) : window.setTimeout(() => void load(), 200);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      cloudCanvas?.removeEventListener("webglcontextlost", lost);
      zenoCanvas?.removeEventListener("webglcontextlost", lost);
      E.clouds?.dispose();
      E.zeno?.dispose();
      E.clouds = null;
      E.zeno = null;
    };
  }, [scene, flat]);

  return (
    <>
      <canvas ref={skyRef} className="sky-layer" aria-hidden="true" />
      {flat ? <canvas key="clouds-2d" ref={cloud2dRef} className="sky-layer" aria-hidden="true" /> : <canvas key="clouds-3d" ref={cloudRef} className="sky-layer" aria-hidden="true" />}
      <svg className="ground" aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 1440 120">
        <path d="M0 70 L40 52 L60 64 L86 40 L110 62 L140 50 L170 66 L210 58 L250 70 C400 60 520 76 680 68 C820 62 900 74 1040 66 L1080 50 L1100 62 L1130 36 L1160 60 L1190 48 L1220 64 L1260 56 L1300 66 L1440 60 V120 H0 Z" fill="var(--ground-2)" />
        <path d="M0 92 C220 80 420 96 680 88 C940 80 1180 98 1440 86 V120 H0 Z" fill="var(--ground)" />
        <path d="M0 92 C220 80 420 96 680 88 C940 80 1180 98 1440 86" stroke="var(--snow-edge)" strokeWidth="1.5" fill="none" />
      </svg>

      <div className="clock" aria-hidden="true">
        <span className="clock-label">
          <span className="when-dark">THE NIGHT SO FAR</span>
          <span className="when-light">THE DAY SO FAR</span>
        </span>
        <span className="clock-time" ref={clockRef}>
          21:10
        </span>
      </div>

      <div className="zeno" ref={zenoBoxRef}>
        {bubble ? (
          <div className="bubble" role="status">
            {bubble}
          </div>
        ) : null}
        {flat ? <ZenoFallback pose={pose} dir={dir} /> : <canvas ref={zenoCanvasRef} aria-hidden="true" />}
        {pose === "nap" ? (
          <svg className="zz" aria-hidden="true" viewBox="0 0 60 60" width="60" height="60">
            <text x="6" y="44" fontFamily="var(--font-serif)" fontSize="26" fill="var(--ink)">
              z
            </text>
            <text x="24" y="26" fontFamily="var(--font-serif)" fontSize="18" fill="var(--ink)">
              z
            </text>
          </svg>
        ) : null}
        <button type="button" className="hi" aria-label="Zeno the snow monkey. Say hello." onClick={onHello} />
      </div>
    </>
  );
}
