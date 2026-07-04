import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import {
  type MetricDef,
  type MetricTab,
  defaultKeysForTab,
  metricsForTab,
} from "@workspace/metrics";

/**
 * Per-tab metric selection, persisted to localStorage keyed by Clerk user id.
 * Seeded from the registry defaults so the first render reproduces today's
 * widgets. M1: only Tier-A metrics (`source !== "metrics"`) are selectable —
 * Tier-B entries appear once `/api/metrics` ships (M2).
 */
export function useMetricSelection(tab: MetricTab) {
  const { user, isLoaded } = useUser();
  const uid = user?.id ?? "anon";
  const storageKey = `farmsmart.metrics.${tab}.${uid}`;

  /** Metrics visible in this tab's picker (Tier A only in M1). */
  const selectable: MetricDef[] = metricsForTab(tab).filter(
    (m) => m.source !== "metrics",
  );

  const [selected, setSelected] = useState<string[]>(() =>
    defaultKeysForTab(tab),
  );

  // Hydrate from localStorage once the Clerk user id is known.
  useEffect(() => {
    if (!isLoaded) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) {
          const valid = new Set(selectable.map((m) => m.id));
          setSelected(parsed.filter((id) => valid.has(id)));
        }
      } else {
        setSelected(defaultKeysForTab(tab));
      }
    } catch {
      setSelected(defaultKeysForTab(tab));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, storageKey, tab]);

  const persist = useCallback(
    (next: string[]) => {
      setSelected(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore quota / private-mode errors */
      }
    },
    [storageKey],
  );

  const toggle = useCallback(
    (id: string) => {
      setSelected((cur) => {
        const next = cur.includes(id)
          ? cur.filter((x) => x !== id)
          : [...cur, id];
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [storageKey],
  );

  const reset = useCallback(() => {
    persist(defaultKeysForTab(tab));
  }, [persist, tab]);

  return { selected, selectable, toggle, reset };
}
