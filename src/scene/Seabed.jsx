// Geometric stratified floor — rock strata stacked front-to-back. Each layer
// has a thin highlight edge on top so the strata read as solid rock with
// layered sediment rather than soft gradient planes. Darker palette overall.
export function Seabed() {
  return (
    <div className="seabed" aria-hidden="true">
      <svg viewBox="0 0 1200 180" preserveAspectRatio="none">
        {/* Back plane */}
        <path
          d="M 0 20 L 1200 36 L 1200 180 L 0 180 Z"
          fill="#05182A"
        />
        <path
          d="M 0 20 L 1200 36 L 1200 38 L 0 22 Z"
          fill="#0B2A44"
        />

        {/* Mid-back terrace */}
        <path
          d="M 0 62 L 1200 48 L 1200 180 L 0 180 Z"
          fill="#030F1D"
        />
        <path
          d="M 0 62 L 1200 48 L 1200 50 L 0 64 Z"
          fill="#082035"
        />

        {/* Mid-front terrace */}
        <path
          d="M 0 104 L 1200 118 L 1200 180 L 0 180 Z"
          fill="#020914"
        />
        <path
          d="M 0 104 L 1200 118 L 1200 120 L 0 106 Z"
          fill="#06182A"
        />

        {/* Front ridge — closest, darkest */}
        <path
          d="M 0 148 L 1200 138 L 1200 180 L 0 180 Z"
          fill="#01060D"
        />
        <path
          d="M 0 148 L 1200 138 L 1200 140 L 0 150 Z"
          fill="#041220"
        />
      </svg>
    </div>
  );
}
