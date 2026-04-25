import { useEffect, useMemo, useRef } from "react";
import { WATER_TOP_VH, WATER_RANGE_VH } from "../lib/geometry.js";

// Slow-pulsing glowing dots in the deeper half of the water. When a card moves
// near them (drag / drop / ascent / float-away) they're pushed out of the way,
// then drift back home. When nothing's moving, the rAF loop stops entirely —
// no per-frame work, no fans.

const COUNT = 36;
const ACTIVE_SELECTOR =
  ".task.dragging, .task.dropping, .task.ascending, .task.floating-away";
const INFLUENCE_PX = 140;   // range a card disturbs dots within
const MAX_PUSH_PX = 42;     // how far a dot can be shoved at close range
const SMOOTH = 0.14;        // easing factor toward target each frame
const SETTLE_EPS = 0.3;     // px — below this we call it settled

export function Bioluminescence() {
  const dots = useMemo(() => {
    const out = [];
    for (let i = 0; i < COUNT; i++) {
      // Concentrated toward the floor — bioluminescence belongs in the dark.
      const depthBias = 0.45 + Math.random() * 0.5;
      const cool = Math.random() < 0.22;
      const color = cool ? "#C2E5FF" : "#FFEDB0";
      out.push({
        id: i,
        top: WATER_TOP_VH + depthBias * WATER_RANGE_VH,
        left: Math.random() * 100,
        size: 1.8 + Math.random() * 2.4,
        duration: 6 + Math.random() * 10,
        delay: -Math.random() * 12,
        color,
      });
    }
    return out;
  }, []);

  // State per dot we carry across frames.
  const runtime = useRef(
    dots.map(() => ({ el: null, curDx: 0, curDy: 0 }))
  );

  useEffect(() => {
    let rafId = null;
    const state = runtime.current;

    function tick() {
      rafId = null;
      const cards = document.querySelectorAll(ACTIVE_SELECTOR);
      const hasCards = cards.length > 0;

      // Read each active card's center in viewport px.
      const cardCenters = [];
      if (hasCards) {
        for (const el of cards) {
          const r = el.getBoundingClientRect();
          cardCenters.push({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
        }
      }

      // Convert each dot's home (left% / top vh) to viewport px each frame —
      // cheap, and handles scroll without any extra listener.
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const sy = window.scrollY;

      let anyMoving = false;

      for (let i = 0; i < state.length; i++) {
        const s = state[i];
        if (!s.el) continue;
        const dot = dots[i];
        const homeX = (dot.left / 100) * vw;
        const homeY = (dot.top / 100) * vh - sy;

        // Sum repulsion from every active card.
        let tx = 0;
        let ty = 0;
        for (const c of cardCenters) {
          const ddx = homeX + s.curDx - c.x;
          const ddy = homeY + s.curDy - c.y;
          const dist = Math.hypot(ddx, ddy);
          if (dist < INFLUENCE_PX && dist > 0.5) {
            const falloff = (INFLUENCE_PX - dist) / INFLUENCE_PX;
            const strength = falloff * falloff * MAX_PUSH_PX;
            tx += (ddx / dist) * strength;
            ty += (ddy / dist) * strength;
          }
        }

        // Ease toward target (when no cards, target is 0 → drift home).
        s.curDx += (tx - s.curDx) * SMOOTH;
        s.curDy += (ty - s.curDy) * SMOOTH;

        const mag = Math.hypot(s.curDx, s.curDy);
        if (mag < SETTLE_EPS && tx === 0 && ty === 0) {
          // Snap to zero and stop tracking this dot.
          s.curDx = 0;
          s.curDy = 0;
          s.el.style.removeProperty("--dx");
          s.el.style.removeProperty("--dy");
        } else {
          anyMoving = true;
          s.el.style.setProperty("--dx", `${s.curDx.toFixed(2)}px`);
          s.el.style.setProperty("--dy", `${s.curDy.toFixed(2)}px`);
        }
      }

      // Only keep the loop alive if something is still moving or cards are
      // active. Otherwise stop — the MutationObserver below wakes us back up.
      if (anyMoving || hasCards) {
        rafId = requestAnimationFrame(tick);
      }
    }

    function wake() {
      if (rafId == null) rafId = requestAnimationFrame(tick);
    }

    // Kick the loop whenever a card's class list changes — drag/drop/etc.
    // trigger class changes on the .task element.
    const tasksEl = document.querySelector(".tasks");
    const observer = new MutationObserver(wake);
    if (tasksEl) {
      observer.observe(tasksEl, {
        attributes: true,
        attributeFilter: ["class"],
        subtree: true,
      });
    }

    // Also wake on scroll — home positions shift, some dots may need nudging
    // if a card happens to be dragging. No-op otherwise.
    window.addEventListener("scroll", wake, { passive: true });

    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener("scroll", wake);
    };
  }, [dots]);

  return (
    <div className="biolum" aria-hidden="true">
      {dots.map((d, i) => (
        <div
          key={d.id}
          ref={(el) => {
            runtime.current[i].el = el;
          }}
          className="biolum-dot"
          style={{
            top: `${d.top}vh`,
            left: `${d.left}%`,
            width: `${d.size}px`,
            height: `${d.size}px`,
            background: d.color,
            boxShadow: `0 0 ${Math.round(d.size * 6)}px 2px ${d.color}`,
            animationDuration: `${d.duration}s`,
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
