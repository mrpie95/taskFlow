import { WATERLINE_VH } from "../lib/geometry.js";

// Two concentric ripple rings + five droplets arcing upward and falling.
// Positioned at the waterline; leftPct is the x-center.
const DROPS = [
  { dx: -24, dy1: -26, delay: 0 },
  { dx: 18, dy1: -32, delay: 30 },
  { dx: -8, dy1: -36, delay: 60 },
  { dx: 30, dy1: -22, delay: 20 },
  { dx: -32, dy1: -18, delay: 80 },
];

export function Splash({ leftPct }) {
  return (
    <div className="splash-group" style={{ left: `${leftPct}%`, top: `${WATERLINE_VH}vh` }}>
      <div className="splash-ring ring-1" />
      <div className="splash-ring ring-2" />
      {DROPS.map((d, i) => (
        <div
          key={i}
          className="splash-drop"
          style={{
            "--dx": `${d.dx}px`,
            "--dy1": `${d.dy1}px`,
            animationDelay: `${d.delay}ms`,
          }}
        />
      ))}
    </div>
  );
}
