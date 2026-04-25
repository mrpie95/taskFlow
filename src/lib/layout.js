import {
  CARD_H_VH,
  FLOOR_MAX_VH,
  SKY_VH,
  WATER_TOP_VH,
  WATER_RANGE_VH,
  WATERLINE_VH,
} from "./geometry.js";
import { computeDepth, hash01 } from "./util.js";

// --- Tunables ----------------------------------------------------------

const GAP_X_PX = 8;              // min horizontal breathing room between cards
const GAP_Y_VH = 1.2;            // min vertical breathing room between cards
const MAX_TRIES = 40;            // how hard we try to place a single card

// --- Public API --------------------------------------------------------

// Turn the task list into positioned, non-overlapping render items.
//
// Algorithm: priority-ordered greedy placement.
//   1. Build initial items (each card wants to sit at its manual_x / manual_y,
//      or at an auto-computed depth-based position if it has never been placed).
//   2. Sort by priority — the most-recently-touched card gets first pick, then
//      next, and so on. Auto-placed cards are last.
//   3. Place each card one at a time. If the target position overlaps any
//      card we've already placed, nudge it along the axis of smaller overlap
//      until it has room. Earlier-placed cards are immovable obstacles.
//
// Why this works where the old loop didn't:
//   - Each card is positioned exactly once. No oscillation.
//   - The card you just dropped (newest last_touched_at) *always* wins its
//     spot — it's placed first.
//   - Chains resolve naturally because every card sees all previously-placed
//     cards as fixed walls.
export function layoutTasks(
  tasks,
  settings,
  now,
  viewportWidth = 1200,
  inFlightIds = null
) {
  const items = tasks.map((t) => {
    const item = initialItem(t, settings, now);
    item.inFlight = inFlightIds ? inFlightIds.has(t.id) : false;
    return item;
  });

  const order = [...items].sort(byPlacementPriority);
  const placed = [];
  for (const item of order) {
    // In-flight cards (drop / ascent / float-away) don't go through collision
    // resolution — they land wherever their animation takes them and may
    // overlap existing cards briefly. Settled cards still resolve against
    // each other so the base scene stays clean.
    if (!item.inFlight) {
      placeWithoutOverlap(item, placed, viewportWidth);
    }
    placed.push(item);
  }

  return items.map((it) => ({
    ...it,
    deep: it.depth > 0.55,
    inSky: it.topVh < SKY_VH,
  }));
}

// --- Placement priority ------------------------------------------------
// Older settled cards go first → they keep their spots. Newer settled cards
// place around them, nudging themselves to fit (never pushing older cards
// out of the way). In-flight cards go last.
function byPlacementPriority(a, b) {
  if (a.inFlight !== b.inFlight) return a.inFlight ? 1 : -1;
  if (a.manual !== b.manual) return a.manual ? -1 : 1;
  return a.task.last_touched_at - b.task.last_touched_at;
}

// --- Core placement ----------------------------------------------------

function placeWithoutOverlap(item, placed, vw) {
  for (let tries = 0; tries < MAX_TRIES; tries++) {
    const conflict = findOverlap(item, placed, vw);
    if (!conflict) return;
    nudgeApart(item, conflict, vw);
  }
}

function findOverlap(item, placed, vw) {
  for (const p of placed) {
    if (overlapsWithGap(item, p, vw)) return p;
  }
  return null;
}

// Two cards count as overlapping if they invade each other's gap zone.
function overlapsWithGap(a, b, vw) {
  const aL = centerToLeftPx(a, vw);
  const aR = aL + a.widthPx;
  const bL = centerToLeftPx(b, vw);
  const bR = bL + b.widthPx;

  const overlapX = Math.min(aR, bR) - Math.max(aL, bL);
  const overlapY =
    Math.min(a.topVh + CARD_H_VH, b.topVh + CARD_H_VH) -
    Math.max(a.topVh, b.topVh);

  return overlapX > -GAP_X_PX && overlapY > -GAP_Y_VH;
}

