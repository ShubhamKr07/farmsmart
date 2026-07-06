import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useAppShell } from "@/context/AppShellContext";
import { useThemeOverride } from "@/context/ThemeOverrideContext";
import LogoMark from "@/components/LogoMark";
import AlertsBell from "@/components/AlertsBell";
import HealthIndicator from "@/components/HealthIndicator";

const THEME_ICON = { system: "smartphone", light: "sun", dark: "moon" } as const;

/**
 * Persistent header rendered on every tab screen (Home/Cycles/Scan) —
 * Phase 4.1. Replaces Home-only hamburger reach (a real dead end: Cycles
 * and Scan had no way to reach Sign Out) with a shared trigger, and adds
 * the always-there affordances web's TopBar has that mobile lacked
 * entirely: alerts, connectivity, manual theme override.
 */
export default function AppHeader() {
  const colors = useColors();
  const s = useMemo(() => createStyles(colors), [colors]);
  const { openMenu } = useAppShell();
  const { override, cycle } = useThemeOverride();

  return (
    <View style={s.wrap}>
      <Pressable style={s.iconBtn} onPress={openMenu} accessibilityLabel="Open menu" testID="button-hamburger-menu">
        <Feather name="menu" size={22} color={colors.foreground} />
      </Pressable>

      <View style={s.brandRow}>
        <LogoMark size={20} />
        <Text style={s.brandText}>FarmEasy</Text>
      </View>

      <View style={s.spacer} />

      <AlertsBell />
      <HealthIndicator />
      <Pressable
        style={s.iconBtn}
        onPress={cycle}
        accessibilityLabel={`Theme: ${override}. Tap to change.`}
        hitSlop={8}
      >
        <Feather name={THEME_ICON[override]} size={18} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: 4 },
  brandText: { fontSize: 15, fontFamily: "Inter_700Bold", color: colors.primary },
  spacer: { flex: 1 },
});
