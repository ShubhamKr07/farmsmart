import { useEffect, useState } from "react";

/**
 * A ticking "now" timestamp so relative-time UIs re-render on a schedule.
 * Defaults to a 15s tick; pass a smaller interval for tighter UIs.
 */
export function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
