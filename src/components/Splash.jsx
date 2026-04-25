import { WATERLINE_VH } from "../lib/geometry.js";

// Two concentric ripple rings + five droplets arcing upward and falling.
// `widthPx` sets the ring's max diameter (passed from the card that caused it).
const DROPS = [
  { dx: -0.18, dy1: -0.22, delay: 0 },
  { dx: 0.14, dy1: -0.26, delay: 30 },
  { dx: -0.06, dy1: -0.3, delay: 60 },
  { dx: 0.22, dy1: -0.18, delay: 20 },
  { dx: -0.24, dy1: -0.15, delay: 80 },
];

export function Splash({ leftPct, widthPx = 160 }) {
  return (
    <div
      className="splash-group"
      style={{
        left: `${leftPct}%`,
        top: `${WATERLINE_VH}vh`,
        "--splash-w": `${widthPx}px`,
      }}
    >
      {DROPS.map((d, i) => (
        <div
          key={i}
          className="splash-drop"
          style={{
            "--dx": `${Math.round(d.dx * widthPx)}px`,
            "--dy1": `${Math.round(d.dy1 * widthPx)}px`,
            animationDelay: `${d.delay}ms`,
          }}
        />
      ))}
    </div>
  );
}
