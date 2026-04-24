export function Noise() {
  return (
    <svg className="noise" xmlns="http://www.w3.org/2000/svg">
      <filter id="waterNoise">
        <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" />
        <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.8 -0.3" />
      </filter>
      <rect width="100%" height="100%" filter="url(#waterNoise)" />
    </svg>
  );
}
