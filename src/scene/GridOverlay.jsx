import {
  COL_WIDTH_PCT,
  GRID_BOTTOM_VH,
  GRID_TOP_VH,
  ROW_HEIGHT_VH,
} from "../lib/grid.js";

// A dotted grid rendered as a single background-image. Each cell has one dot
// at its center; that's where dropped cards snap to.
export function GridOverlay() {
  return (
    <div
      className="grid-overlay"
      aria-hidden="true"
      style={{
        top: `${GRID_TOP_VH}vh`,
        height: `${GRID_BOTTOM_VH - GRID_TOP_VH}vh`,
        backgroundSize: `${COL_WIDTH_PCT}% ${ROW_HEIGHT_VH}vh`,
        backgroundPosition: `${COL_WIDTH_PCT / 2}% ${ROW_HEIGHT_VH / 2}vh`,
      }}
    />
  );
}
