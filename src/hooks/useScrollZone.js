import { useEffect, useState } from "react";

// Tracks which zone — surface / middle / floor — the viewport is currently in.
export function useScrollZone() {
  const [zone, setZone] = useState("surface");

  useEffect(() => {
    function update() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? window.scrollY / max : 0;
      setZone(pct < 0.33 ? "surface" : pct < 0.66 ? "middle" : "floor");
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return zone;
}
