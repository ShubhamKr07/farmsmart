import {
  LayoutDashboard,
  Factory,
  Package,
  Truck,
  Grid3X3,
  User,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Primary operations destinations. Shared by Sidebar and the mobile drawer. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cycles", label: "Cycles", icon: Factory },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/shipments", label: "Shipments", icon: Truck },
  { href: "/layout", label: "Layout", icon: Grid3X3 },
];

/** Secondary system destinations. */
export const PAGE_ITEMS: NavItem[] = [
  { href: "/profile", label: "Admin Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];
