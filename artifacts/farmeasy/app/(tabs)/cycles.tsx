import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useListCycles,
  getListCyclesQueryKey,
  type Cycle,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import colors from "@/constants/colors";
import CycleCard from "@/components/CycleCard";
import { useUserRole } from "@/hooks/useUserRole";

type Tab = "ongoing" | "history";

export default function CyclesScreen() {
  const { isSupervisor } = useUserRole();
  const [activeTab, setActiveTab] = useState<Tab>("ongoing");
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: cycles, isLoading, refetch, isRefetching } = useListCycles(
    { status: activeTab },
  );

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>Crop Cycles</Text>
        <Pressable
          style={s.addBtn}
          onPress={() => router.push("/seeding" as any)}
        >
          <Feather name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      <View style={s.tabBar}>
        <Pressable
          style={[s.tab, activeTab === "ongoing" && s.tabActive]}
          onPress={() => setActiveTab("ongoing")}
        >
          <Text style={[s.tabText, activeTab === "ongoing" && s.tabTextActive]}>
            Ongoing
          </Text>
        </Pressable>
        {isSupervisor ? (
          <Pressable
            style={[s.tab, activeTab === "history" && s.tabActive]}
            onPress={() => setActiveTab("history")}
          >
            <Text style={[s.tabText, activeTab === "history" && s.tabTextActive]}>
              History
            </Text>
          </Pressable>
        ) : (
          <View style={[s.tab, s.lockedTab]}>
            <Feather name="lock" size={12} color={colors.light.mutedForeground} />
            <Text style={s.lockedTabText}> History</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.light.primary} />
        </View>
      ) : (
        <FlatList
          data={cycles ?? []}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                refetch();
                queryClient.invalidateQueries({
                  queryKey: getListCyclesQueryKey({ status: activeTab }),
                });
              }}
              tintColor={colors.light.primary}
            />
          }
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Feather name="inbox" size={40} color={colors.light.mutedForeground} />
              <Text style={s.emptyText}>
                {activeTab === "ongoing"
                  ? "No active cycles"
                  : "No completed cycles"}
              </Text>
              {activeTab === "ongoing" && (
                <Pressable
                  style={s.emptyBtn}
                  onPress={() => router.push("/seeding" as any)}
                >
                  <Text style={s.emptyBtnText}>Start a new cycle</Text>
                </Pressable>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <CycleCard
              cycle={item}
              onPress={() => router.push(`/cycle/${item.id}` as any)}
              onAction={(action) => {
                if (action === "fertigation") {
                  router.push(`/fertigation/${item.id}` as any);
                } else if (action === "harvest") {
                  router.push(`/harvest/${item.id}` as any);
                }
              }}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.light.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: colors.radius,
    backgroundColor: colors.light.muted,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: colors.light.primary,
  },
  tabText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: colors.light.mutedForeground,
  },
  tabTextActive: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },
  loadingWrap: { flex: 1, alignItems: "center", padding: 60 },
  list: { padding: 16, paddingBottom: 100 },
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
  },
  emptyBtn: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: colors.radius,
    marginTop: 8,
  },
  emptyBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  lockedTab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.45,
  },
  lockedTabText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: colors.light.mutedForeground,
  },
});
