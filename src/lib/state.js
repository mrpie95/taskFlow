export const STORAGE_KEY = "currents.v1";

export const DEFAULT_SETTINGS = { sinking_days_per_zone: 3 };

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { tasks: [], settings: DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
    };
  } catch {
    return { tasks: [], settings: DEFAULT_SETTINGS };
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota / privacy-blocked storage — silently tolerate.
  }
}
