import { useCallback, useEffect, useRef, useState } from "react";
import { loadState, saveState } from "../lib/state.js";
import { hash01, uid } from "../lib/util.js";
import {
  SKY_COMPOSE_VH,
  WATERLINE_VH,
  WATER_RANGE_VH,
  WATER_TOP_VH,
} from "../lib/geometry.js";

// Animation timings (tune here, in one place).
const DROP_CLEAR_MS = 2100;
const ASCENT_TOTAL_MS = 2500;
const FLOAT_AWAY_MS = 1600;
const SPLASH_LIFETIME_MS = 1100;

// Watch a card's real DOM position every frame. Fire `onCross` the first time
// `predicate(rect, waterlinePx)` is true. Used for splashes on drop + ascent.
function watchWaterlineCrossing(id, predicate, onCross) {
  let fired = false;
  function step() {
    if (fired) return;
    const el = document.querySelector(`[data-task-id="${id}"]`);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const waterlinePx = (WATERLINE_VH / 100) * window.innerHeight;
    if (predicate(rect, waterlinePx)) {
      fired = true;
      const xPct = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
      onCross(xPct, rect.width);
      return;
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// The core state hook: tasks, editing flow, and all completion / drop / float
// animations. Returns everything the UI needs and a set of pure-ish actions.
export function useCurrents() {
  const initial = useRef(loadState()).current;

  const [tasks, setTasks] = useState(initial.tasks);
  const [settings] = useState(initial.settings);
  const [editingId, setEditingId] = useState(null);

  // Transient animation state.
  const [ascendingIds, setAscendingIds] = useState(() => new Set());
  // Which tasks are currently mid-drop animation (set for membership tests).
  const [dropping, setDropping] = useState(() => new Set());
  const [floatingIds, setFloatingIds] = useState(() => new Set());
  const [splashes, setSplashes] = useState([]);

  // Persist whenever the durable state changes.
  useEffect(() => {
    saveState({ tasks, settings });
  }, [tasks, settings]);

  // --- Private helpers --------------------------------------------------

  const spawnSplash = useCallback((leftPct, widthPx = 160) => {
    const id = uid();
    setSplashes((prev) => [...prev, { id, leftPct, widthPx }]);
    // Kick the canvas water surface if it's rendered — scales force with width.
    if (typeof window !== "undefined") {
      const xPx = (leftPct / 100) * window.innerWidth;
      const force = Math.min(40, 16 + widthPx * 0.08);
      window.dispatchEvent(
        new CustomEvent("water:splash", { detail: { x: xPx, force } })
      );
    }
    setTimeout(() => {
      setSplashes((prev) => prev.filter((s) => s.id !== id));
    }, SPLASH_LIFETIME_MS);
  }, []);

  // Anything in the scene can request a splash (ring + droplets) by dispatching
  // `scene:splash` with { leftPct, widthPx }. Currently the canvas uses this
  // when the cursor tears upward through the surface.
  useEffect(() => {
    function onSceneSplash(e) {
      const { leftPct, widthPx } = e.detail || {};
      if (typeof leftPct === "number") spawnSplash(leftPct, widthPx ?? 140);
    }
    window.addEventListener("scene:splash", onSceneSplash);
    return () => window.removeEventListener("scene:splash", onSceneSplash);
  }, [spawnSplash]);

  // --- Actions ---------------------------------------------------------

  const addTask = useCallback((skyXPct) => {
    const skyX =
      skyXPct != null
        ? Math.max(8, Math.min(82, skyXPct))
        : 34 + Math.random() * 22;
    const now = Date.now();
    const task = {
      id: uid(),
      title: "",
      created_at: now,
      last_touched_at: now,
      state: "alive",
      manual_x: skyX,
      manual_y: SKY_COMPOSE_VH,
    };
    setTasks((prev) => [task, ...prev]);
    setEditingId(task.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const discardEdit = useCallback((id) => {
    setTasks((prev) => {
      const existing = prev.find((t) => t.id === id);
      if (existing && !existing.title) return prev.filter((t) => t.id !== id);
      return prev;
    });
    setEditingId(null);
  }, []);

  const commitEdit = useCallback(
    (id, rawTitle) => {
      const title = rawTitle.trim();
      if (!title) {
        discardEdit(id);
        return;
      }

      // New tasks land in the "when you can" middle zone by default — the
      // surface band ("doing now") is reserved for whatever you drag up and
      // pin there explicitly. TaskCard computes its own drop-from offset from
      // the rendered topVh, so we don't need to store the distance here.
      setTasks((prev) => {
        const skyTask = prev.find((t) => t.id === id);
        const skyX = skyTask?.manual_x ?? 45;
        // Land near the TOP of the "when you can" band — just below the
        // surface/middle boundary (~52vh) — not deep into it.
        const landingY = 55 + hash01(id, 8) * 14; // 55..69vh
        const xJitter = (hash01(id, 9) - 0.5) * 16; // ±8% sideways drift
        const landingX = Math.max(10, Math.min(90, skyX + xJitter));

        return prev.map((t) =>
          t.id === id
            ? {
                ...t,
                title,
                manual_x: landingX,
                manual_y: landingY,
                last_touched_at: Date.now(),
              }
            : t
        );
      });
      setEditingId(null);

      // Flag the card as "dropping" so TaskCard applies the animation class.
      setDropping((prev) => new Set(prev).add(id));

      // Fire the splash the instant the card's bottom edge crosses the
      // waterline — watch the real rect, no timer guess.
      watchWaterlineCrossing(
        id,
        (rect, waterlinePx) => rect.bottom >= waterlinePx,
        spawnSplash
      );
      setTimeout(() => {
        setDropping((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
      }, DROP_CLEAR_MS);
    },
    [discardEdit, spawnSplash]
  );

  const resurface = useCallback((id) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, last_touched_at: Date.now() } : t
      )
    );
  }, []);

  // Click a positioned card to edit its title in place.
  const startEditing = useCallback((id) => {
    setEditingId(id);
  }, []);

  const reposition = useCallback((id, leftPct, topVh) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              manual_x: leftPct,
              manual_y: topVh,
              last_touched_at: Date.now(),
            }
          : t
      )
    );
  }, []);

  // User resized a card via the corner tag — persist the custom width.
  const resizeTask = useCallback((id, widthPx) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, manual_w: Math.round(widthPx), last_touched_at: Date.now() }
          : t
      )
    );
  }, []);

  const completeTask = useCallback(
    (id) => {
      setAscendingIds((prev) => {
        if (prev.has(id)) return prev;
        return new Set(prev).add(id);
      });

      // Fire the splash the moment the top edge crosses the waterline.
      watchWaterlineCrossing(
        id,
        (rect, waterlinePx) => rect.top <= waterlinePx,
        spawnSplash
      );

      setTimeout(() => {
        setTasks((prev) => prev.filter((t) => t.id !== id));
        setAscendingIds((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
      }, ASCENT_TOTAL_MS);
    },
    [spawnSplash]
  );

  // --- Dev helpers -----------------------------------------------------

  const addRandomTasks = useCallback((n = 15) => {
    const SAMPLES = [
      "test", "read", "note", "call", "buy", "write", "fix", "plan",
      "ask", "email", "ship", "edit", "sync", "prep", "check", "review",
    ];
    const now = Date.now();
    const newTasks = [];
    for (let i = 0; i < n; i++) {
      const depth = Math.random();
      const idleMin = Math.random() * 180; // 0–180 minutes of fake idle time
      const title =
        Math.random() < 0.25
          ? String.fromCharCode(97 + Math.floor(Math.random() * 26))
          : SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
      newTasks.push({
        id: uid(),
        title,
        created_at: now - idleMin * 60_000,
        last_touched_at: now - idleMin * 60_000,
        state: "alive",
        manual_x: 10 + Math.random() * 80,
        manual_y: WATER_TOP_VH + depth * WATER_RANGE_VH * 0.85,
      });
    }
    setTasks((prev) => [...newTasks, ...prev]);
  }, []);

  const clearAllTasks = useCallback(() => {
    setTasks([]);
    setEditingId(null);
  }, []);

  const floatAway = useCallback((id, leftPct, topVh) => {
    // Pin the card at the release point, then let the float-up keyframe run.
    setFloatingIds((prev) => {
      if (prev.has(id)) return prev;
      return new Set(prev).add(id);
    });
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              manual_x: leftPct,
              manual_y: topVh,
              last_touched_at: Date.now(),
            }
          : t
      )
    );
    setTimeout(() => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setFloatingIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    }, FLOAT_AWAY_MS);
  }, []);

  return {
    // State
    tasks,
    settings,
    editingId,
    ascendingIds,
    dropping,
    floatingIds,
    splashes,
    // Actions
    addTask,
    commitEdit,
    discardEdit,
    resurface,
    startEditing,
    reposition,
    resizeTask,
    completeTask,
    floatAway,
    // Dev-only
    addRandomTasks,
    clearAllTasks,
  };
}

// Re-export the waterline constant for consumers that gate on drag height.
export { WATERLINE_VH };
