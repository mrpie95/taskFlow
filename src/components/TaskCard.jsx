import { useEffect, useRef } from "react";
import { DAY_MS, hash01, idleLabel } from "../lib/util.js";
import { CARD_H_VH, FLOOR_MAX_VH, WATERLINE_VH } from "../lib/geometry.js";
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
  dropFromVh,
  isEditing,
  isAscending,
  isFloating,
  // Interaction
  dragCompleteEnabled,
  focusedRef,
  now,
  // Callbacks
  onResurface,
  onEdit,
  onComplete,
  onCommitEdit,
  onDiscardEdit,
  onReposition,
  onFloatAway,
}) {
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
  const isDropping = dropFromVh != null;
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

  // Depth-driven styling. The goal: cards stay readable through the surface
  // and middle zones (navy text on mostly-opaque white). Only in the floor
  // zone do they flip to "glass" — cream text on translucent fill — so the
  // water reads through them like a ghost card at rest.
  const bgAlpha = inSky ? 1 : Math.max(0.38, 0.92 - depth * 0.5);
  const borderAlpha = inSky ? 0.15 : Math.max(0.12, 0.28 - depth * 0.16);
  const shadowAlpha = inSky ? 0.18 : Math.max(0, 0.1 - depth * 0.14);

  // Text color flips quickly in the floor zone (depth 0.7 → 0.85) so the
  // muddy navy-to-cream midpoint only exists in a very narrow band.
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
  const style = {
    top: `${activeTop}vh`,
    left: `${activeLeft}%`,
    width: `${widthPx}px`,
    marginLeft: `-${widthPx / 2}px`, // leftPct is the card center
    background: `rgba(255, 255, 255, ${bgAlpha})`,
    borderColor: `rgba(4, 44, 83, ${borderAlpha})`,
    boxShadow:
      shadowAlpha > 0 ? `0 6px 22px rgba(4, 44, 83, ${shadowAlpha})` : "none",
    color: titleColor,
    transition: dragPos || isDropping ? "none" : undefined,
    cursor: dragPos ? "grabbing" : "grab",
    "--sway-dur": `${swayDur.toFixed(2)}s`,
    "--sway-delay": `${swayDelay.toFixed(2)}s`,
  };
  if (isAscending) {
    // Rise clear of the viewport from wherever the card currently sits.
    style["--ascent-d"] = `${-(topVh * window.innerHeight) / 100 + 20}px`;
  }
  if (isDropping) {
    // At the splash keyframe the card's BOTTOM edge should touch the waterline.
    // top-at-splash = waterline - cardHeight, so translateY = that - landingY.
    style["--drop-from"] = `${dropFromVh}vh`;
    style["--splash-y"] = `${WATERLINE_VH - CARD_H_VH - task.manual_y}vh`;
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
        <ViewBody
          title={task.title}
          meta={sinkingSoon ? "sinking in 1d" : idleLabel(now - task.last_touched_at)}
          metaColor={metaColor}
          onComplete={() => onComplete(task.id)}
        />
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
