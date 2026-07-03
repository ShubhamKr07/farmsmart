import React from "react";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Spread onto any element rendered as a clickable card/row so it's keyboard
 * reachable (§10): adds button role, tab order, and Enter/Space activation.
 * Pair with a `focus-visible:ring-*` class on the element for the focus ring.
 */
export function a11yClick(onClick: () => void) {
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    },
  };
}
