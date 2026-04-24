import { computeDepth, hash01 } from "./util.js";
import { SKY_VH, WATER_TOP_VH, WATER_RANGE_VH } from "./geometry.js";

const PHI = 0.61803398875;
const GAP_X_PX = 8;
const GAP_Y_VH = 1.2;
const CARD_H_VH = 6.5;
const COLLISION_PASSES = 4;

// Pure function: tasks[] -> positioned layout items[].
// A manual placement (manual_x / manual_y) overrides the time-based position.
// Overlapping cards are pushed apart horizontally via a few passes of pairwise
// separation — the non-manual / newer card moves.
export function layoutTasks(tasks, settings, now, viewportWidth = 1200) {
  const bandCounts = new Map();

  const items = tasks.map((t) => {
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

    return {
      task: t,
      depth,
      leftPct: manual ? t.manual_x : autoLeftPct,
      widthPx,
      topVh: manual ? t.manual_y : autoTopVh,
      manual,
    };
  });

  for (let pass = 0; pass < COLLISION_PASSES; pass++) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        resolveOverlap(items[i], items[j], viewportWidth);
      }
    }
  }

  return items.map((it) => ({
    ...it,
    deep: it.depth > 0.55,
    inSky: it.topVh < SKY_VH,
  }));
}

function resolveOverlap(a, b, vw) {
  const aL = (a.leftPct / 100) * vw - a.widthPx / 2;
  const aR = aL + a.widthPx;
  const bL = (b.leftPct / 100) * vw - b.widthPx / 2;
  const bR = bL + b.widthPx;

  const overlapX = Math.min(aR, bR) - Math.max(aL, bL);
  const overlapY =
    Math.min(a.topVh + CARD_H_VH, b.topVh + CARD_H_VH) -
    Math.max(a.topVh, b.topVh);

  if (overlapX <= -GAP_X_PX || overlapY <= -GAP_Y_VH) return;

  // Pick who moves: prefer to keep manually-placed cards put; otherwise newer loses.
  let mover;
  if (a.manual && !b.manual) mover = b;
  else if (!a.manual && b.manual) mover = a;
  else mover = a.task.created_at > b.task.created_at ? a : b;
  const other = mover === a ? b : a;

  const xDir = mover.leftPct >= other.leftPct ? 1 : -1;
  const pushPct = ((overlapX + GAP_X_PX) / vw) * 100;
  mover.leftPct += xDir * pushPct;

  const halfPct = (mover.widthPx / 2 / vw) * 100 + 1;
  mover.leftPct = Math.max(halfPct, Math.min(100 - halfPct, mover.leftPct));
}
