import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ThemeOverride = "light" | "dark" | "system";

const STORAGE_KEY = "farmeasy.themeOverride";

interface ThemeOverrideContextValue {
  override: ThemeOverride;
  setOverride: (value: ThemeOverride) => void;
  cycle: () => void;
}

const ThemeOverrideContext = createContext<ThemeOverrideContextValue | null>(null);

/**
 * Explicit in-app light/dark override, additive to the automatic OS-driven
 * dark mode from Phase 1 (`userInterfaceStyle: "automatic"`). Web has a
 * manual theme-toggle button always available; mobile had none.
 *
 * A single provider mounted once at the root (not a hook re-instantiated in
 * every component that calls useColors()) — a per-component AsyncStorage
 * -backed hook would desync/flicker as each instance resolves its async
 * read independently.
 */
export function ThemeOverrideProvider({ children }: { children: React.ReactNode }) {
  const [override, setOverrideState] = useState<ThemeOverride>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === "light" || value === "dark" || value === "system") {
        setOverrideState(value);
      }
    });
  }, []);

  const setOverride = useCallback((value: ThemeOverride) => {
    setOverrideState(value);
    AsyncStorage.setItem(STORAGE_KEY, value);
  }, []);

  const cycle = useCallback(() => {
    setOverrideState((current) => {
      const next = current === "system" ? "light" : current === "light" ? "dark" : "system";
      AsyncStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return (
    <ThemeOverrideContext.Provider value={{ override, setOverride, cycle }}>
      {children}
    </ThemeOverrideContext.Provider>
  );
}

export function useThemeOverride() {
  const ctx = useContext(ThemeOverrideContext);
  if (!ctx) throw new Error("useThemeOverride must be used within ThemeOverrideProvider");
  return ctx;
}
