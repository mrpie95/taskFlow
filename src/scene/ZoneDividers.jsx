import { WATER_TOP_VH, WATER_RANGE_VH } from "../lib/geometry.js";

// Thin horizontal lines at the surface/middle and middle/floor transitions,
// so the three zones read as discrete sections even though the water gradient
// is continuous.
// Surface is now a narrow band at the top — reserved for the one or two
// things you're actively doing. Most tasks live in the larger middle band.
const BOUNDARIES = [
  { y: 0.2 },  // surface → middle
  { y: 0.6 },  // middle → floor
];

export function ZoneDividers() {
  return (
    <>
      {BOUNDARIES.map((b) => (
        <div
          key={b.y}
          className="zone-divider"
          style={{ top: `${WATER_TOP_VH + b.y * WATER_RANGE_VH}vh` }}
          aria-hidden="true"
        />
      ))}
    </>
  );
}
