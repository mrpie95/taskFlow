const ZONES = ["surface", "middle", "floor"];

export function DepthIndicator({ zone }) {
  const deep = zone === "floor";
  return (
    <div className={`depth-indicator ${deep ? "deep" : ""}`} aria-hidden="true">
      {ZONES.map((z) => (
        <div
          key={z}
          className={`depth-dot ${zone === z ? "active" : ""}`}
          title={z}
        />
      ))}
    </div>
  );
}
