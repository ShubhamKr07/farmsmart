import React from "react";
import { Link, useLocation } from "wouter";
import { NAV_ITEMS, PAGE_ITEMS } from "./nav-items";

export function Sidebar() {
  const [location] = useLocation();

  const renderItem = (item: (typeof NAV_ITEMS)[number]) => {
    const isActive = location === item.href;
    const Icon = item.icon;
    return (
      <Link key={item.href} href={item.href}>
        <div
          className={`flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-md text-sm font-medium transition-colors hover:bg-muted cursor-pointer ${
            isActive
              ? "bg-primary/10 text-primary"
              : "text-sidebar-foreground hover:text-foreground"
          }`}
          data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
          {item.label}
        </div>
      </Link>
    );
  };

  return (
    <aside className="w-64 border-r bg-sidebar flex-shrink-0 flex flex-col hidden md:flex min-h-[100dvh]">
      <div className="h-16 flex items-center px-6 border-b">
        <img src="/logo-lockup.svg" alt="FarmSmart" className="h-[37px] w-auto" />
      </div>

      <div className="flex-1 py-4 flex flex-col gap-6 px-3">
        <nav className="space-y-1">
          <div className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Operations
          </div>
          {NAV_ITEMS.map(renderItem)}
        </nav>

        <nav className="space-y-1 mt-auto">
          <div className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            System
          </div>
          {PAGE_ITEMS.map(renderItem)}
        </nav>
      </div>
    </aside>
  );
}
