import { useState } from "react";

const STORAGE_KEY = "farmsmart.rightPanel.collapsed";

/** Persists the right panel's collapsed/expanded state across reloads. */
export function useRightPanelCollapsed(): [boolean, (next: boolean) => void] {
  const [collapsed, setCollapsedState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const setCollapsed = (next: boolean) => {
    setCollapsedState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // localStorage unavailable (private browsing, etc.) — in-memory state still works
    }
  };

  return [collapsed, setCollapsed];
}
