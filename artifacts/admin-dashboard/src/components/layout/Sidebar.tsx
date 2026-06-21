import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  Truck,
  Grid3X3,
  User,
  Settings,
} from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/inventory", label: "Inventory", icon: Package },
    { href: "/shipments", label: "Shipments", icon: Truck },
    { href: "/layout", label: "Layout", icon: Grid3X3 },
  ];

  const pageItems = [
    { href: "/profile", label: "Admin Profile", icon: User },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="w-64 border-r bg-sidebar flex-shrink-0 flex flex-col hidden md:flex min-h-[100dvh]">
      <div className="h-16 flex items-center px-6 border-b">
        <span className="font-bold text-lg text-primary tracking-tight">HydroFarm</span>
      </div>
      
      <div className="flex-1 py-4 flex flex-col gap-6 px-3">
        <nav className="space-y-1">
          <div className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Operations
          </div>
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-muted cursor-pointer ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground hover:text-foreground"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
                >
                  <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <nav className="space-y-1 mt-auto">
          <div className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            System
          </div>
          {pageItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-muted cursor-pointer ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground hover:text-foreground"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
                >
                  <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
