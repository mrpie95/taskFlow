import { useCallback, useEffect, useRef, useState } from "react";
import { loadState, saveState } from "../lib/state.js";
import { hash01, uid } from "../lib/util.js";
import { SKY_COMPOSE_VH, WATERLINE_VH } from "../lib/geometry.js";

// Animation timings (tune here, in one place).
const DROP_CLEAR_MS = 1350;
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
  const [dropping, setDropping] = useState(() => new Map()); // id -> vh distance above landing
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
    setTimeout(() => {
      setSplashes((prev) => prev.filter((s) => s.id !== id));
    }, SPLASH_LIFETIME_MS);
  }, []);

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
      // pin there explicitly.
      let distanceVh = 0;
      let landingX = 45;
      setTasks((prev) => {
        const skyTask = prev.find((t) => t.id === id);
        const skyX = skyTask?.manual_x ?? 45;
        const skyY = skyTask?.manual_y ?? SKY_COMPOSE_VH;
        // Middle band spans roughly 55..110vh with FLOOR_MAX_VH = 175 and
        // surface ending at ~52vh (20% of the water range).
        const landingY = 65 + hash01(id, 8) * 28; // 65..93vh — middle band
        const xJitter = (hash01(id, 9) - 0.5) * 16; // ±8% sideways drift
        landingX = Math.max(10, Math.min(90, skyX + xJitter));
        distanceVh = skyY - landingY;

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

      // Trigger drop animation (keyframes read --drop-from / --splash-y).
      setDropping((prev) => new Map(prev).set(id, distanceVh));

      // Fire the splash the instant the card's bottom edge touches the
      // waterline — watch the real rect, no timer guess.
      watchWaterlineCrossing(
        id,
        (rect, waterlinePx) => rect.bottom >= waterlinePx,
        spawnSplash
      );
      setTimeout(() => {
        setDropping((prev) => {
          const n = new Map(prev);
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
    completeTask,
    floatAway,
  };
}

// Re-export the waterline constant for consumers that gate on drag height.
export { WATERLINE_VH };
