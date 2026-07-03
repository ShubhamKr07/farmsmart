import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { usePanel, type PanelName } from "@/context/PanelContext";
import { NAV_ITEMS, PAGE_ITEMS } from "@/components/layout/nav-items";
import { Bell, AlertTriangle, Leaf, TrendingUp, Factory } from "lucide-react";

const PANEL_ACTIONS: { name: PanelName; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { name: "alerts", label: "System Alerts", icon: Bell },
  { name: "bad-trays", label: "Bad Trays Analysis", icon: AlertTriangle },
  { name: "cycles", label: "Active Cycles", icon: Factory },
  { name: "seed-lots", label: "Active Seed Lots", icon: Leaf },
  { name: "action-required", label: "Cycles Needing Action", icon: TrendingUp },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const { open: openPanel } = usePanel();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onOpen);
    };
  }, []);

  const go = (href: string) => {
    navigate(href);
    setOpen(false);
  };
  const openP = (name: PanelName) => {
    openPanel(name);
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages and actions…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {NAV_ITEMS.map((item) => (
            <CommandItem key={item.href} value={`${item.label} ${item.href}`} onSelect={() => go(item.href)}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </CommandItem>
          ))}
          {PAGE_ITEMS.map((item) => (
            <CommandItem key={item.href} value={`${item.label} ${item.href}`} onSelect={() => go(item.href)}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Open panel">
          {PANEL_ACTIONS.map((a) => (
            <CommandItem key={a.label} value={a.label} onSelect={() => openP(a.name)}>
              <a.icon className="mr-2 h-4 w-4" />
              {a.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
