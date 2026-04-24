import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "currents.v1";
const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_SETTINGS = { sinking_days_per_zone: 3 };

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { tasks: [], settings: DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
    };
  } catch {
    return { tasks: [], settings: DEFAULT_SETTINGS };
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be full / blocked — silently tolerate
  }
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Deterministic 0..1 hash from a task id — used for stable horizontal placement + width jitter.
function hash01(id, salt = 0) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

// 0 = surface, 1 = floor. Depth grows with days untouched.
function computeDepth(task, settings, now) {
  const daysIdle = Math.max(0, (now - task.last_touched_at) / DAY_MS);
  const zoneUnits = daysIdle / settings.sinking_days_per_zone; // 0..3+
  return Math.max(0, Math.min(1, zoneUnits / 3));
}

function idleLabel(ms) {
  if (ms < 60 * 1000) return "just now";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m idle`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h idle`;
  const days = Math.floor(hrs / 24);
  return `${days}d idle`;
}

// ---------- Scene pieces ----------

function Noise() {
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

function Clouds() {
  // A few small drifting cloud strips in the sky sliver
  const clouds = [
    { top: 5, left: 8, width: 110, opacity: 0.7, delay: 0 },
    { top: 8, left: 14, width: 70, opacity: 0.55, delay: 2 },
    { top: 4, left: 38, width: 130, opacity: 0.65, delay: 3 },
    { top: 10, left: 52, width: 85, opacity: 0.5, delay: 1.5 },
    { top: 7, left: 74, width: 95, opacity: 0.6, delay: 4 },
    { top: 11, left: 82, width: 60, opacity: 0.5, delay: 2.5 },
  ];
  return (
    <>
      {clouds.map((c, i) => (
        <div
          key={i}
          className="cloud"
          style={{
            top: `${c.top}vh`,
            left: `${c.left}%`,
            width: `${c.width}px`,
            opacity: c.opacity,
            animationDelay: `${c.delay}s`,
          }}
        />
      ))}
    </>
  );
}

function Waves() {
  return (
    <div className="waves">
      <svg className="wave wave-top" viewBox="0 0 1200 22" preserveAspectRatio="none">
        <path
          d="M0 10 Q 100 2, 200 10 T 400 10 T 600 10 T 800 10 T 1000 10 T 1200 10 L1200 22 L0 22 Z"
          fill="#9CC3ED"
          opacity="0.95"
        />
      </svg>
      <svg className="wave wave-under" viewBox="0 0 1200 22" preserveAspectRatio="none">
        <path
          d="M0 12 Q 120 4, 240 12 T 480 12 T 720 12 T 960 12 T 1200 12 L1200 22 L0 22 Z"
          fill="#85B7EB"
        />
      </svg>
    </div>
  );
}

function Rays() {
  // Rays enter the water from the sun (upper-right) and fan down-left, fading
  // into the deeper water. The narrower pair carry the strongest light.
  const rays = [
    { x1: 88, x2: 55, x3: 50, x4: 84, strength: 0.55 },
    { x1: 82, x2: 40, x3: 35, x4: 78, strength: 0.65 },
    { x1: 75, x2: 25, x3: 20, x4: 72, strength: 0.5 },
    { x1: 70, x2: 10, x3: 6, x4: 68, strength: 0.4 },
    { x1: 64, x2: -5, x3: -10, x4: 62, strength: 0.3 },
  ];
  return (
    <svg className="rays" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id="rayGrad" x1="0.5" x2="0.5" y1="0" y2="1">
          <stop offset="0" stopColor="#FFF4D6" stopOpacity="0.7" />
          <stop offset="0.25" stopColor="#FFE8B8" stopOpacity="0.32" />
          <stop offset="0.55" stopColor="#FFE8B8" stopOpacity="0.12" />
          <stop offset="0.85" stopColor="#FFE8B8" stopOpacity="0.02" />
          <stop offset="1" stopColor="#FFE8B8" stopOpacity="0" />
        </linearGradient>
        {/* Soft-edge mask so ray sides fade laterally too, not just vertically */}
        <linearGradient id="rayEdge" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {rays.map((r, i) => {
        const pulseDur = 7 + i * 0.6;
        const swayDur = 13 + i * 1.7;
        const pulseDelay = -i * 1.4;
        const swayDelay = -i * 2.3;
        return (
          <g key={i} opacity={r.strength}>
            <polygon
              className="ray"
              points={`${r.x1},4 ${r.x4},4 ${r.x3},95 ${r.x2},95`}
              fill="url(#rayGrad)"
              style={{
                animation: `rayPulse ${pulseDur}s ease-in-out ${pulseDelay}s infinite, raySway ${swayDur}s ease-in-out ${swayDelay}s infinite`,
              }}
            />
          </g>
        );
      })}
    </svg>
  );
}

function Particles() {
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 34; i++) {
      const surfaceBias = Math.random() * Math.random(); // thinner with depth
      arr.push({
        id: i,
        top: 10 + surfaceBias * 285, // vh
        left: Math.random() * 100,
        size: 1.5 + Math.random() * 2.5,
        opacity: 0.3 + Math.random() * 0.35,
        drift: ["drift-a", "drift-b", "drift-c"][i % 3],
        duration: 7 + Math.random() * 7,
        delay: -Math.random() * 10,
      });
    }
    return arr;
  }, []);

  return (
    <div className="particles">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            top: `${p.top}vh`,
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            animation: `${p.drift} ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function Splash({ leftPct }) {
  const drops = [
    { dx: -24, dy1: -26, delay: 0 },
    { dx: 18, dy1: -32, delay: 30 },
    { dx: -8, dy1: -36, delay: 60 },
    { dx: 30, dy1: -22, delay: 20 },
    { dx: -32, dy1: -18, delay: 80 },
  ];
  return (
    <div className="splash-group" style={{ left: `${leftPct}%`, top: `${20}vh` }}>
      <div className="splash-ring ring-1" />
      <div className="splash-ring ring-2" />
      {drops.map((d, i) => (
        <div
          key={i}
          className="splash-drop"
          style={{
            "--dx": `${d.dx}px`,
            "--dy1": `${d.dy1}px`,
            animationDelay: `${d.delay}ms`,
          }}
        />
      ))}
    </div>
  );
}

function Seabed() {
  const pebbles = [
    { left: 10, w: 14, h: 7 },
    { left: 24, w: 10, h: 5 },
    { left: 46, w: 18, h: 8 },
    { left: 62, w: 9, h: 4 },
    { left: 78, w: 12, h: 6 },
    { left: 90, w: 8, h: 4 },
  ];
  return (
    <div className="seabed">
      <svg viewBox="0 0 640 42" preserveAspectRatio="none">
        <path
          d="M0,26 Q80,18 160,22 T320,24 T480,20 T640,22 L640,42 L0,42 Z"
          fill="#021D3A"
        />
      </svg>
      {pebbles.map((p, i) => (
        <div
          key={i}
          className="pebble"
          style={{ left: `${p.left}%`, width: `${p.w}px`, height: `${p.h}px` }}
        />
      ))}
    </div>
  );
}

// ---------- Task card ----------

function TaskCard({
  task,
  depth,
  leftPct,
  widthPx,
  topVh,
  deep,
  inSky,
  dropFromVh,
  now,
  onResurface,
  onComplete,
  onCommitEdit,
  onDiscardEdit,
  onReposition,
  isEditing,
  isAscending,
  focusedRef,
}) {
  const dragRef = useRef({ active: false, moved: false, sx: 0, sy: 0, ox: 0, oy: 0 });
  const [dragPos, setDragPos] = useState(null); // { leftPct, topVh } during drag

  function onPointerDown(e) {
    if (isEditing || isAscending) return;
    if (e.target.closest(".check") || e.target.closest("input")) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = {
      active: true,
      moved: false,
      sx: e.clientX,
      sy: e.clientY,
      ox: leftPct,
      oy: topVh,
    };
  }
  function onPointerMove(e) {
    const d = dragRef.current;
    if (!d.active) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const newLeft = d.ox + (dx / vw) * 100;
    const newTop = d.oy + (dy / vh) * 100;
    setDragPos({ leftPct: newLeft, topVh: newTop });
  }
  function onPointerUp(e) {
    const d = dragRef.current;
    if (!d.active) return;
    d.active = false;
    if (d.moved && dragPos) {
      // Clamp so card stays at least partly visible
      const clampedLeft = Math.max(0, Math.min(92, dragPos.leftPct));
      const clampedTop = Math.max(21, Math.min(295, dragPos.topVh));
      onReposition(task.id, clampedLeft, clampedTop);
    } else {
      // Treated as a click: resurface
      onResurface(task.id);
    }
    setDragPos(null);
  }

  const daysIdle = (now - task.last_touched_at) / DAY_MS;
  const sinkingSoon = daysIdle > 2 && daysIdle < 3 && depth < 1;
  const isDropping = dropFromVh != null;
  const cls = [
    "task",
    inSky ? "in-sky" : "",
    deep ? "deep" : "",
    sinkingSoon ? "sinking-soon" : "",
    isAscending ? "ascending" : "",
    isDropping ? "dropping" : "",
    isEditing ? "editing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const activeLeft = dragPos ? dragPos.leftPct : leftPct;
  const activeTop = dragPos ? dragPos.topVh : topVh;

  // Sky cards are pure white; water cards fade their fill with depth.
  const bgAlpha = inSky ? 1 : Math.max(0.1, 0.82 - depth * 0.72);
  const borderAlpha = inSky ? 0.15 : Math.max(0.08, 0.28 - depth * 0.22);
  const shadowAlpha = inSky ? 0.18 : Math.max(0, 0.1 - depth * 0.14);
  const style = {
    top: `${activeTop}vh`,
    left: `${activeLeft}%`,
    width: `${widthPx}px`,
    background: `rgba(255, 255, 255, ${bgAlpha})`,
    borderColor: `rgba(4, 44, 83, ${borderAlpha})`,
    boxShadow: shadowAlpha > 0 ? `0 6px 22px rgba(4, 44, 83, ${shadowAlpha})` : "none",
    transition: dragPos || isDropping ? "none" : undefined,
    cursor: dragPos ? "grabbing" : "grab",
  };
  if (isAscending) {
    const pxRise = -(topVh * window.innerHeight) / 100 + 20;
    style["--ascent-d"] = `${pxRise}px`;
  }
  if (isDropping) {
    // Card's top is already set to its landing y. translateY starts up in the sky
    // and animates to 0 (landing). At splashY (waterline) we slow way down.
    const WATERLINE_VH = 20;
    const splashY = WATERLINE_VH - task.manual_y; // negative (waterline above landing)
    style["--drop-from"] = `${dropFromVh}vh`;
    style["--splash-y"] = `${splashY}vh`;
  }

  const inputRef = useRef(null);
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <div
      className={cls}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { dragRef.current.active = false; setDragPos(null); }}
      onMouseEnter={() => (focusedRef.current = task.id)}
      onMouseLeave={() => {
        if (focusedRef.current === task.id) focusedRef.current = null;
      }}
      data-task-id={task.id}
    >
      {isEditing ? (
        <>
          <input
            ref={inputRef}
            className="task-edit"
            defaultValue={task.title}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onCommitEdit(task.id, e.currentTarget.value);
              } else if (e.key === "Escape") {
                e.preventDefault();
                onDiscardEdit(task.id);
              }
            }}
            onBlur={(e) => onCommitEdit(task.id, e.currentTarget.value)}
            placeholder="what's on your mind?"
          />
          <div className="task-meta drop-hint">enter to drop ↓</div>
        </>
      ) : (
        <>
          <div className="task-title">{task.title}</div>
          <div className="task-meta">
            {sinkingSoon ? "sinking in 1d" : idleLabel(now - task.last_touched_at)}
          </div>
          <button
            className="check"
            aria-label="Complete task"
            onClick={(e) => {
              e.stopPropagation();
              onComplete(task.id);
            }}
          >
            ✓
          </button>
        </>
      )}
    </div>
  );
}

// ---------- Depth indicator ----------

function DepthIndicator({ zone }) {
  const deep = zone === "floor";
  return (
    <div className={`depth-indicator ${deep ? "deep" : ""}`} aria-hidden="true">
      {["surface", "middle", "floor"].map((z) => (
        <div key={z} className={`depth-dot ${zone === z ? "active" : ""}`} title={z} />
      ))}
    </div>
  );
}

// ---------- App ----------

export default function App() {
  const initial = useMemo(loadState, []);
  const [tasks, setTasks] = useState(initial.tasks);
  const [settings] = useState(initial.settings);
  const [editingId, setEditingId] = useState(null);
  const [ascendingIds, setAscendingIds] = useState(() => new Set());
  const [splashes, setSplashes] = useState([]);
  const [dropping, setDropping] = useState(() => new Map()); // id -> distance in vh (negative)
  const [now, setNow] = useState(() => Date.now());
  const [zone, setZone] = useState("surface");
  const focusedRef = useRef(null);

  // Persist
  useEffect(() => {
    saveState({ tasks, settings });
  }, [tasks, settings]);

  // Clock tick for depth recomputation (every 30s), paused when tab is hidden.
  useEffect(() => {
    let id;
    function start() {
      id = setInterval(() => setNow(Date.now()), 30000);
    }
    function stop() {
      if (id) clearInterval(id);
    }
    start();
    function onVis() {
      stop();
      if (!document.hidden) {
        setNow(Date.now());
        start();
      }
    }
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Scroll -> depth zone
  useEffect(() => {
    function onScroll() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? window.scrollY / max : 0;
      setZone(pct < 0.33 ? "surface" : pct < 0.66 ? "middle" : "floor");
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const SKY_COMPOSE_VH = 7; // where the editing card hovers in the sky

  function addTask(skyXPct) {
    // Spawn the composing card in the sky. If no x is given (e.g. keyboard/button),
    // default to center-ish with a small jitter.
    const skyX = skyXPct != null
      ? Math.max(8, Math.min(82, skyXPct))
      : 34 + Math.random() * 22;
    const t = {
      id: uid(),
      title: "",
      created_at: Date.now(),
      last_touched_at: Date.now(),
      state: "alive",
      manual_x: skyX,
      manual_y: SKY_COMPOSE_VH,
    };
    setTasks((prev) => [t, ...prev]);
    setEditingId(t.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSkyClick(e) {
    if (editingId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    addTask(xPct);
  }

  function commitEdit(id, rawTitle) {
    const title = rawTitle.trim();
    if (!title) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setEditingId(null);
      return;
    }
    // Pick a landing spot just below the waterline. Hash on id so it's stable.
    const hx = hash01(id, 7);
    const landingX = 10 + hx * 70; // 10..80%
    const landingY = 26 + hash01(id, 8) * 6; // 26..32vh

    const skyY = tasks.find((t) => t.id === id)?.manual_y ?? SKY_COMPOSE_VH;
    const distanceVh = skyY - landingY; // negative — the card starts this many vh *above* its landing

    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              title,
              manual_x: landingX,
              manual_y: landingY,
              last_touched_at: Date.now(),
            }
          : t
      )
    );
    setEditingId(null);

    // Trigger drop animation
    setDropping((prev) => {
      const n = new Map(prev);
      n.set(id, distanceVh);
      return n;
    });

    // Splash at the waterline, triggered when the card's leading edge hits it (40% of 1.25s)
    setTimeout(() => {
      const splashId = uid();
      setSplashes((s) => [...s, { id: splashId, leftPct: landingX }]);
      setTimeout(() => {
        setSplashes((s) => s.filter((x) => x.id !== splashId));
      }, 1100);
    }, 500);

    setTimeout(() => {
      setDropping((prev) => {
        const n = new Map(prev);
        n.delete(id);
        return n;
      });
    }, 1350);
  }

  function discardEdit(id) {
    setTasks((prev) => {
      const existing = prev.find((t) => t.id === id);
      if (existing && !existing.title) return prev.filter((t) => t.id !== id);
      return prev;
    });
    setEditingId(null);
  }

  function resurface(id) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, last_touched_at: Date.now() } : t))
    );
    setNow(Date.now());
  }

  function reposition(id, leftPct, topVh) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, manual_x: leftPct, manual_y: topVh, last_touched_at: Date.now() }
          : t
      )
    );
    setNow(Date.now());
  }

  function completeTask(id) {
    if (ascendingIds.has(id)) return;
    setAscendingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      const splashId = uid();
      setSplashes((s) => [...s, { id: splashId }]);
      setTimeout(() => {
        setSplashes((s) => s.filter((x) => x.id !== splashId));
      }, 900);
    }, 1500);
    setTimeout(() => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setAscendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 2500);
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";

      if (!typing && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        addTask();
        return;
      }
      if (e.key === "Enter" && !typing) {
        const id = focusedRef.current;
        if (id && !ascendingIds.has(id)) {
          e.preventDefault();
          completeTask(id);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ascendingIds]);

  // Scene geometry: sky sliver up top, water below.
  const SKY_VH = 20;
  const WATER_TOP_VH = SKY_VH + 1; // first usable row, just below waterline
  const WATER_RANGE_VH = 295 - WATER_TOP_VH; // last usable row near floor

  // Build render layout. Manual drag sets effective depth: dragging a card to the
  // floor actually moves it to the floor (styling and zone follow).
  const layoutTasks = useMemo(() => {
    const bandCounts = new Map();
    const PHI = 0.61803398875;
    return tasks.map((t) => {
      const manual = t.manual_x != null && t.manual_y != null;
      const timeDepth = computeDepth(t, settings, now);

      const depth = manual
        ? Math.max(0, Math.min(1, (t.manual_y - WATER_TOP_VH) / WATER_RANGE_VH))
        : timeDepth;

      const band = Math.round(depth * 20);
      const idx = bandCounts.get(band) ?? 0;
      bandCounts.set(band, idx + 1);

      const hw = hash01(t.id, 2);
      const widthPx = Math.round((150 + hw * 50) * (1 - depth * 0.22));

      const jitter = (hash01(t.id, 3) - 0.5) * 6;
      const autoLeftPct = 6 + ((idx * PHI) % 1) * 72 + jitter;
      const autoTopVh = WATER_TOP_VH + depth * WATER_RANGE_VH + Math.floor(idx / 5) * 7;

      const leftPct = manual ? t.manual_x : autoLeftPct;
      const topVh = manual ? t.manual_y : autoTopVh;

      const deep = depth > 0.55;
      const inSky = (manual ? t.manual_y : topVh) < SKY_VH;
      return { task: t, depth, leftPct, widthPx, topVh, deep, inSky };
    });
  }, [tasks, settings, now]);

  return (
    <div className="scene">
      <div
        className="sky"
        onClick={handleSkyClick}
        role="button"
        aria-label="Click to drop a new task"
      >
        <div className="sun" />
        <Clouds />
      </div>
      <div className="water">
        <div className="swell" />
        <div className="shimmer shimmer-a" />
        <div className="shimmer shimmer-b" />
        <Noise />
        <Seabed />
      </div>
      <Waves />
      <Rays />
      <Particles />

      {/* "Will sink soon" divider — sits near the boundary between middle and floor */}
      <div
        className="sink-divider"
        style={{ top: `${WATER_TOP_VH + 0.7 * WATER_RANGE_VH}vh` }}
        aria-hidden="true"
      >
        <div className="line" />
        <span>∼ will sink soon ∼</span>
        <div className="line" />
      </div>

      <div className="tasks">
        {layoutTasks.map(({ task, depth, leftPct, widthPx, topVh, deep, inSky }) => (
          <TaskCard
            key={task.id}
            task={task}
            depth={depth}
            leftPct={leftPct}
            widthPx={widthPx}
            topVh={topVh}
            deep={deep}
            inSky={inSky}
            dropFromVh={dropping.get(task.id)}
            now={now}
            onResurface={resurface}
            onComplete={completeTask}
            onCommitEdit={commitEdit}
            onDiscardEdit={discardEdit}
            onReposition={reposition}
            isEditing={editingId === task.id}
            isAscending={ascendingIds.has(task.id)}
            focusedRef={focusedRef}
          />
        ))}
        {splashes.map((s) => (
          <Splash key={s.id} leftPct={s.leftPct} />
        ))}
      </div>

      {!editingId && (
        <button className="add-button" onClick={addTask} aria-label="New task (N)">
          +
        </button>
      )}

      <DepthIndicator zone={zone} />

      {tasks.length === 0 && (
        <div className="empty-state">
          press <b>n</b> or tap + to drop a task in the water
        </div>
      )}

      <div className={`hint ${zone === "floor" ? "deep" : ""}`}>
        n new · click to resurface · hover + enter to complete
      </div>
    </div>
  );
}
