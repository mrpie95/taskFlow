import { useMemo } from "react";
import { WATER_TOP_VH, WATER_RANGE_VH } from "../lib/geometry.js";

// Tiny glowing dots scattered through the deeper half of the water. Each pulses
// on its own long cycle — think deep-sea plankton lighting up. Mostly warm
// amber; a handful are cool blue for variety.
const COUNT = 22;

export function Bioluminescence() {
  const dots = useMemo(() => {
    const out = [];
    for (let i = 0; i < COUNT; i++) {
      // Depth-biased: heavier concentration in lower half of water.
      const depthBias = 0.5 + Math.random() * 0.48;
      const cool = Math.random() < 0.18;
      const color = cool ? "#B8E0FF" : "#FFE8A8";
      out.push({
        id: i,
        top: WATER_TOP_VH + depthBias * WATER_RANGE_VH,
        left: Math.random() * 100,
        size: 1.4 + Math.random() * 1.8,
        duration: 7 + Math.random() * 9, // 7–16s slow pulse
        delay: -Math.random() * 12,
        color,
      });
    }
    return out;
  }, []);

  return (
    <div className="biolum" aria-hidden="true">
      {dots.map((d) => (
        <div
          key={d.id}
          className="biolum-dot"
          style={{
            top: `${d.top}vh`,
            left: `${d.left}%`,
            width: `${d.size}px`,
            height: `${d.size}px`,
            background: d.color,
            boxShadow: `0 0 ${Math.round(d.size * 4)}px 1px ${d.color}`,
            animation: `biolumPulse ${d.duration}s ease-in-out ${d.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
