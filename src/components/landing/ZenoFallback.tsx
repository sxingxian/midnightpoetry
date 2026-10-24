import type { Pose } from "./zeno3d";

/** Flat Zeno from the mascot sheet (no towel), used when WebGL isn't available. */
export function ZenoFallback({ pose, dir }: { pose: Pose; dir: number }) {
  const cls = pose === "run" ? "zr-run" : pose === "wave" ? "zr-wave" : "zr-sit";
  return (
    <span style={{ position: "absolute", left: 35, bottom: 8, display: "block", transform: `scaleX(${dir})` }}>
      <svg className={cls} viewBox="24 6 172 240" width="80" height="112" aria-hidden="true">
        <g className="zr-bob">
          <path d="M150 206 C192 206 198 166 178 156 C168 152 162 162 170 168" stroke="#C7BCAD" strokeWidth="10" fill="none" strokeLinecap="round" />
          <ellipse className="zr-fl" cx="80" cy="224" rx="20" ry="10" fill="#C7BCAD" />
          <ellipse className="zr-fr" cx="140" cy="224" rx="20" ry="10" fill="#C7BCAD" />
          <ellipse cx="110" cy="182" rx="52" ry="46" fill="#DCD3C6" />
          <ellipse cx="110" cy="190" rx="32" ry="30" fill="#E9E2D7" />
          <g className="zr-al">
            <path d="M74 150 L80 190" stroke="#DCD3C6" strokeWidth="13" strokeLinecap="round" />
            <ellipse cx="81" cy="194" rx="9" ry="7" fill="#E9B8B0" />
          </g>
          <g className="zr-ar">
            <path d="M146 150 L140 190" stroke="#DCD3C6" strokeWidth="13" strokeLinecap="round" />
            <ellipse cx="139" cy="194" rx="9" ry="7" fill="#E9B8B0" />
          </g>
          <g transform="translate(35 14) scale(0.75)">
            <circle cx="44" cy="104" r="17" fill="#C7BCAD" />
            <circle cx="44" cy="104" r="9" fill="#EDB3AC" />
            <circle cx="156" cy="104" r="17" fill="#C7BCAD" />
            <circle cx="156" cy="104" r="9" fill="#EDB3AC" />
            <path d="M100 40 C140 40 160 70 160 104 C160 142 134 166 100 166 C66 166 40 142 40 104 C40 70 60 40 100 40 Z" fill="#DCD3C6" />
            <path d="M100 82 C88 68 62 72 64 98 C66 126 82 150 100 152 C118 150 134 126 136 98 C138 72 112 68 100 82 Z" fill="#F0C1B9" />
            {pose === "nap" ? (
              <path d="M78 104 Q87 111 96 104 M104 104 Q113 111 122 104" stroke="#2A2A30" strokeWidth="3.6" fill="none" strokeLinecap="round" />
            ) : (
              <g>
                <circle cx="86" cy="104" r="6" fill="#2A2A30" />
                <circle cx="114" cy="104" r="6" fill="#2A2A30" />
                <circle cx="88" cy="102" r="1.8" fill="#FFFFFF" />
                <circle cx="116" cy="102" r="1.8" fill="#FFFFFF" />
              </g>
            )}
            <path d="M88 128 Q100 140 112 128" stroke="#9A6660" strokeWidth="2.6" fill="#E9A49C" strokeLinecap="round" />
          </g>
        </g>
      </svg>
    </span>
  );
}
