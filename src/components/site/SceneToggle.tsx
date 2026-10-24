"use client";

import { useEffect, useState } from "react";
import { SCENE_EVENT, chooseScene, readScene, webglOff, type Scene } from "./scene";

/** "2D | 3D" switch for the landing page's sky and Zeno. Sits next to the theme button. */
export function SceneToggle() {
  const [scene, setScene] = useState<Scene | null>(null);
  const [no3d, setNo3d] = useState(false);

  useEffect(() => {
    const sync = () => {
      setScene(readScene());
      setNo3d(webglOff());
    };
    sync();
    window.addEventListener(SCENE_EVENT, sync);
    return () => window.removeEventListener(SCENE_EVENT, sync);
  }, []);

  const shown: Scene | null = no3d ? "2d" : scene;
  return (
    <div className="scene-toggle" role="group" aria-label="Scene">
      <button type="button" aria-pressed={shown === "2d"} onClick={() => chooseScene("2d")} title="Flat 2D scene">
        2D
      </button>
      <button
        type="button"
        aria-pressed={shown === "3d"}
        onClick={() => chooseScene("3d")}
        disabled={no3d}
        title={no3d ? "3D isn't available on this device" : "3D scene"}
        aria-describedby={no3d ? "no-3d" : undefined}
      >
        3D
      </button>
      {no3d ? (
        <span id="no-3d" className="sr-only">
          3D isn&apos;t available on this device.
        </span>
      ) : null}
    </div>
  );
}
