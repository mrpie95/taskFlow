import { useEffect, useRef } from "react";

// Canvas-driven dust particles. Each one has a position, a velocity, and a
// "home" point it's loosely tethered to. Brownian-ish nudges each frame keep
// the motion non-repeating; horizontal wrap lets currents drift freely. Built
// as canvas (not CSS) so we can later have particles react to splashes, card
// movements, currents, etc. without rewiring DOM.

const COUNT = 90;
const HOME_TETHER = 0.0006;   // pull back toward home — keeps clusters loose
const DRIFT_NOISE = 0.04;     // random impulse magnitude per frame
const DAMPING = 0.985;
const WRAP_PADDING = 30;

export function ParticleField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let dpr = 1;
    let width = 0;
    let height = 0;
    let particles = [];
    let rafId = null;

    function resize() {
      dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      // Cover the full scene height (185vh) so particles drift across all zones.
      height = Math.floor(1.85 * window.innerHeight);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function seed() {
      particles = [];
      for (let i = 0; i < COUNT; i++) {
        const x = Math.random() * width;
        // Distribute through the water column (skip the top 11vh = sky).
        const y = (0.11 + Math.random() * 0.85) * height;
        particles.push({
          x,
          y,
          homeX: x,
          homeY: y,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.18,
          size: 1.3 + Math.random() * 2.6,
          opacity: 0.25 + Math.random() * 0.45,
          // Slow per-particle drift bias so each has its own "current direction".
          biasX: (Math.random() - 0.5) * 0.018,
          biasY: (Math.random() - 0.5) * 0.012,
        });
      }
    }

    function step() {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        // Brownian impulse + per-particle bias
        p.vx += (Math.random() - 0.5) * DRIFT_NOISE + p.biasX;
        p.vy += (Math.random() - 0.5) * DRIFT_NOISE * 0.7 + p.biasY;

        // Tether pulls weakly toward home so particles stay roughly where seeded
        p.vx -= (p.x - p.homeX) * HOME_TETHER;
        p.vy -= (p.y - p.homeY) * HOME_TETHER;

        // Damping
        p.vx *= DAMPING;
        p.vy *= DAMPING;

        // Integrate
        p.x += p.vx;
        p.y += p.vy;

        // Horizontal wrap (currents that drift off the side reappear)
        if (p.x < -WRAP_PADDING) {
          p.x = width + WRAP_PADDING;
          p.homeX = p.x;
        } else if (p.x > width + WRAP_PADDING) {
          p.x = -WRAP_PADDING;
          p.homeX = p.x;
        }

        // Draw — soft white dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        ctx.fill();
      }

      rafId = requestAnimationFrame(step);
    }

    resize();
    rafId = requestAnimationFrame(step);
    window.addEventListener("resize", resize);

    function onVis() {
      if (document.hidden) {
        if (rafId != null) cancelAnimationFrame(rafId);
        rafId = null;
      } else if (rafId == null) {
        rafId = requestAnimationFrame(step);
      }
    }
    document.addEventListener("visibilitychange", onVis);

    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={canvasRef} className="particle-field" aria-hidden="true" />;
}
