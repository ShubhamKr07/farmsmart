import { useColorScheme } from "react-native";

import colors from "@/constants/colors";
import { useThemeOverride } from "@/context/ThemeOverrideContext";

/**
 * Returns the design tokens for the current color scheme.
 *
 * The returned object contains all color tokens for the active palette
 * plus scheme-independent values like `radius`. Switches to `colors.dark`
 * (mirrors the web dashboard's dark palette) based on the device's
 * appearance setting, unless overridden in-app (Phase 4.1's manual theme
 * toggle) via `ThemeOverrideProvider`.
 */
export function useColors() {
  const systemScheme = useColorScheme();
  const { override } = useThemeOverride();
  const isDark = override === "system" ? systemScheme === "dark" : override === "dark";
  const palette = isDark ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius, scheme: isDark ? ("dark" as const) : ("light" as const) };
}
