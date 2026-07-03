export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatNumber(num: number) {
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(dateString));
}

/**
 * Relative time for a timestamp in milliseconds (e.g. react-query's
 * `dataUpdatedAt`). Used by the data-freshness treatment (§8 Stale state).
 */
export function formatRelativeTime(timestampMs: number | undefined, nowMs: number): string {
  if (!timestampMs) return "—";
  const diff = Math.max(0, nowMs - timestampMs);
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

/** Freshness thresholds for the Stale state (§8). Tunable. */
export const FRESHNESS_MS = {
  sensor: 2 * 60 * 1000, // 2 minutes
  alerts: 5 * 60 * 1000, // 5 minutes
} as const;

export function isStale(updatedAtMs: number | undefined, nowMs: number, thresholdMs: number): boolean {
  if (!updatedAtMs) return false;
  return nowMs - updatedAtMs > thresholdMs;
}
