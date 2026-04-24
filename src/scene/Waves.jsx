// Two thin stroked crest lines drifting in opposite directions at the waterline.
// Low amplitude, calm cadence — the water surface reads as alive without peaks
// tall enough to obscure anything. The viewBox is 1200 × 18 and each crest has
// a 300-unit period, so both animations travel 2 full cycles per loop (50% of
// wave width) and seam perfectly.
export function Waves() {
  return (
    <div className="waves">
      <svg
        className="wave wave-top"
        viewBox="0 0 1200 18"
        preserveAspectRatio="none"
      >
        <path
          d="M 0 9 Q 150 5, 300 9 T 600 9 T 900 9 T 1200 9"
          stroke="#DCEAF5"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <svg
        className="wave wave-under"
        viewBox="0 0 1200 18"
        preserveAspectRatio="none"
      >
        <path
          d="M 0 12 Q 150 9, 300 12 T 600 12 T 900 12 T 1200 12"
          stroke="#6FA5DE"
          strokeWidth="1"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
