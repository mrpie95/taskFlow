// Dark-silhouette seafloor: rolling ridge in two depths, a few boulders and
// pebbles. No animation — calm when untouched.
export function Seabed() {
  return (
    <div className="seabed" aria-hidden="true">
      <svg viewBox="0 0 1200 180" preserveAspectRatio="none">
        <path
          d="M 0 70 Q 120 52, 240 66 T 480 62 T 720 72 T 960 58 T 1200 68 L 1200 180 L 0 180 Z"
          fill="#021D3A"
        />
        <path
          d="M 0 108 Q 200 86, 400 102 T 800 96 T 1200 104 L 1200 180 L 0 180 Z"
          fill="#010F22"
        />

        {/* Boulder cluster — left */}
        <ellipse cx="180" cy="94" rx="54" ry="24" fill="#020B1A" />
        <ellipse cx="140" cy="86" rx="30" ry="16" fill="#020B1A" />
        <ellipse cx="220" cy="88" rx="22" ry="13" fill="#030E20" />

        {/* Pebbles scattered across the mid-floor */}
        <ellipse cx="400" cy="116" rx="11" ry="4" fill="#010B1A" />
        <ellipse cx="470" cy="118" rx="15" ry="5" fill="#010B1A" />
        <ellipse cx="910" cy="118" rx="19" ry="6" fill="#010B1A" />
        <ellipse cx="1060" cy="120" rx="10" ry="4" fill="#010B1A" />
        <ellipse cx="1140" cy="122" rx="8" ry="3" fill="#010B1A" />

        {/* Smaller boulder cluster — right of center */}
        <ellipse cx="760" cy="92" rx="40" ry="18" fill="#020B1A" />
        <ellipse cx="730" cy="86" rx="18" ry="10" fill="#030E20" />
      </svg>
    </div>
  );
}
