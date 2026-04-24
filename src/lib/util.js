export const DAY_MS = 24 * 60 * 60 * 1000;

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Deterministic 0..1 hash from a task id. The salt lets us ask multiple
// independent "rolls" from the same id (width, jitter, landing y, etc.).
export function hash01(id, salt = 0) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

// 0 = surface, 1 = floor. Grows with days untouched.
export function computeDepth(task, settings, now) {
  const daysIdle = Math.max(0, (now - task.last_touched_at) / DAY_MS);
  const zoneUnits = daysIdle / settings.sinking_days_per_zone;
  return Math.max(0, Math.min(1, zoneUnits / 3));
}

export function idleLabel(ms) {
  if (ms < 60_000) return "just now";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m idle`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h idle`;
  return `${Math.floor(hrs / 24)}d idle`;
}
