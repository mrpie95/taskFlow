import { useEffect, useState } from "react";

// A `now` value that ticks on an interval and pauses when the tab is hidden.
// Used to recompute depth + idle labels without burning cycles.
export function useClock(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let id = setInterval(() => setNow(Date.now()), intervalMs);

    function onVisibility() {
      clearInterval(id);
      if (!document.hidden) {
        setNow(Date.now());
        id = setInterval(() => setNow(Date.now()), intervalMs);
      }
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs]);

  return now;
}
