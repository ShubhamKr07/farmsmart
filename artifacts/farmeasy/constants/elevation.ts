import { useColors } from "@/hooks/useColors";

/**
 * Mirrors the web dashboard's --elevate-1/--elevate-2 shadow scale
 * (rgba(0,0,0,.03)/.08 light, rgba(255,255,255,.04)/.09 dark) so shadow depth
 * reads consistently across components instead of each one hand-rolling its
 * own shadowOpacity/shadowRadius values.
 */
export function elevation(level: 1 | 2, colors: ReturnType<typeof useColors>) {
  const isDark = colors.scheme === "dark";
  const opacity = isDark
    ? level === 1 ? 0.04 : 0.09
    : level === 1 ? 0.03 : 0.08;
  const shadowColor = isDark ? "#FFFFFF" : "#000000";

  return {
    shadowColor,
    shadowOffset: { width: 0, height: level === 1 ? 1 : 4 },
    shadowOpacity: opacity,
    shadowRadius: level === 1 ? 3 : 8,
    elevation: level === 1 ? 2 : 6,
  };
}
