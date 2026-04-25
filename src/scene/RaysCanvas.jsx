import { useEffect, useRef } from "react";

// God rays as canvas-rendered trapezoids, fanning down-left from the sun
// position. Each ray has its own pulse cycle (opacity sine wave) and lateral
// sway (horizontal sine wave) so the scene never ticks in unison. Screen
// blend mode on the canvas element lets the rays add light to the water
// behind them rather than overlay.

const RAYS_HEIGHT_VH = 62;

// Geometry — top/bottom positions in % of viewport width, plus per-ray
// strength + timing. Easy to tweak; easy to add or remove rays.
const RAYS = [
  { topXPct: 88, topWPct: 4, botXPct: 50, botWPct: 5, strength: 0.55,
    pulseDur: 7.0, pulsePhase: 0.0,  swayDur: 13.0, swayAmpPx: 12, swayPhase: 0.0 },
  { topXPct: 80, topWPct: 5, botXPct: 36, botWPct: 5, strength: 0.65,
    pulseDur: 7.6, pulsePhase: 1.4,  swayDur: 14.7, swayAmpPx: 14, swayPhase: 2.3 },
  { topXPct: 73, topWPct: 5, botXPct: 22, botWPct: 5, strength: 0.50,
    pulseDur: 8.2, pulsePhase: 2.8,  swayDur: 16.4, swayAmpPx: 10, swayPhase: 4.6 },
  { topXPct: 67, topWPct: 5, botXPct: 8,  botWPct: 5, strength: 0.40,
    pulseDur: 8.8, pulsePhase: 4.2,  swayDur: 18.1, swayAmpPx: 16, swayPhase: 6.9 },
  { topXPct: 61, topWPct: 5, botXPct: -8, botWPct: 6, strength: 0.30,
    pulseDur: 9.4, pulsePhase: 5.6,  swayDur: 19.8, swayAmpPx: 12, swayPhase: 9.2 },
];

export function RaysCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let dpr = 1;
    let width = 0;
    let height = 0;
    let rafId = null;
    const startTime = performance.now();

    function resize() {
      dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = Math.floor((RAYS_HEIGHT_VH / 100) * window.innerHeight);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function step() {
      const t = (performance.now() - startTime) / 1000;
      ctx.clearRect(0, 0, width, height);

      for (const r of RAYS) {
        const pulse =
          (Math.sin((t / r.pulseDur) * Math.PI * 2 + r.pulsePhase) + 1) / 2; // 0..1
        const opacity = r.strength * (0.5 + 0.5 * pulse);
        const sway =
          Math.sin((t / r.swayDur) * Math.PI * 2 + r.swayPhase) * r.swayAmpPx;

        const topX = (r.topXPct / 100) * width;
        const topW = (r.topWPct / 100) * width;
        const botX = (r.botXPct / 100) * width;
        const botW = (r.botWPct / 100) * width;

        const topL = topX - topW / 2 + sway;
        const topR = topX + topW / 2 + sway;
        const botL = botX - botW / 2 + sway * 0.4; // less sway at depth
        const botR = botX + botW / 2 + sway * 0.4;

        // Vertical fade — warm light at top, transparent at depth
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0,    `rgba(255, 244, 214, ${opacity * 0.7})`);
        grad.addColorStop(0.25, `rgba(255, 232, 184, ${opacity * 0.32})`);
        grad.addColorStop(0.55, `rgba(255, 232, 184, ${opacity * 0.12})`);
        grad.addColorStop(0.85, `rgba(255, 232, 184, ${opacity * 0.02})`);
        grad.addColorStop(1,    `rgba(255, 232, 184, 0)`);

        ctx.beginPath();
        ctx.moveTo(topL, 0);
        ctx.lineTo(topR, 0);
        ctx.lineTo(botR, height);
        ctx.lineTo(botL, height);
        ctx.closePath();
        ctx.fillStyle = grad;
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

  return <canvas ref={canvasRef} className="rays-canvas" aria-hidden="true" />;
}
