import { useEffect, useRef } from "react";
import { WATERLINE_VH } from "../lib/geometry.js";

// Spring-physics water surface + ballistic splash droplets. The canvas extends
// above the waterline (SKY_MARGIN_VH worth of sky) so droplets thrown up by a
// splash can fly into the air, arc under gravity, and fall back into the water.

const SPRING_SPACING = 10;
const SETTLE_EPS = 0.02;
const SKY_MARGIN_VH = 14;     // canvas extends this far above the waterline
const GRAVITY_PX = 0.42;      // droplet gravity per frame² (px)
const DROP_LIFE_DECAY = 0.008;

export function WaterCanvas({
  springK = 0.011,
  damping = 0.975,
  neighborSpread = 0.14,
  propagationPasses = 4,
  canvasHeightVh = 17,
  verticalForce = 0.35,
}) {
  const canvasRef = useRef(null);

  const kRef = useRef(springK);
  const dampRef = useRef(damping);
  const spreadRef = useRef(neighborSpread);
  const passesRef = useRef(propagationPasses);
  const heightVhRef = useRef(canvasHeightVh);
  const verticalForceRef = useRef(verticalForce);

  kRef.current = springK;
  dampRef.current = damping;
  spreadRef.current = neighborSpread;
  passesRef.current = propagationPasses;
  verticalForceRef.current = verticalForce;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let width = 0;
    let height = 0;
    let restY = 0; // y-offset of the spring's rest row inside the canvas
    let dpr = 1;
    let springs = [];
    let droplets = [];
    let rafId = null;
    let islandLeft = null;
    let islandRight = null;

    function resize() {
      dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      const waterPx = Math.floor(
        (heightVhRef.current / 100) * window.innerHeight
      );
      const skyPx = Math.floor((SKY_MARGIN_VH / 100) * window.innerHeight);
      height = waterPx + skyPx;
      restY = skyPx;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initSprings();
      updateIslandBounds();
    }

    function updateIslandBounds() {
      const el = document.querySelector(".island");
      if (el) {
        const r = el.getBoundingClientRect();
        islandLeft = r.left;
        islandRight = r.right;
      } else {
        islandLeft = islandRight = null;
      }
    }

    function initSprings() {
      const count = Math.ceil(width / SPRING_SPACING) + 2;
      const next = new Array(count);
      for (let i = 0; i < count; i++) {
        const prev = springs[i];
        next[i] = prev
          ? { x: i * SPRING_SPACING, y: prev.y, vy: prev.vy }
          : { x: i * SPRING_SPACING, y: 0, vy: 0 };
      }
      springs = next;
    }

    function impulse(screenX, force) {
      if (!springs.length) return;
      const idx = Math.max(
        1,
        Math.min(springs.length - 2, Math.round(screenX / SPRING_SPACING))
      );
      springs[idx].vy += force;
      if (springs[idx - 1]) springs[idx - 1].vy += force * 0.35;
      if (springs[idx + 1]) springs[idx + 1].vy += force * 0.35;
      wake();
    }

    // Spawn ballistic droplets at a splash. Count, spread, and initial speed
    // all scale with the splash force. Direction is biased upward — this is
    // what real water does when a body breaches the surface.
    function spawnDroplets(canvasX, force) {
      const f = Math.abs(force);
      const count = Math.max(5, Math.min(22, Math.round(f * 0.7)));
      const baseSpeed = 3 + f * 0.25;
      for (let i = 0; i < count; i++) {
        // Angles centered straight up (-π/2), fanned out up to ~60° each side
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.66;
        const speed = baseSpeed * (0.5 + Math.random() * 0.8);
        droplets.push({
          x: canvasX + (Math.random() - 0.5) * 16,
          y: restY + (Math.random() - 0.5) * 3,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 1.2 + Math.random() * 1.8,
          life: 1.0,
        });
      }
      wake();
    }

    function wake() {
      if (rafId == null) rafId = requestAnimationFrame(step);
    }

    let leftDeltas = new Float32Array(0);
    let rightDeltas = new Float32Array(0);

    function step() {
      rafId = null;
      const n = springs.length;
      if (leftDeltas.length !== n) {
        leftDeltas = new Float32Array(n);
        rightDeltas = new Float32Array(n);
      }

      const k = kRef.current;
      const damp = dampRef.current;
      const spread = spreadRef.current;
      const passes = passesRef.current;

      let anyMoving = false;

      // --- Card weight on the surface ---------------------------------
      // Cards near the waterline press down on the springs beneath them.
      // Stronger the closer the card is to the waterline, zero after
      // INFLUENCE_PX. Skips in-flight cards (drop / ascent / float / drag /
      // edit) — those carry their own physics via splash events.
      const waterlinePxCards = (WATERLINE_VH / 100) * window.innerHeight;
      const INFLUENCE_PX = 70;
      const cardEls = document.querySelectorAll(".task");
      for (const el of cardEls) {
        const cls = el.classList;
        if (
          cls.contains("dragging") ||
          cls.contains("dropping") ||
          cls.contains("ascending") ||
          cls.contains("floating-away") ||
          cls.contains("editing")
        )
          continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0) continue;
        const cardMid = rect.top + rect.height / 2;
        const distFromWater = Math.abs(cardMid - waterlinePxCards);
        if (distFromWater > INFLUENCE_PX) continue;

        const strength = (1 - distFromWater / INFLUENCE_PX) * 0.08;
        const leftIdx = Math.max(0, Math.floor(rect.left / SPRING_SPACING));
        const rightIdx = Math.min(
          springs.length - 1,
          Math.ceil(rect.right / SPRING_SPACING)
        );
        for (let i = leftIdx; i <= rightIdx; i++) {
          springs[i].vy += strength;
        }
        anyMoving = true; // keep looping while cards are pressing
      }

      // --- Spring surface ---------------------------------------------
      const hasShore = islandLeft != null && islandRight != null;
      const SHORE_FADE_PX = 60;
      for (let i = 0; i < n; i++) {
        const s = springs[i];
        let shore = 0;
        if (hasShore) {
          if (s.x >= islandLeft && s.x <= islandRight) {
            shore = 1;
          } else {
            const distL = islandLeft - s.x;
            const distR = s.x - islandRight;
            const near = Math.min(
              distL > 0 ? distL : Infinity,
              distR > 0 ? distR : Infinity
            );
            if (near < SHORE_FADE_PX) shore = 1 - near / SHORE_FADE_PX;
          }
        }
        s.vy += -k * (1 + shore * 0.6) * s.y;
        s.vy *= damp * (1 - shore * 0.03);
        s.y += s.vy;
        if (Math.abs(s.vy) > SETTLE_EPS || Math.abs(s.y) > SETTLE_EPS) {
          anyMoving = true;
        }
      }

      for (let t = 0; t < passes; t++) {
        for (let i = 0; i < n; i++) {
          if (i > 0) {
            leftDeltas[i] = spread * (springs[i].y - springs[i - 1].y);
            springs[i - 1].vy += leftDeltas[i];
          }
          if (i < n - 1) {
            rightDeltas[i] = spread * (springs[i].y - springs[i + 1].y);
            springs[i + 1].vy += rightDeltas[i];
          }
        }
        for (let i = 0; i < n; i++) {
          if (i > 0) springs[i - 1].y += leftDeltas[i];
          if (i < n - 1) springs[i + 1].y += rightDeltas[i];
        }
      }

      // --- Droplet physics --------------------------------------------
      // Integrate each droplet, cull dead ones. When a droplet falls back to
      // the current spring surface at its x, it "re-enters" the water — we
      // apply a tiny impulse to that spring (mass-conservation flavor) and
      // retire the droplet.
      const aliveDrops = [];
      for (const d of droplets) {
        d.vy += GRAVITY_PX;
        d.x += d.vx;
        d.y += d.vy;
        d.life -= DROP_LIFE_DECAY;

        // Find the local surface at this x (rest + local spring y)
        const si = Math.max(
          0,
          Math.min(springs.length - 1, Math.round(d.x / SPRING_SPACING))
        );
        const surfaceAt = restY + springs[si].y;

        if (
          d.life > 0 &&
          d.y < surfaceAt + 2 &&
          d.x > -10 &&
          d.x < width + 10
        ) {
          aliveDrops.push(d);
        } else if (d.y >= surfaceAt + 2) {
          // Re-entry: a small splash-down impulse on the spring it hit.
          const reentryForce = Math.min(3, Math.abs(d.vy) * 0.3);
          if (springs[si]) springs[si].vy += reentryForce;
        }
      }
      droplets = aliveDrops;

      // --- Draw -------------------------------------------------------
      ctx.clearRect(0, 0, width, height);

      // Trough cover — where the spring curve dips below the waterline, fill
      // the displaced air with a sky-matching color so the static bg can't
      // show through. Opaque at the waterline, fading as it deepens.
      ctx.beginPath();
      ctx.moveTo(0, restY);
      for (let i = 0; i < n; i++) {
        ctx.lineTo(springs[i].x, restY + Math.max(0, springs[i].y));
      }
      ctx.lineTo(width, restY);
      ctx.closePath();
      const troughGrad = ctx.createLinearGradient(0, restY, 0, restY + 30);
      troughGrad.addColorStop(0, "rgba(253, 228, 213, 1)");
      troughGrad.addColorStop(0.6, "rgba(253, 228, 213, 0.55)");
      troughGrad.addColorStop(1, "rgba(253, 228, 213, 0)");
      ctx.fillStyle = troughGrad;
      ctx.fill();

      // Water body — fully opaque at the top so no static bg color can leak
      // through between the wave crest and the fill. Fades out deeper so the
      // .water gradient behind it can paint proper deep-water color.
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, restY + springs[0].y);
      for (let i = 0; i < n; i++) {
        ctx.lineTo(springs[i].x, restY + springs[i].y);
      }
      ctx.lineTo(width, restY + springs[n - 1].y);
      ctx.lineTo(width, height);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, restY, 0, height);
      grad.addColorStop(0,    "rgba(156, 195, 237, 1)");   // solid, matches bg
      grad.addColorStop(0.35, "rgba(133, 183, 235, 0.55)");
      grad.addColorStop(1,    "rgba(92, 153, 215, 0)");
      ctx.fillStyle = grad;
      ctx.fill();

      // Soft white sheen following the wave curve — same gradient the CSS
      // `.waterline-sheen` used to render under the static waterline. Sits in
      // a band ~50px below the spring curve, fading to transparent.
      const SHEEN_DEPTH = 50;
      ctx.beginPath();
      ctx.moveTo(0, restY + springs[0].y);
      for (let i = 0; i < n; i++) {
        ctx.lineTo(springs[i].x, restY + springs[i].y);
      }
      ctx.lineTo(width, restY + springs[n - 1].y);
      ctx.lineTo(width, restY + springs[n - 1].y + SHEEN_DEPTH);
      for (let i = n - 1; i >= 0; i--) {
        ctx.lineTo(springs[i].x, restY + springs[i].y + SHEEN_DEPTH);
      }
      ctx.closePath();
      const sheenGrad = ctx.createLinearGradient(
        0,
        restY,
        0,
        restY + SHEEN_DEPTH
      );
      sheenGrad.addColorStop(0, "rgba(255, 255, 255, 0.42)");
      sheenGrad.addColorStop(0.22, "rgba(255, 255, 255, 0.22)");
      sheenGrad.addColorStop(0.55, "rgba(255, 255, 255, 0.08)");
      sheenGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = sheenGrad;
      ctx.fill();
      ctx.restore();

      // Surface line riding the spring curve, with the same warm-white
      // glow the old CSS `.waterline` used (box-shadow equivalent via
      // canvas shadowBlur).
      ctx.save();
      ctx.shadowColor = "rgba(255, 255, 255, 0.6)";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, restY + springs[0].y);
      for (let i = 0; i < n; i++) {
        ctx.lineTo(springs[i].x, restY + springs[i].y);
      }
      ctx.lineTo(width, restY + springs[n - 1].y);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // Shore foam
      if (hasShore) {
        const leftIdx = Math.max(0, Math.round(islandLeft / SPRING_SPACING));
        const rightIdx = Math.min(
          n - 1,
          Math.round(islandRight / SPRING_SPACING)
        );
        drawShoreFoam(springs[leftIdx]);
        drawShoreFoam(springs[rightIdx]);
      }

      // Droplets — bright white, slightly larger ones at higher y read as foreground
      for (const d of droplets) {
        const alpha = Math.min(1, d.life * 1.4);
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (anyMoving || droplets.length > 0) wake();
    }

    function drawShoreFoam(spring) {
      if (!spring) return;
      const amp = Math.abs(spring.y) + Math.abs(spring.vy) * 2;
      if (amp < 0.8) return;
      const radius = Math.min(amp * 1.4, 10);
      const alpha = Math.min(amp / 10, 0.85);
      ctx.beginPath();
      ctx.arc(spring.x, restY + spring.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }

    let lastMouseX = 0;
    let lastMouseY = 0;
    let hasMouse = false;
    let lastSurfaceExit = 0;
    function onMove(e) {
      const waterlinePx = (WATERLINE_VH / 100) * window.innerHeight;
      const distFromWater = Math.abs(e.clientY - waterlinePx);
      if (hasMouse && distFromWater < 55) {
        const velX = e.clientX - lastMouseX;
        const velY = e.clientY - lastMouseY;
        const signedV = velY + Math.sign(velY || 1) * Math.abs(velX) * 0.15;
        if (Math.abs(signedV) > 2) {
          const f = verticalForceRef.current;
          const mag = Math.min(Math.abs(signedV) * f, f * 40);
          impulse(e.clientX, Math.sign(signedV) * mag);
        }

        // Upward exit from the surface → ballistic droplets fly up
        const crossedUp = lastMouseY > waterlinePx - 8 && velY < -4;
        const now = performance.now();
        if (crossedUp && now - lastSurfaceExit > 220) {
          lastSurfaceExit = now;
          spawnDroplets(e.clientX, Math.min(Math.abs(velY) * 1.4, 30));
          // Also dispatch the DOM ring splash so users see an atmospheric ring
          window.dispatchEvent(
            new CustomEvent("scene:splash", {
              detail: {
                leftPct: (e.clientX / window.innerWidth) * 100,
                widthPx: Math.max(80, Math.abs(velY) * 9),
                noDroplets: true,
              },
            })
          );
        }
      }
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      hasMouse = true;
    }

    // Task splashes come in through `water:splash` (x, force). Now also spawn
    // ballistic droplets at the impact site — the canvas becomes the single
    // home for all splash physics.
    function onSplash(e) {
      const { x, force } = e.detail || {};
      if (x != null) {
        impulse(x, force ?? 25);
        spawnDroplets(x, Math.abs(force ?? 25));
      }
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("water:splash", onSplash);
    window.addEventListener("resize", resize);

    resize();
    setTimeout(() => impulse(width * 0.3, 8), 200);
    setTimeout(() => impulse(width * 0.7, 6), 600);
    wake();

    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("water:splash", onSplash);
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    heightVhRef.current = canvasHeightVh;
    window.dispatchEvent(new Event("resize"));
  }, [canvasHeightVh]);

  return <canvas ref={canvasRef} className="water-canvas" aria-hidden="true" />;
}
