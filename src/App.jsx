import { useEffect, useMemo, useRef, useState } from "react";

import { DepthIndicator } from "./components/DepthIndicator.jsx";
import { DevTools } from "./components/DevTools.jsx";
import { Splash } from "./components/Splash.jsx";
import { TaskCard } from "./components/TaskCard.jsx";
import { useClock } from "./hooks/useClock.js";
import { useCurrents } from "./hooks/useCurrents.js";
import { useScrollZone } from "./hooks/useScrollZone.js";
import { layoutTasks } from "./lib/layout.js";
import { Scene } from "./scene/Scene.jsx";

export default function App() {
  const {
    tasks,
    settings,
    editingId,
    ascendingIds,
    dropping,
    floatingIds,
    splashes,
    setSplashDelay: applySplashDelay,
    addTask,
    commitEdit,
    discardEdit,
    resurface,
    reposition,
    completeTask,
    floatAway,
  } = useCurrents();
  const now = useClock();
  const zone = useScrollZone();

  const [splashDelay, setSplashDelay] = useState(500);
  const [dragCompleteEnabled, setDragCompleteEnabled] = useState(true);
  const focusedRef = useRef(null); // id of the card the cursor is currently over

  // Propagate slider tweaks to the hook's internal ref.
  useEffect(() => {
    applySplashDelay(splashDelay);
  }, [splashDelay, applySplashDelay]);

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
  const laidOut = useMemo(
    () =>
      layoutTasks(
        tasks,
        settings,
        now,
        typeof window !== "undefined" ? window.innerWidth : 1200
      ),
    [tasks, settings, now]
  );

  return (
    <div className="scene">
      <Scene onSkyClick={handleSkyClick} />

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
            dropFromVh={dropping.get(task.id)}
            now={now}
            isEditing={editingId === task.id}
            isAscending={ascendingIds.has(task.id)}
            isFloating={floatingIds.has(task.id)}
            dragCompleteEnabled={dragCompleteEnabled}
            focusedRef={focusedRef}
            onResurface={resurface}
            onComplete={completeTask}
            onCommitEdit={commitEdit}
            onDiscardEdit={discardEdit}
            onReposition={reposition}
            onFloatAway={floatAway}
          />
        ))}
        {splashes.map((s) => (
          <Splash key={s.id} leftPct={s.leftPct} />
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

      <div className={`hint ${zone === "floor" ? "deep" : ""}`}>
        n new · click to resurface · hover + enter to complete
      </div>

      <DevTools
        splashDelay={splashDelay}
        onSplashDelayChange={setSplashDelay}
        dragCompleteEnabled={dragCompleteEnabled}
        onDragCompleteChange={setDragCompleteEnabled}
      />
    </div>
  );
}
