import { useRef, useState } from "react";

const MOVE_THRESHOLD_PX = 4;

// Encapsulates pointer-based dragging for a single card. The caller decides
// what to do on release (complete vs. reposition vs. treat-as-click).
export function useCardDrag({ leftPct, topVh, enabled, onClick, onDrop }) {
  const state = useRef({
    active: false,
    moved: false,
    sx: 0,
    sy: 0,
    ox: 0,
    oy: 0,
  });
  const [dragPos, setDragPos] = useState(null);

  function onPointerDown(e) {
    if (!enabled) return;
    // Don't start a drag from interactive children (✓ button, text input).
    if (e.target.closest(".check") || e.target.closest("input")) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    state.current = {
      active: true,
      moved: false,
      sx: e.clientX,
      sy: e.clientY,
      ox: leftPct,
      oy: topVh,
    };
  }

  function onPointerMove(e) {
    const s = state.current;
    if (!s.active) return;
    const dx = e.clientX - s.sx;
    const dy = e.clientY - s.sy;
    if (!s.moved && Math.hypot(dx, dy) < MOVE_THRESHOLD_PX) return;
    s.moved = true;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setDragPos({
      leftPct: s.ox + (dx / vw) * 100,
      topVh: s.oy + (dy / vh) * 100,
    });
  }

  function onPointerUp() {
    const s = state.current;
    if (!s.active) return;
    s.active = false;
    if (s.moved && dragPos) {
      onDrop(dragPos);
    } else {
      onClick?.();
    }
    setDragPos(null);
  }

  function onPointerCancel() {
    state.current.active = false;
    setDragPos(null);
  }

  return {
    dragPos,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
  };
}
