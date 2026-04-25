import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DepthIndicator } from "./components/DepthIndicator.jsx";
import { DevTools } from "./components/DevTools.jsx";
import { Splash } from "./components/Splash.jsx";
import { TaskCard } from "./components/TaskCard.jsx";
import { useClock } from "./hooks/useClock.js";
import { useCurrents } from "./hooks/useCurrents.js";
import { useScrollZone } from "./hooks/useScrollZone.js";
import { snapToGrid } from "./lib/grid.js";
import { layoutTasks } from "./lib/layout.js";
import { GridOverlay } from "./scene/GridOverlay.jsx";
import { Scene } from "./scene/Scene.jsx";
import { WaterCanvas } from "./scene/WaterCanvas.jsx";

const WATER_DEFAULTS = {
  springK: 0.011,
  damping: 0.975,
  neighborSpread: 0.14,
  propagationPasses: 4,
  canvasHeightVh: 17,
  verticalForce: 0.35,
};

export default function App() {
  const {
    tasks,
    settings,
    editingId,
    ascendingIds,
    dropping,
    floatingIds,
    splashes,
    addTask,
    commitEdit,
    discardEdit,
    resurface,
    startEditing,
    reposition,
    resizeTask,
    completeTask,
    floatAway,
    addRandomTasks,
    clearAllTasks,
  } = useCurrents();
  const now = useClock();
  const zone = useScrollZone();

  const [dragCompleteEnabled, setDragCompleteEnabled] = useState(true);
  const [gridEnabled, setGridEnabled] = useState(false);
  const [canvasWaterEnabled, setCanvasWaterEnabled] = useState(false);
  const [cardBlur, setCardBlur] = useState(4);
  const [waterParams, setWaterParams] = useState(WATER_DEFAULTS);
  const updateWaterParam = (key, value) =>
    setWaterParams((p) => ({ ...p, [key]: value }));
  const resetWaterParams = () => setWaterParams(WATER_DEFAULTS);
  const [devVisible, setDevVisible] = useState(() => {
    try {
      const v = localStorage.getItem("currents.devVisible");
      return v == null ? true : v === "1";
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try { localStorage.setItem("currents.devVisible", devVisible ? "1" : "0"); } catch {}
  }, [devVisible]);
  const focusedRef = useRef(null); // id of the card the cursor is currently over

  // Reposition with optional grid snapping.
  const handleReposition = useCallback(
    (id, leftPct, topVh) => {
      if (gridEnabled) {
        const snapped = snapToGrid(leftPct, topVh);
        reposition(id, snapped.leftPct, snapped.topVh);
      } else {
        reposition(id, leftPct, topVh);
      }
    },
    [gridEnabled, reposition]
  );

  // --- Sky click: finalize any existing draft, then create a new card.
  function handleSkyClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const clamped = Math.max(12, Math.min(88, xPct));

    if (editingId) {
      // Read the live DOM value — React state hasn't updated yet here.
      const input = document.querySelector(
        `.task[data-task-id="${editingId}"] input.task-edit`
      );
      const val = input ? input.value : "";
      if (val.trim()) commitEdit(editingId, val);
      else discardEdit(editingId);
    }
    addTask(clamped);
  }

  // --- Global keyboard shortcuts.
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
        // Never collide with the input's own Enter handler.
        if (editingId) return;
        const id = focusedRef.current;
        if (id && !ascendingIds.has(id)) {
          e.preventDefault();
          completeTask(id);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingId, ascendingIds, addTask, completeTask]);

  // --- Layout.
  // Cards currently mid-animation are "in flight" — collision treats them as
  // lower priority so settled cards don't shuffle around to accommodate them.
  const inFlightIds = useMemo(() => {
    const s = new Set(ascendingIds);
    for (const id of dropping) s.add(id);
    for (const id of floatingIds) s.add(id);
    return s;
  }, [ascendingIds, dropping, floatingIds]);

  const laidOut = useMemo(
    () =>
      layoutTasks(
        tasks,
        settings,
        now,
        typeof window !== "undefined" ? window.innerWidth : 1200,
        inFlightIds
      ),
    [tasks, settings, now, inFlightIds]
  );

  return (
    <div className="scene">
      <Scene onSkyClick={handleSkyClick} showCssWaterline={!canvasWaterEnabled} />
      {canvasWaterEnabled && <WaterCanvas {...waterParams} />}
      {gridEnabled && <GridOverlay />}

      <div className="tasks">
        {laidOut.map(({ task, depth, leftPct, widthPx, topVh, deep, inSky }) => (
          <TaskCard
            key={task.id}
            task={task}
            depth={depth}
            leftPct={leftPct}
            widthPx={widthPx}
            topVh={topVh}
            deep={deep}
            inSky={inSky}
            cardBlur={cardBlur}
            isDropping={dropping.has(task.id)}
            now={now}
            isEditing={editingId === task.id}
            isAscending={ascendingIds.has(task.id)}
            isFloating={floatingIds.has(task.id)}
            dragCompleteEnabled={dragCompleteEnabled}
            focusedRef={focusedRef}
            onResurface={resurface}
            onEdit={startEditing}
            onComplete={completeTask}
            onCommitEdit={commitEdit}
            onDiscardEdit={discardEdit}
            onReposition={handleReposition}
            onResize={resizeTask}
            onFloatAway={floatAway}
          />
        ))}
        {splashes.map((s) => (
          <Splash key={s.id} leftPct={s.leftPct} widthPx={s.widthPx} />
        ))}
      </div>

      {!editingId && (
        <button
          className="add-button"
          onClick={() => addTask()}
          aria-label="New task (N)"
        >
          +
        </button>
      )}

      <DepthIndicator zone={zone} />

      {tasks.length === 0 && (
        <div className="empty-state">
          press <b>n</b> or tap + to drop a task in the water
        </div>
      )}

      {/* "Devs live in the deep" — toggle sits bottom-left in the floor zone */}
      <button
        className="dev-toggle"
        onClick={() => setDevVisible((v) => !v)}
        aria-label={devVisible ? "Hide dev panel" : "Show dev panel"}
        title={devVisible ? "hide devs" : "show devs"}
      >
        {devVisible ? "–" : "+"}
      </button>

      {devVisible && (
        <DevTools
          dragCompleteEnabled={dragCompleteEnabled}
          onDragCompleteChange={setDragCompleteEnabled}
          gridEnabled={gridEnabled}
          onGridChange={setGridEnabled}
          canvasWaterEnabled={canvasWaterEnabled}
          onCanvasWaterChange={setCanvasWaterEnabled}
          waterParams={waterParams}
          onWaterParamChange={updateWaterParam}
          onWaterReset={resetWaterParams}
          onAddRandomTasks={addRandomTasks}
          onClearAllTasks={clearAllTasks}
          cardBlur={cardBlur}
          onCardBlurChange={setCardBlur}
        />
      )}
    </div>
  );
}
