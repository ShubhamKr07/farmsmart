import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const MAX_RECENT = 5;

function storageKey(logType: string, fieldKey: string) {
  return `farmeasy.logs.recent.${logType}.${fieldKey}`;
}

/**
 * Last 5 distinct values entered per log-type/field, surfaced as suggestion
 * chips (Phase 5 P1) — covers freeform fields layout autocomplete can't
 * (e.g. "Rack 3 pump"), so a technician doesn't retype the same value every
 * visit. Batches all field keys into one hook (multiGet) rather than calling
 * a per-field hook in a loop, which the rules of hooks don't allow cleanly.
 */
export function useRecentFieldValues(logType: string, fieldKeys: string[]) {
  const [recentByKey, setRecentByKey] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (fieldKeys.length === 0) return;
    AsyncStorage.multiGet(fieldKeys.map((k) => storageKey(logType, k))).then((pairs) => {
      const next: Record<string, string[]> = {};
      pairs.forEach(([storedKey, raw], i) => {
        if (!raw) return;
        try {
          next[fieldKeys[i]] = JSON.parse(raw);
        } catch {
          // ignore malformed cache entry
        }
      });
      setRecentByKey(next);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logType, fieldKeys.join(",")]);

  const addRecent = useCallback((fieldKey: string, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setRecentByKey((current) => {
      const existing = current[fieldKey] ?? [];
      const next = [trimmed, ...existing.filter((v) => v !== trimmed)].slice(0, MAX_RECENT);
      AsyncStorage.setItem(storageKey(logType, fieldKey), JSON.stringify(next));
      return { ...current, [fieldKey]: next };
    });
  }, [logType]);

  return { recentByKey, addRecent };
}
