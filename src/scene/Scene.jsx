import { WATER_TOP_VH, WATER_RANGE_VH } from "../lib/geometry.js";
import { Clouds } from "./Clouds.jsx";
import { Noise } from "./Noise.jsx";
import { Particles } from "./Particles.jsx";
import { Rays } from "./Rays.jsx";
import { Seabed } from "./Seabed.jsx";
import { Waves } from "./Waves.jsx";

// The full ambient scene: sky + water + all background texture layers.
// Click handling is delegated up so the parent can run its own create flow.
export function Scene({ onSkyClick }) {
  return (
    <>
      <div
        className="sky"
        onClick={onSkyClick}
        role="button"
        aria-label="Click to drop a new task"
      >
        <div className="sun" />
        <Clouds />
      </div>

      <div className="water">
        <div className="swell" />
        <div className="shimmer shimmer-a" />
        <div className="shimmer shimmer-b" />
        <Noise />
        <Seabed />
      </div>

      <div className="waterline" aria-hidden="true" />
      <Waves />
      <Rays />
      <Particles />

      {/* "Will sink soon" boundary near the middle/floor transition */}
      <div
        className="sink-divider"
        style={{ top: `${WATER_TOP_VH + 0.7 * WATER_RANGE_VH}vh` }}
        aria-hidden="true"
      >
        <div className="line" />
        <span>∼ will sink soon ∼</span>
        <div className="line" />
      </div>
    </>
  );
}
