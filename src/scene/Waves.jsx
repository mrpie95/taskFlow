export function Waves() {
  return (
    <div className="waves">
      <svg className="wave wave-top" viewBox="0 0 1200 56" preserveAspectRatio="none">
        <path
          d="M0 26 Q 100 2, 200 26 T 400 26 T 600 26 T 800 26 T 1000 26 T 1200 26 L1200 56 L0 56 Z"
          fill="#9CC3ED"
          opacity="0.95"
        />
      </svg>
      <svg className="wave wave-under" viewBox="0 0 1200 56" preserveAspectRatio="none">
        <path
          d="M0 32 Q 150 8, 300 32 T 600 32 T 900 32 T 1200 32 L1200 56 L0 56 Z"
          fill="#85B7EB"
        />
      </svg>
    </div>
  );
}
