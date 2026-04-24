import { useMemo } from "react";

const PARTICLE_COUNT = 34;
const DRIFTS = ["drift-a", "drift-b", "drift-c"];

export function Particles() {
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const surfaceBias = Math.random() * Math.random(); // thinner with depth
      arr.push({
        id: i,
        top: 10 + surfaceBias * 285,
        left: Math.random() * 100,
        size: 1.5 + Math.random() * 2.5,
        opacity: 0.3 + Math.random() * 0.35,
        drift: DRIFTS[i % DRIFTS.length],
        duration: 7 + Math.random() * 7,
        delay: -Math.random() * 10,
      });
    }
    return arr;
  }, []);

  return (
    <div className="particles">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            top: `${p.top}vh`,
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            animation: `${p.drift} ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
