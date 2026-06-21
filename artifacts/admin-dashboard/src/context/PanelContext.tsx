import React, { createContext, useContext, useState } from "react";

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

export function PanelProvider({ children }: { children: React.ReactNode }) {
  const [openPanel, setOpenPanel] = useState<PanelName>(null);
  return (
    <PanelContext.Provider
      value={{ openPanel, open: setOpenPanel, close: () => setOpenPanel(null) }}
    >
      {children}
    </PanelContext.Provider>
  );
}

export function usePanel() {
  return useContext(PanelContext);
}
