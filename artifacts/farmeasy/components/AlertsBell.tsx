import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useListAlerts, getListAlertsQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

/**
 * Persistent alerts affordance — web's TopBar carries a bell with a
 * severity-colored count badge on every page; mobile had no equivalent
 * anywhere (Phase 4.1). Same query/severity logic as web's TopBar.tsx.
 */
export default function AlertsBell() {
  const colors = useColors();
  const s = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const alerts = useListAlerts(
    { status: "current", limit: 50 },
    { query: { queryKey: getListAlertsQueryKey({ status: "current", limit: 50 }), refetchInterval: 60_000 } },
  );

  const alertCount = alerts.data?.length ?? 0;
  const hasCritical = alerts.data?.some((a) => a.severity === "critical") ?? false;

  return (
    <Pressable
      style={s.wrap}
      onPress={() => router.push("/alerts" as any)}
      accessibilityLabel={`Alerts${alertCount ? ` (${alertCount} open${hasCritical ? ", critical" : ""})` : ""}`}
      hitSlop={8}
    >
      <Feather name="bell" size={20} color={colors.foreground} />
      {alertCount > 0 && (
        <View style={[s.badge, { backgroundColor: hasCritical ? colors.destructive : colors.primary }]}>
          <Text style={s.badgeText}>{alertCount > 99 ? "99+" : alertCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  wrap: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
});
