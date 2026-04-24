// Static cloud layout — animation is done in CSS (cloudDrift).
const CLOUDS = [
  { top: 5, left: 8, width: 110, opacity: 0.7, delay: 0 },
  { top: 8, left: 14, width: 70, opacity: 0.55, delay: 2 },
  { top: 4, left: 38, width: 130, opacity: 0.65, delay: 3 },
  { top: 10, left: 52, width: 85, opacity: 0.5, delay: 1.5 },
  { top: 7, left: 74, width: 95, opacity: 0.6, delay: 4 },
  { top: 11, left: 82, width: 60, opacity: 0.5, delay: 2.5 },
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
            opacity: c.opacity,
            animationDelay: `${c.delay}s`,
          }}
        />
      ))}
    </>
  );
}
