import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGetChannelsStatus, type ChannelResolved } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

const ROOM_LABEL: Record<string, string> = {
  seeding: "Seeding",
  fertigation: "Fertigation",
  harvesting: "Harvesting",
};

/**
 * Channel Utilization drill-down (Phase 7) — reached by tapping Home's
 * Channel Utilization card, now a plain data card with no visualization.
 * Shows per-channel tray-position availability, every room in one screen.
 */
export default function ChannelAvailabilityScreen() {
  const colors = useColors();
  const s = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const { data, isLoading } = useGetChannelsStatus();

  const byRoom = new Map<string, ChannelResolved[]>();
  for (const ch of data ?? []) {
    const list = byRoom.get(ch.room) ?? [];
    list.push(ch);
    byRoom.set(ch.room, list);
  }

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="x" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={s.topTitle}>Channel Availability</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={s.content}>
          {[...byRoom.entries()].map(([room, channels]) => (
            <View key={room} style={s.roomSection}>
              <Text style={s.roomTitle}>{ROOM_LABEL[room] ?? room}</Text>
              {channels.map((ch) => (
                <View key={ch.channelId} style={s.row}>
                  <View style={s.rowText}>
                    <Text style={s.rowTitle}>{ch.channel}</Text>
                    <Text style={s.rowSub}>{ch.totalTrays} tray positions</Text>
                  </View>
                  <View
                    style={[
                      s.availBadge,
                      { backgroundColor: (ch.isFull ? colors.destructive : colors.statusOk) + "18" },
                    ]}
                  >
                    <Text style={[s.availText, { color: ch.isFull ? colors.destructive : colors.statusOk }]}>
                      {ch.isFull ? "Full" : `${ch.availableTrays} available`}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ))}
          {byRoom.size === 0 && <Text style={s.emptyText}>No channels configured yet.</Text>}
        </ScrollView>
      )}
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
  content: { padding: 16, gap: 20 },
  roomSection: { gap: 8 },
  roomTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: colors.radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  rowText: { gap: 2 },
  rowTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground },
  rowSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
  availBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  availText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.mutedForeground,
  },
});
