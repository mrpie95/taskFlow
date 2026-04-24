// Each ray is a trapezoid fanning down-left from the sun. `strength` is a base
// opacity multiplied by the pulse animation. Timing is set inline so every ray
// cycles on a unique rhythm (nothing ever ticks in sync).
const RAYS = [
  { x1: 88, x2: 55, x3: 50, x4: 84, strength: 0.55 },
  { x1: 82, x2: 40, x3: 35, x4: 78, strength: 0.65 },
  { x1: 75, x2: 25, x3: 20, x4: 72, strength: 0.5 },
  { x1: 70, x2: 10, x3: 6, x4: 68, strength: 0.4 },
  { x1: 64, x2: -5, x3: -10, x4: 62, strength: 0.3 },
];

export function Rays() {
  return (
    <svg className="rays" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id="rayGrad" x1="0.5" x2="0.5" y1="0" y2="1">
          <stop offset="0" stopColor="#FFF4D6" stopOpacity="0.7" />
          <stop offset="0.25" stopColor="#FFE8B8" stopOpacity="0.32" />
          <stop offset="0.55" stopColor="#FFE8B8" stopOpacity="0.12" />
          <stop offset="0.85" stopColor="#FFE8B8" stopOpacity="0.02" />
          <stop offset="1" stopColor="#FFE8B8" stopOpacity="0" />
        </linearGradient>
      </defs>
      {RAYS.map((r, i) => {
        const pulseDur = 7 + i * 0.6;
        const swayDur = 13 + i * 1.7;
        const pulseDelay = -i * 1.4;
        const swayDelay = -i * 2.3;
        return (
          <g key={i} opacity={r.strength}>
            <polygon
              className="ray"
              points={`${r.x1},0 ${r.x4},0 ${r.x3},95 ${r.x2},95`}
              fill="url(#rayGrad)"
              style={{
                animation: `rayPulse ${pulseDur}s ease-in-out ${pulseDelay}s infinite, raySway ${swayDur}s ease-in-out ${swayDelay}s infinite`,
              }}
            />
          </g>
        );
      })}
    </svg>
  );
}
