import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export type PanelName =
  | "alerts"
  | "bad-trays"
  | "cycles"
  | "seed-lots"
  | "action-required"
  | null;

interface PanelContextValue {
  openPanel: PanelName;
  open: (panel: PanelName) => void;
  close: () => void;
}

const PanelContext = createContext<PanelContextValue>({
  openPanel: null,
  open: () => {},
  close: () => {},
});

const PANEL_HASH_PREFIX = "panel=";
const VALID_PANELS = ["alerts", "bad-trays", "cycles", "seed-lots", "action-required"] as const;

function panelFromHash(): PanelName {
  if (typeof window === "undefined") return null;
  const h = window.location.hash.replace(/^#/, "");
  if (h.startsWith(PANEL_HASH_PREFIX)) {
    const v = h.slice(PANEL_HASH_PREFIX.length);
    if ((VALID_PANELS as readonly string[]).includes(v)) return v as PanelName;
  }
  return null;
}

export function PanelProvider({ children }: { children: React.ReactNode }) {
  const [openPanel, setOpenPanel] = useState<PanelName>(() => panelFromHash());

  // Sync state when the URL hash changes (browser back/forward, deep links).
  useEffect(() => {
    const onHash = () => setOpenPanel(panelFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Closing a panel by pressing Escape should also clear the hash.
  useEffect(() => {
    if (openPanel === null && window.location.hash) {
      // nothing to do here; hash is the source of truth
    }
  }, [openPanel]);

  const open = useCallback((panel: PanelName) => {
    if (panel) {
      // Setting the hash pushes a history entry, so browser-back closes the panel.
      window.location.hash = `${PANEL_HASH_PREFIX}${panel}`;
    } else {
      setOpenPanel(null);
    }
  }, []);

  const close = useCallback(() => {
    if (window.location.hash) {
      window.history.back();
    } else {
      setOpenPanel(null);
    }
  }, []);

  return (
    <PanelContext.Provider value={{ openPanel, open, close }}>
      {children}
    </PanelContext.Provider>
  );
}

export function usePanel() {
  return useContext(PanelContext);
}
