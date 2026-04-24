// Geometric stratified floor — a few angular planes stacked front-to-back,
// each a slightly darker shade than the one behind it. No rocks, no clutter.
// Reads as a terraced ocean floor receding into distance.
export function Seabed() {
  return (
    <div className="seabed" aria-hidden="true">
      <svg viewBox="0 0 1200 180" preserveAspectRatio="none">
        {/* Back plane — most distant, a gentle rise to the right */}
        <path
          d="M 0 22 L 1200 40 L 1200 180 L 0 180 Z"
          fill="#032B4F"
        />

        {/* Mid-back terrace */}
        <path
          d="M 0 66 L 1200 52 L 1200 180 L 0 180 Z"
          fill="#021E3D"
        />

        {/* Mid-front terrace */}
        <path
          d="M 0 104 L 1200 116 L 1200 180 L 0 180 Z"
          fill="#01142A"
        />

        {/* Front ridge — closest, darkest */}
        <path
          d="M 0 148 L 1200 140 L 1200 180 L 0 180 Z"
          fill="#010B1C"
        />
      </svg>
    </div>
  );
}
