import { FLOOR_MAX_VH, WATER_TOP_VH } from "./geometry.js";

// Organise-mode grid. Cells are centered; cards snap to the center of the
// nearest cell on drop. Kept simple on purpose — no mass snap-aligning
// of pre-existing cards, no cell-occupancy check.

export const GRID_COLS = 12;
export const GRID_ROWS = 14;
export const GRID_TOP_VH = WATER_TOP_VH + 1;
export const GRID_BOTTOM_VH = FLOOR_MAX_VH - 4; // keep the seabed clear
export const COL_WIDTH_PCT = 100 / GRID_COLS;
export const ROW_HEIGHT_VH = (GRID_BOTTOM_VH - GRID_TOP_VH) / GRID_ROWS;

export function snapToGrid(leftPct, topVh) {
  const colOffset = COL_WIDTH_PCT / 2;
  const rowOffset = ROW_HEIGHT_VH / 2;

  const col = Math.round((leftPct - colOffset) / COL_WIDTH_PCT);
  const row = Math.round((topVh - GRID_TOP_VH - rowOffset) / ROW_HEIGHT_VH);

  const clampedCol = Math.max(0, Math.min(GRID_COLS - 1, col));
  const clampedRow = Math.max(0, Math.min(GRID_ROWS - 1, row));

  return {
    leftPct: clampedCol * COL_WIDTH_PCT + colOffset,
    topVh: GRID_TOP_VH + clampedRow * ROW_HEIGHT_VH + rowOffset,
  };
}
