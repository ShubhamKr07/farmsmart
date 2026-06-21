import React from "react";
import { Link, useLocation } from "wouter";

export function TopBar() {
  const [location] = useLocation();

  const getBreadcrumb = () => {
    switch (location) {
      case "/": return "Overview";
      case "/inventory": return "Inventory Management";
      case "/shipments": return "Shipments";
      case "/alerts": return "System Alerts";
      case "/bad-trays": return "Bad Trays Analysis";
      case "/layout": return "Facility Layout";
      case "/profile": return "Admin Profile";
      case "/settings": return "System Settings";
      default: return "Dashboard";
    }
  };

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">HydroFarm</span>
        <span className="text-sm text-muted-foreground">/</span>
        <span className="text-sm font-semibold text-foreground">{getBreadcrumb()}</span>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-muted-foreground">Database Connected</span>
        </div>
        <span className="text-muted-foreground">Last updated just now</span>
      </div>
    </header>
  );
}