// Push `item` apart from `other`. Horizontal first, so cards fill a zone
// sideways before sinking to the next. Only when both sides of the current
// row are blocked does a card get pushed down into deeper water. Floor-zone
// cards can't sink further, so they naturally spread sideways.
function nudgeApart(item, other, vw) {
  const aL = centerToLeftPx(item, vw);
  const aR = aL + item.widthPx;
  const bL = centerToLeftPx(other, vw);
  const bR = bL + other.widthPx;

  const needX = Math.min(aR, bR) - Math.max(aL, bL) + GAP_X_PX;
  const needY =
    Math.min(item.topVh + CARD_H_VH, other.topVh + CARD_H_VH) -
    Math.max(item.topVh, other.topVh) +
    GAP_Y_VH;

  if (tryPushX(item, other, needX, vw)) return;
  if (tryPushXOpposite(item, other, needX, vw)) return;
  if (tryPushDown(item, needY)) return;
  if (tryPushUp(item, needY)) return;

  // Nowhere left to go — force a downward bump regardless of bounds.
  item.topVh = Math.min(FLOOR_MAX_VH, item.topVh + needY);
}

// Unconditional downward push. Overlapping cards sink — simple and matches
// the water metaphor. Returns false only when the card is already at the
// absolute floor.
function tryPushDown(item, needY) {
  const target = item.topVh + needY;
  if (target > FLOOR_MAX_VH) return false;
  item.topVh = target;
  return true;
}

function tryPushUp(item, needY) {
  const target = item.topVh - needY;
  if (target < WATERLINE_VH + 1) return false;
  item.topVh = target;
  return true;
}

function tryPushX(item, other, needX, vw) {
  const dir = item.leftPct >= other.leftPct ? 1 : -1;
  const halfPct = halfWidthPct(item, vw);
  const target = item.leftPct + dir * (needX / vw) * 100;
  const clamped = clamp(target, halfPct, 100 - halfPct);
  if (Math.abs(clamped - target) > 0.01) return false;
  item.leftPct = clamped;
  return true;
}

function tryPushXOpposite(item, other, needX, vw) {
  const dir = item.leftPct >= other.leftPct ? -1 : 1;
  const halfPct = halfWidthPct(item, vw);
  const target = item.leftPct + dir * (needX / vw) * 100;
  const clamped = clamp(target, halfPct, 100 - halfPct);
  if (Math.abs(clamped - target) > 0.01) return false;
  item.leftPct = clamped;
  return true;
}

// --- Initial item + auto placement ------------------------------------

function initialItem(task, settings, now) {
  const manual = task.manual_x != null && task.manual_y != null;
  const timeDepth = computeDepth(task, settings, now);
  const depth = manual
    ? clamp((task.manual_y - WATER_TOP_VH) / WATER_RANGE_VH, 0, 1)
    : timeDepth;

  const widthHash = hash01(task.id, 2);
  // Honor a user-set manual width if one exists; otherwise pick a deterministic
  // width from the task's id so the same card is always the same size.
  const widthPx =
    task.manual_w != null
      ? Math.round(task.manual_w)
      : Math.round((170 + widthHash * 70) * (1 - depth * 0.22));

  // Auto placement (for any task that somehow lacks a manual position).
  // Deterministic via hash so the same id always lands in the same slot.
  const xHash = hash01(task.id, 1);
  const jitter = (hash01(task.id, 3) - 0.5) * 6;
  const autoLeftPct = 12 + xHash * 76 + jitter;
  const autoTopVh = WATER_TOP_VH + depth * WATER_RANGE_VH;

  return {
    task,
    depth,
    leftPct: manual ? task.manual_x : autoLeftPct,
    widthPx,
    topVh: manual ? task.manual_y : autoTopVh,
    manual,
  };
}

// --- Helpers -----------------------------------------------------------

function centerToLeftPx(item, vw) {
  return (item.leftPct / 100) * vw - item.widthPx / 2;
}

function halfWidthPct(item, vw) {
  return (item.widthPx / 2 / vw) * 100 + 1;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
