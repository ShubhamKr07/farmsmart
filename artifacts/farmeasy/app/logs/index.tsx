import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { LOG_TYPES } from "@/constants/facilityLogTypes";

/**
 * Data Logs category picker — reached from the hamburger's "Data Logs" row
 * (Phase 3). Six categories, each opening its own entry-form modal. This is
 * a picker, not a history/browse list — no history view in this phase (see
 * docs/alpha-app.md), the shared facility_logs table keeps every submission
 * regardless, so browsing later is additive, not a migration.
 */
export default function LogsIndexScreen() {
  const colors = useColors();
  const s = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="x" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={s.topTitle}>Data Logs</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.list}>
        {LOG_TYPES.map((def) => (
          <Pressable
            key={def.type}
            style={s.row}
            onPress={() => router.push(`/logs/${def.type}` as any)}
            testID={`logtype-${def.type}`}
          >
            <View style={s.iconBox}>
              <Feather name={def.icon as any} size={20} color={colors.primary} />
            </View>
            <View style={s.rowText}>
              <Text style={s.rowTitle}>{def.title}</Text>
              <Text style={s.rowSubtitle}>{def.subtitle}</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground },
  list: { padding: 16, gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: colors.radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: colors.radius,
    backgroundColor: colors.primary + "14",
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
  rowSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
});
