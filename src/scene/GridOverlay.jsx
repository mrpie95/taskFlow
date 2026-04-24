import {
  COL_WIDTH_PCT,
  GRID_BOTTOM_VH,
  GRID_COLS,
  GRID_ROWS,
  GRID_TOP_VH,
  ROW_HEIGHT_VH,
} from "../lib/grid.js";

// A faint grid shown when organise-mode is on. Purely decorative — snapping
// is done in the reposition callback, not here.
export function GridOverlay() {
  const cols = [];
  for (let c = 1; c < GRID_COLS; c++) cols.push(c * COL_WIDTH_PCT);

  const rows = [];
  for (let r = 1; r < GRID_ROWS; r++) rows.push(GRID_TOP_VH + r * ROW_HEIGHT_VH);

  return (
    <div
      className="grid-overlay"
      aria-hidden="true"
      style={{ top: `${GRID_TOP_VH}vh`, height: `${GRID_BOTTOM_VH - GRID_TOP_VH}vh` }}
    >
      {cols.map((x) => (
        <div key={`c${x}`} className="grid-line grid-col" style={{ left: `${x}%` }} />
      ))}
      {rows.map((y) => (
        <div
          key={`r${y}`}
          className="grid-line grid-row"
          style={{ top: `${y - GRID_TOP_VH}vh` }}
        />
      ))}
    </div>
  );
}
