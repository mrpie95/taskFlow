import { Bioluminescence } from "./Bioluminescence.jsx";
import { Clouds } from "./Clouds.jsx";
import { Noise } from "./Noise.jsx";
import { Particles } from "./Particles.jsx";
import { Rays } from "./Rays.jsx";
import { Seabed } from "./Seabed.jsx";
import { Waves } from "./Waves.jsx";
import { ZoneDividers } from "./ZoneDividers.jsx";
import { ZoneLabels } from "./ZoneLabels.jsx";

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
      <Bioluminescence />
      <ZoneDividers />
      <ZoneLabels />
    </>
  );
}
