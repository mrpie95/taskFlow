import { useCallback, useEffect, useRef, useState } from "react";
import { loadState, saveState } from "../lib/state.js";
import { hash01, uid } from "../lib/util.js";
import {
  SKY_COMPOSE_VH,
  WATERLINE_VH,
  WATER_TOP_VH,
  WATER_RANGE_VH,
} from "../lib/geometry.js";

// Animation timings (tune here, in one place).
const DROP_CLEAR_MS = 1350;
const ASCENT_TOTAL_MS = 2500;
const FLOAT_AWAY_MS = 1600;
const SPLASH_LIFETIME_MS = 1100;

// Approximate card width calc — matches layout.js so the splash is sized right.
function cardWidthForDepth(id, depth) {
  const hw = hash01(id, 2);
  return Math.round((150 + hw * 50) * (1 - depth * 0.22));
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

  // Tunable: splash delay relative to commit. Ref so timers read the latest value
  // without re-firing the effect for a dependency change.
  const splashDelayRef = useRef(500);
  const setSplashDelay = useCallback((ms) => {
    splashDelayRef.current = ms;
  }, []);

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

      // Read the sky position from the current state snapshot.
      let distanceVh = 0;
      let landingX = 45;
      setTasks((prev) => {
        const skyTask = prev.find((t) => t.id === id);
        const skyX = skyTask?.manual_x ?? 45;
        const skyY = skyTask?.manual_y ?? SKY_COMPOSE_VH;
        landingX = skyX;
        const landingY = 26 + hash01(id, 8) * 6; // 26..32vh — just below the surface
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

      // Match the splash size to the landed card's width.
      const landingDepth = Math.max(
        0,
        Math.min(1, (26 + hash01(id, 8) * 6 - WATER_TOP_VH) / WATER_RANGE_VH)
      );
      const splashW = cardWidthForDepth(id, landingDepth);
      setTimeout(() => spawnSplash(landingX, splashW), splashDelayRef.current);
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

      // Watch the card's real position; fire the splash the moment its top
      // edge crosses the waterline. This is exact — no timing guess tied to
      // how deep the card was when we started.
      let splashFired = false;
      function watch() {
        if (splashFired) return;
        const el = document.querySelector(`[data-task-id="${id}"]`);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const waterlinePx = (WATERLINE_VH / 100) * window.innerHeight;
        if (rect.top <= waterlinePx) {
          splashFired = true;
          const xPct = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
          spawnSplash(xPct, rect.width);
          return;
        }
        requestAnimationFrame(watch);
      }
      requestAnimationFrame(watch);

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
    // Tuning
    setSplashDelay,
    // Actions
    addTask,
    commitEdit,
    discardEdit,
    resurface,
    reposition,
    completeTask,
    floatAway,
  };
}

// Re-export the waterline constant for consumers that gate on drag height.
export { WATERLINE_VH };
