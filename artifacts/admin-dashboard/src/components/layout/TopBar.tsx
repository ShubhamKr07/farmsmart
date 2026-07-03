import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useHealthCheck,
  useListAlerts,
  useGetDashboard,
  getHealthCheckQueryKey,
  getListAlertsQueryKey,
} from "@workspace/api-client-react";
import { Bell, Menu, RefreshCw, Wifi, WifiOff, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePanel } from "@/context/PanelContext";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import {
  formatRelativeTime,
  isStale,
  FRESHNESS_MS,
} from "@/lib/format";
import { useNow } from "@/hooks/use-now";

const PAGE_TITLES: Record<string, string> = {
  "/": "Overview",
  "/cycles": "Grow Cycles",
  "/inventory": "Inventory Management",
  "/shipments": "Shipments",
  "/alerts": "System Alerts",
  "/bad-trays": "Bad Trays Analysis",
  "/layout": "Facility Layout",
  "/profile": "Admin Profile",
  "/settings": "System Settings",
};

export function TopBar() {
  const [location] = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { open } = usePanel();
  const queryClient = useQueryClient();
  const now = useNow(15_000);

  // Real DB health (public /api/healthz endpoint).
  const health = useHealthCheck({
    query: { queryKey: getHealthCheckQueryKey(), refetchInterval: 30_000, staleTime: 15_000 },
  });

  // Alerts for the bell badge. Live, but throttled.
  const alerts = useListAlerts(
    { status: "current", limit: 50 },
    { query: { queryKey: getListAlertsQueryKey({ status: "current", limit: 50 }), refetchInterval: FRESHNESS_MS.alerts } },
  );

  // Dashboard query powers the "updated Xs ago" freshness indicator.
  const dashboard = useGetDashboard();

  const pageTitle = PAGE_TITLES[location] ?? "Dashboard";
  const alertCount = alerts.data?.length ?? 0;
  const hasCritical = alerts.data?.some((a) => a.severity === "critical") ?? false;

  const updatedAt = dashboard.dataUpdatedAt;
  const stale = isStale(updatedAt, now, FRESHNESS_MS.sensor);

  const refreshAll = () => {
    queryClient.invalidateQueries();
  };

  return (
    <>
      <header className="h-16 border-b bg-background flex items-center justify-between px-4 md:px-6 shrink-0 gap-2">
        {/* Left: mobile menu + breadcrumb */}
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-10 w-10 shrink-0"
            aria-label="Open navigation"
            onClick={() => setMobileNavOpen(true)}
            data-testid="button-mobile-nav"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <nav className="flex items-center gap-2 min-w-0" aria-label="Breadcrumb">
            <span className="text-sm font-medium text-muted-foreground truncate">FarmSmart</span>
            <span className="text-sm text-muted-foreground">/</span>
            <span className="text-sm font-semibold text-foreground truncate">{pageTitle}</span>
          </nav>
        </div>

        {/* Right: alert bell, health pill, freshness + refresh */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Alert bell — visible on every viewport (P0-4). */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-10 w-10 shrink-0"
            aria-label={`Alerts${alertCount ? ` (${alertCount} open${hasCritical ? ", critical" : ""})` : ""}`}
            onClick={() => open("alerts")}
            data-testid="button-alerts-bell"
          >
            <Bell className="h-5 w-5" />
            {alertCount > 0 && (
              <span
                className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-[18px] text-center text-white ${
                  hasCritical ? "bg-destructive" : "bg-primary"
                }`}
                data-testid="badge-alert-count"
              >
                {alertCount > 99 ? "99+" : alertCount}
              </span>
            )}
          </Button>

          {/* DB health pill (P0-3). */}
          {health.isLoading ? (
            <Skeleton className="h-6 w-28 rounded-full hidden sm:block" />
          ) : health.isError || health.data?.status !== "ok" ? (
            <span
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20"
              data-testid="pill-db-unreachable"
            >
              <WifiOff className="h-3.5 w-3.5" />
              DB unreachable
            </span>
          ) : (
            <span
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
              data-testid="pill-db-connected"
            >
              <Wifi className="h-3.5 w-3.5" />
              DB connected
            </span>
          )}

          {/* Data freshness (P0-6). */}
          <div className="hidden md:flex items-center gap-2">
            <span
              className={`text-xs ${stale ? "text-destructive font-medium" : "text-muted-foreground"}`}
              data-testid="text-updated"
            >
              {dashboard.isLoading
                ? "Loading…"
                : stale
                  ? `Stale — ${formatRelativeTime(updatedAt, now)}`
                  : `Updated ${formatRelativeTime(updatedAt, now)}`}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              aria-label="Refresh data"
              onClick={refreshAll}
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="hidden lg:inline-flex gap-2 h-9 px-2 text-muted-foreground"
            onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
            aria-label="Open command palette"
            data-testid="button-command-palette"
          >
            <Search className="h-4 w-4" />
            <span className="text-xs">Search</span>
            <kbd className="text-[10px] font-sans">⌘K</kbd>
          </Button>

          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
    </>
  );
}
