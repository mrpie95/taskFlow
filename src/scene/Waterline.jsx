// Richer water surface: the crisp highlight band we had, a soft sheen of
// sunlit water just beneath, and a handful of foam specks that pulse at
// different cadences so the surface feels alive and touchable.
const FOAM = [
  { left: 8,  delay: 0,   dur: 4.6 },
  { left: 18, delay: 1.3, dur: 5.2 },
  { left: 29, delay: 2.4, dur: 4.8 },
  { left: 42, delay: 0.8, dur: 5.6 },
  { left: 55, delay: 3.2, dur: 4.4 },
  { left: 67, delay: 1.8, dur: 5.8 },
  { left: 79, delay: 2.9, dur: 5.0 },
  { left: 90, delay: 0.4, dur: 4.7 },
];

const SPECULAR = [
  { left: 14, top: 0.4, width: 28, delay: 0.6, dur: 7 },
  { left: 34, top: 0.9, width: 40, delay: 2.1, dur: 8 },
  { left: 52, top: 0.3, width: 24, delay: 1.1, dur: 6.5 },
  { left: 71, top: 0.7, width: 34, delay: 3.4, dur: 7.5 },
  { left: 86, top: 1.1, width: 22, delay: 0.9, dur: 6.8 },
];

export function Waterline() {
  return (
    <>
      {/* Soft sunlit sheen fading from the waterline into the shallows */}
      <div className="waterline-sheen" aria-hidden="true" />

      {/* The crisp highlight band at the surface itself */}
      <div className="waterline" aria-hidden="true" />

      {/* Long specular streaks — catch of sunlight on tiny ripples */}
      <div className="waterline-specular" aria-hidden="true">
        {SPECULAR.map((s, i) => (
          <div
            key={i}
            className="specular"
            style={{
              left: `${s.left}%`,
              top: `${s.top}vh`,
              width: `${s.width}px`,
              animationDuration: `${s.dur}s`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Foam pinpricks along the waterline */}
      <div className="waterline-foam" aria-hidden="true">
        {FOAM.map((f, i) => (
          <div
            key={i}
            className="foam"
            style={{
              left: `${f.left}%`,
              animationDuration: `${f.dur}s`,
              animationDelay: `${f.delay}s`,
            }}
          />
        ))}
      </div>
    </>
  );
}
