import { useEffect, useRef, useState } from "react";
import { DAY_MS, hash01, idleLabel } from "../lib/util.js";
import {
  CARD_H_VH,
  FLOOR_MAX_VH,
  SKY_COMPOSE_VH,
  WATERLINE_VH,
} from "../lib/geometry.js";
import { useCardDrag } from "../hooks/useCardDrag.js";

// A single positioned card. All motion state flags are booleans driven by the
// parent; this component just reflects them into CSS classes and inline style.
export function TaskCard({
  // Layout
  task,
  depth,
  leftPct,
  widthPx,
  topVh,
  deep,
  inSky,
  // Animation flags
  isDropping,
  isEditing,
  isAscending,
  isFloating,
  // Interaction
  dragCompleteEnabled,
  focusedRef,
  now,
  // Style
  cardBlur = 22,
  // Callbacks
  onResurface,
  onEdit,
  onComplete,
  onCommitEdit,
  onDiscardEdit,
  onReposition,
  onResize,
  onFloatAway,
}) {
  // --- Resize handle state ------------------------------------------------
  const resizeRef = useRef({ active: false, startX: 0, startW: 0 });
  const [liveWidth, setLiveWidth] = useState(null);
  function onResizeDown(e) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    resizeRef.current = {
      active: true,
      startX: e.clientX,
      startW: widthPx,
    };
  }
  function onResizeMove(e) {
    const r = resizeRef.current;
    if (!r.active) return;
    e.stopPropagation();
    const next = Math.max(130, Math.min(520, r.startW + (e.clientX - r.startX)));
    setLiveWidth(next);
  }
  function onResizeUp(e) {
    const r = resizeRef.current;
    if (!r.active) return;
    e.stopPropagation();
    r.active = false;
    if (liveWidth != null && Math.abs(liveWidth - widthPx) > 1) {
      onResize(task.id, liveWidth);
    }
    setLiveWidth(null);
  }

  const { dragPos, handlers } = useCardDrag({
    leftPct,
    topVh,
    enabled: !isEditing && !isAscending && !isFloating,
    // A click (not a drag) enters edit mode on the card.
    onClick: () => onEdit(task.id),
    onDrop: (pos) => {
      if (dragCompleteEnabled && pos.topVh < WATERLINE_VH) {
        onFloatAway(task.id, pos.leftPct, pos.topVh);
      } else {
        onReposition(
          task.id,
          Math.max(0, Math.min(100, pos.leftPct)),
          Math.max(WATERLINE_VH + 1, Math.min(FLOOR_MAX_VH, pos.topVh))
        );
      }
    },
  });

  const daysIdle = (now - task.last_touched_at) / DAY_MS;
  const sinkingSoon = daysIdle > 2 && daysIdle < 3 && depth < 1;
  const aboveWaterline =
    dragCompleteEnabled && dragPos != null && dragPos.topVh < WATERLINE_VH;

  const cls = [
    "task",
    inSky && !isFloating && !isDropping ? "in-sky" : "",
    deep ? "deep" : "",
    sinkingSoon ? "sinking-soon" : "",
    isAscending ? "ascending" : "",
    isDropping ? "dropping" : "",
    isEditing ? "editing" : "",
    aboveWaterline ? "above-waterline" : "",
    isFloating ? "floating-away" : "",
    dragPos ? "dragging" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const activeLeft = dragPos ? dragPos.leftPct : leftPct;
  const activeTop = dragPos ? dragPos.topVh : topVh;

  // Pane style — translucent glass that tints with whatever water is behind.
  // backdrop-filter does the real work; background and border are subtle.
  // Surface: mostly-white pane with bright cream rim.
  // Floor: near-transparent pane with cream-tinted glass edges.
  const bgAlpha = inSky ? 0.85 : Math.max(0.1, 0.4 - depth * 0.32);
  const borderAlpha = inSky ? 0.55 : Math.max(0.2, 0.6 - depth * 0.4);

  // Text interpolates navy → cream only in the floor zone (0.7 → 0.85).
  const t = inSky ? 0 : Math.max(0, Math.min(1, (depth - 0.7) / 0.15));
  const r = Math.round(4 + (255 - 4) * t);
  const g = Math.round(44 + (248 - 44) * t);
  const b = Math.round(83 + (220 - 83) * t);
  const titleColor = `rgb(${r}, ${g}, ${b})`;
  const metaColor = `rgba(${r}, ${g}, ${b}, ${0.65 + t * 0.1})`;

  // Each card's sway takes a unique duration + phase so the scene never
  // ticks in unison. Deeper cards bob more slowly (thicker water).
  const swayDur = 5 + hash01(task.id, 11) * 4 + depth * 2;
  const swayDelay = -hash01(task.id, 12) * 6;
  const effectiveWidth = liveWidth ?? widthPx;
  const style = {
    top: `${activeTop}vh`,
    left: `${activeLeft}%`,
    width: `${effectiveWidth}px`,
    marginLeft: `-${effectiveWidth / 2}px`, // leftPct is the card center
    background: `rgba(255, 255, 255, ${bgAlpha})`,
    borderColor: `rgba(255, 248, 220, ${borderAlpha})`,
    backdropFilter: `blur(${cardBlur}px) saturate(140%)`,
    WebkitBackdropFilter: `blur(${cardBlur}px) saturate(140%)`,
    color: titleColor,
    transition: dragPos || isDropping || liveWidth != null ? "none" : undefined,
    cursor: dragPos ? "grabbing" : "grab",
    "--sway-dur": `${swayDur.toFixed(2)}s`,
    "--sway-delay": `${swayDelay.toFixed(2)}s`,
  };
  if (isAscending) {
    // Rise clear of the viewport from wherever the card currently sits.
    style["--ascent-d"] = `${-(topVh * window.innerHeight) / 100 + 20}px`;
  }
  if (isDropping) {
    // Compute the sky-to-landing distance from the RENDERED topVh, not the
    // stored manual_y. Collision may have shifted the landing deeper to
    // avoid overlap, and we want the card to visually start in the sky
    // regardless. Same for --splash-y (the moment the card's bottom crosses
    // the waterline — though the actual splash ornament is timed by an rAF
    // watcher on the DOM rect, so this is cosmetic geometry only).
    style["--drop-from"] = `${SKY_COMPOSE_VH - topVh}vh`;
    style["--splash-y"] = `${WATERLINE_VH - CARD_H_VH - topVh}vh`;
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
      {...handlers}
      onMouseEnter={() => (focusedRef.current = task.id)}
      onMouseLeave={() => {
        if (focusedRef.current === task.id) focusedRef.current = null;
      }}
      data-task-id={task.id}
    >
      {isEditing ? (
        <EditingBody
          inputRef={inputRef}
          initial={task.title}
          onCommit={(val) => onCommitEdit(task.id, val)}
          onDiscard={() => onDiscardEdit(task.id)}
        />
      ) : (
        <>
          <ViewBody
            title={task.title}
            meta={sinkingSoon ? "sinking in 1d" : idleLabel(now - task.last_touched_at)}
            metaColor={metaColor}
            onComplete={() => onComplete(task.id)}
          />
          <div
            className="task-resize"
            onPointerDown={onResizeDown}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeUp}
            onPointerCancel={() => {
              resizeRef.current.active = false;
              setLiveWidth(null);
            }}
            aria-label="Resize card"
          />
        </>
      )}
    </div>
  );
}

function EditingBody({ inputRef, initial, onCommit, onDiscard }) {
  return (
    <>
      <input
        ref={inputRef}
        className="task-edit"
        defaultValue={initial}
        placeholder="what's on your mind?"
        onKeyDown={(e) => {
          // stopPropagation so the window-level "Enter = complete focused task"
          // shortcut never fires off of a commit keystroke.
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            onCommit(e.currentTarget.value);
          } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            onDiscard();
          }
        }}
      />
      <div className="task-meta drop-hint">enter to drop ↓</div>
    </>
  );
}

function ViewBody({ title, meta, metaColor, onComplete }) {
  return (
    <>
      <div className="task-title">{title}</div>
      <div className="task-meta" style={{ color: metaColor }}>{meta}</div>
      <button
        className="check"
        aria-label="Complete task"
        onClick={(e) => {
          e.stopPropagation();
          onComplete();
        }}
      >
        ✓
      </button>
    </>
  );
}
