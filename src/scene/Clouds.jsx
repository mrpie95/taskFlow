// Pill-shaped clouds that gently fade in/out AND drift horizontally. Each has
// its own duration + delay so the sky is always out of sync with itself.
// Style borrowed from the reference: flat fill, full pill border-radius,
// opacity breathing via CSS animation.
const CLOUDS = [
  { top: 4,  left: 8,  width: 100, height: 13, fadeDur: 6,   driftDur: 6.5, delay: 0 },
  { top: 7,  left: 22, width: 60,  height: 11, fadeDur: 7.2, driftDur: 7,   delay: 2 },
  { top: 3,  left: 40, width: 120, height: 14, fadeDur: 8,   driftDur: 6.2, delay: 3 },
  { top: 9,  left: 58, width: 74,  height: 12, fadeDur: 6.8, driftDur: 7.4, delay: 1.5 },
  { top: 5,  left: 74, width: 88,  height: 13, fadeDur: 7.6, driftDur: 6.8, delay: 4 },
  { top: 11, left: 88, width: 52,  height: 10, fadeDur: 8.5, driftDur: 7.8, delay: 2.5 },
];

export function Clouds() {
  return (
    <>
      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className="cloud"
          style={{
            top: `${c.top}vh`,
            left: `${c.left}%`,
            width: `${c.width}px`,
            height: `${c.height}px`,
            animationDuration: `${c.fadeDur}s, ${c.driftDur}s`,
            animationDelay: `${c.delay}s, ${c.delay}s`,
          }}
        />
      ))}
    </>
  );
}
