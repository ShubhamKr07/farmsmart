import React, { createContext, useContext, useState } from "react";

interface AppShellContextValue {
  menuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);

/**
 * Hamburger menu open/close state, lifted out of Home into the tabs layout
 * (Phase 4.1) so every tab screen's AppHeader can trigger it — Home-only
 * reach was a real dead end (Cycles/Scan had no way to reach Sign Out).
 */
export function AppShellProvider({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <AppShellContext.Provider
      value={{
        menuOpen,
        openMenu: () => setMenuOpen(true),
        closeMenu: () => setMenuOpen(false),
      }}
    >
      {children}
    </AppShellContext.Provider>
  );
}

export function useAppShell() {
  const ctx = useContext(AppShellContext);
  if (!ctx) throw new Error("useAppShell must be used within AppShellProvider");
  return ctx;
}
