// Distant horizon island in the div-composition style — flat shapes with
// shadow halves, subtle Kurzgesagt-flavor gradients. Sits above the
// waterline; the submerged continuation lives in <IslandBase />.

const PALMS = [
  { left: 22, bottom: 11, scale: 1.0 },
  { left: 56, bottom: 14, scale: 0.78 },
  { left: 94, bottom: 9, scale: 1.12 },
];

export function Island() {
  return (
    <div className="island" aria-hidden="true">
      <div className="isl-hill-back" />
      <div className="isl-hill-back-shadow" />
      <div className="isl-hill-front" />
      <div className="isl-hill-front-shadow" />
      <div className="isl-sand" />
      <div className="isl-sand-shadow" />
      {PALMS.map((p, i) => (
        <Palm key={i} left={p.left} bottom={p.bottom} scale={p.scale} />
      ))}
    </div>
  );
}

function Palm({ left, bottom, scale }) {
  return (
    <div
      className="isl-palm"
      style={{
        left: `${left}px`,
        bottom: `${bottom}px`,
        transform: `scale(${scale})`,
        transformOrigin: "bottom center",
      }}
    >
      <div className="isl-trunk" />
      <div className="isl-leaf isl-leaf-1" />
      <div className="isl-leaf isl-leaf-2" />
      <div className="isl-leaf isl-leaf-3" />
      <div className="isl-leaf isl-leaf-4" />
      <div className="isl-leaf isl-leaf-5" />
    </div>
  );
}
