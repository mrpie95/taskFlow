import { WATER_TOP_VH, WATER_RANGE_VH } from "../lib/geometry.js";

// Small right-edge labels that make the three depth zones meaningful:
//   - Surface  = what you're doing now
//   - Middle   = what you could do soon
//   - Floor    = set down / not in your head right now
const ZONES = [
  { label: "doing now", y: 0.08 },  // narrow surface band
  { label: "when you can", y: 0.4 }, // wide middle — default home for new tasks
  { label: "at rest", y: 0.8 },
];

export function ZoneLabels() {
  return (
    <div className="zone-labels" aria-hidden="true">
      {ZONES.map((z) => (
        <div
          key={z.label}
          className="zone-label"
          style={{ top: `${WATER_TOP_VH + z.y * WATER_RANGE_VH}vh` }}
        >
          {z.label}
        </div>
      ))}
    </div>
  );
}
