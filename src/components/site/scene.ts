/**
 * The landing page's 2D / 3D scene choice. Stored like the theme: an attribute on
 * <html> (set before paint by the layout script), localStorage, and an "mp-scene"
 * event so the header toggle and the sky stay in step.
 *   data-scene="2d" | "3d"   — the visitor's choice (default 3D; 2D if they prefer reduced motion)
 *   data-webgl="off"         — this device can't do 3D, so 2D is used and the 3D button is disabled
 */
export type Scene = "2d" | "3d";

export const SCENE_EVENT = "mp-scene";

export function readScene(): Scene {
  return document.documentElement.getAttribute("data-scene") === "2d" ? "2d" : "3d";
}

export function webglOff(): boolean {
  return document.documentElement.getAttribute("data-webgl") === "off";
}

export function chooseScene(scene: Scene) {
  document.documentElement.setAttribute("data-scene", scene);
  try {
    localStorage.setItem("mp-scene", scene);
  } catch {
    /* private mode: the choice just won't persist */
  }
  window.dispatchEvent(new Event(SCENE_EVENT));
}

/** Marks the device as unable to show 3D (no WebGL, or the context failed). Not stored: it's re-checked each visit. */
export function markWebglOff() {
  if (webglOff()) return;
  document.documentElement.setAttribute("data-webgl", "off");
  window.dispatchEvent(new Event(SCENE_EVENT));
}

/** A cheap check before downloading three.js. */
export function hasWebgl(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") ?? c.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}
