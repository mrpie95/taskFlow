import { Bioluminescence } from "./Bioluminescence.jsx";
import { Clouds } from "./Clouds.jsx";
import { Island } from "./Island.jsx";
import { IslandBase } from "./IslandBase.jsx";
import { Noise } from "./Noise.jsx";
import { ParticleField } from "./ParticleField.jsx";
import { RaysCanvas } from "./RaysCanvas.jsx";
import { Seabed } from "./Seabed.jsx";
import { Waterline } from "./Waterline.jsx";
import { Waves } from "./Waves.jsx";
import { ZoneDividers } from "./ZoneDividers.jsx";
import { ZoneLabels } from "./ZoneLabels.jsx";

// The full ambient scene: sky + water + all background texture layers.
// `showCssWaterline` turns the static highlight/foam/specular treatment off
// when the canvas water prototype is running (so they don't fight).
export function Scene({ onSkyClick, showCssWaterline = true }) {
  return (
    <>
      <div
        className="sky"
        onClick={onSkyClick}
        role="button"
        aria-label="Click to drop a new task"
      >
        <div className="sun">
          <div className="sun-half" />
        </div>
        <Clouds />
        <Island />
      </div>

      <div className="water">
        <div className="swell" />
        <div className="shimmer shimmer-a" />
        <div className="shimmer shimmer-b" />
        <Noise />
        <Seabed />
      </div>

      {/* Submerged part of the island — sits below the waterline, visible
          through the water surface when troughs pass overhead. */}
      <IslandBase />

      {showCssWaterline && <Waterline />}
      {showCssWaterline && <Waves />}
      <RaysCanvas />
      <ParticleField />
      <Bioluminescence />
      <ZoneDividers />
      <ZoneLabels />
    </>
  );
}
