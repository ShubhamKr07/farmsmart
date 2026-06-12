import { useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import Svg, { Polyline, Line, Text as SvgText } from "react-native-svg";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useGetDashboard,
  getGetDashboardQueryKey,
  type ActionRequiredItem,
} from "@workspace/api-client-react";
import colors from "@/constants/colors";
import { useSignOutAndClear } from "@/hooks/useSignOutAndClear";
import { useUserRole } from "@/hooks/useUserRole";

type ActionFilter = "all" | "fertigation" | "harvest";
type YieldPeriod = "week" | "month";

export default function HomeScreen() {
  const { user } = useUser();
  const { label: roleLabel } = useUserRole();
  const router = useRouter();
  const queryClient = useQueryClient();
  const signOut = useSignOutAndClear();

  const [yieldPeriod, setYieldPeriod] = useState<YieldPeriod>("week");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");

  const { data: stats, isLoading, refetch, isRefetching } = useGetDashboard();

  const utilizationPct = Math.round((stats?.channelUtilization ?? 0) * 100);

  const filteredActions = (stats?.actionRequired ?? []).filter((item) => {
    if (actionFilter === "all") return true;
    return item.type === actionFilter;
  });

  const handleActionPress = (item: ActionRequiredItem) => {
    if (item.type === "fertigation") {
      router.push(`/fertigation/${item.cycleId}` as any);
    } else {
      router.push(`/harvest/${item.cycleId}` as any);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetch();
              queryClient.invalidateQueries({
                queryKey: getGetDashboardQueryKey(),
              });
            }}
            tintColor={colors.light.primary}
          />
        }
      >
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Good {getGreeting()},</Text>
            <Text style={s.userName}>
              {user?.firstName ??
                user?.emailAddresses[0]?.emailAddress?.split("@")[0] ??
                "Technician"}
            </Text>
            <View style={s.roleBadge}>
              <Text style={s.roleText}>{roleLabel}</Text>
            </View>
          </View>
          <Pressable
            style={s.avatarBtn}
            onPress={signOut}
            accessibilityLabel="Sign out"
            testID="sign-out-btn"
          >
            <Text style={s.avatarText}>
              {(
                user?.firstName?.[0] ??
                user?.emailAddresses[0]?.emailAddress?.[0] ??
                "T"
              ).toUpperCase()}
            </Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={colors.light.primary} />
          </View>
        ) : (
          <>
            <View style={s.statsRow}>
              <View style={[s.statCard, { flex: 1.2 }]}>
                <Text style={s.statLabel}>Channel Utilization</Text>
                <Text style={s.statValue}>{utilizationPct}%</Text>
                <View style={s.progressTrack}>
                  <View
                    style={[
                      s.progressFill,
                      {
                        width: `${Math.min(utilizationPct, 100)}%` as any,
                        backgroundColor:
                          utilizationPct > 80
                            ? colors.light.warning
                            : colors.light.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={s.statSub}>
                  {stats?.totalRunningCycles ?? 0}/
                  {stats?.totalChannels ?? 20} channels
                </Text>
              </View>
              <View style={[s.statCard, { flex: 0.8 }]}>
                <Text style={s.statLabel}>Running</Text>
                <Text style={s.statValue}>
                  {stats?.totalRunningCycles ?? 0}
                </Text>
                <Text style={s.statSub}>active cycles</Text>
              </View>
            </View>

            <View style={s.card}>
              <View style={s.cardHeaderRow}>
                <Text style={s.cardTitle}>Total Yield</Text>
                <View style={s.toggle}>
                  <Pressable
                    style={[s.toggleBtn, yieldPeriod === "week" && s.toggleBtnActive]}
                    onPress={() => setYieldPeriod("week")}
                  >
                    <Text style={[s.toggleBtnText, yieldPeriod === "week" && s.toggleBtnTextActive]}>
                      Week
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[s.toggleBtn, yieldPeriod === "month" && s.toggleBtnActive]}
                    onPress={() => setYieldPeriod("month")}
                  >
                    <Text style={[s.toggleBtnText, yieldPeriod === "month" && s.toggleBtnTextActive]}>
                      Month
                    </Text>
                  </Pressable>
                </View>
              </View>
              <YieldLineChart
                yieldData={yieldPeriod === "week" ? ((stats as any)?.yieldByDay ?? []) : ((stats as any)?.yieldByWeek ?? [])}
                seedingData={yieldPeriod === "week" ? ((stats as any)?.seedingByDay ?? []) : ((stats as any)?.seedingByWeek ?? [])}
                badTrayData={yieldPeriod === "week" ? ((stats as any)?.badTrayByDay ?? []) : ((stats as any)?.badTrayByWeek ?? [])}
              />
              <View style={s.yieldTotalRow}>
                <Text style={s.yieldTotalLabel}>
                  {yieldPeriod === "week" ? "7-day total" : "Month total"}
                </Text>
                <Text style={s.yieldNum}>
                  {yieldPeriod === "week"
                    ? formatGrams(stats?.totalYieldThisWeek ?? 0)
                    : formatGrams(stats?.totalYieldThisMonth ?? 0)}
                </Text>
              </View>
            </View>

            <View style={s.card}>
              <View style={s.cardHeaderRow}>
                <View style={s.cardTitleWrap}>
                  <Text style={s.cardTitle}>Action Required</Text>
                  {(stats?.actionRequired?.length ?? 0) > 0 && (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>
                        {stats!.actionRequired.length}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={s.filterChips}>
                {(["all", "fertigation", "harvest"] as ActionFilter[]).map((f) => (
                  <Pressable
                    key={f}
                    style={[s.chip, actionFilter === f && s.chipActive]}
                    onPress={() => setActionFilter(f)}
                  >
                    <Text style={[s.chipText, actionFilter === f && s.chipTextActive]}>
                      {f === "all" ? "All" : f === "fertigation" ? "Fertigation" : "Harvest"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {!filteredActions.length ? (
                <Text style={s.emptyText}>
                  {actionFilter === "all"
                    ? "All cycles on schedule 🌿"
                    : `No ${actionFilter} actions pending`}
                </Text>
              ) : (
                filteredActions.map((item) => (
                  <Pressable
                    key={item.cycleId}
                    style={s.actionItem}
                    onPress={() => handleActionPress(item)}
                  >
                    <View style={s.actionLeft}>
                      <View
                        style={[
                          s.actionDot,
                          {
                            backgroundColor:
                              item.daysOverdue > 1
                                ? colors.light.destructive
                                : colors.light.warning,
                          },
                        ]}
                      />
                      <View>
                        <Text style={s.actionName}>{item.seedName}</Text>
                        <Text style={s.actionSub}>
                          #{item.cycleShortId} ·{" "}
                          {item.type === "fertigation"
                            ? "Move to Fertigation"
                            : "Ready to Harvest"}
                        </Text>
                      </View>
                    </View>
                    <View style={s.actionRight}>
                      <Text style={s.overdueText}>
                        {item.daysOverdue}d overdue
                      </Text>
                      <Feather
                        name="chevron-right"
                        size={16}
                        color={colors.light.mutedForeground}
                      />
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Pressable style={s.fab} onPress={() => router.push("/seeding" as any)}>
        <Feather name="plus" size={26} color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
}

function YieldLineChart({
  yieldData,
  seedingData,
  badTrayData,
}: {
  yieldData: { label: string; value: number }[];
  seedingData: { label: string; value: number }[];
  badTrayData: { label: string; value: number }[];
}) {
  const VW = 300;
  const VH = 110;
  const PL = 28;
  const PR = 6;
  const PT = 6;
  const PB = 20;
  const chartW = VW - PL - PR;
  const chartH = VH - PT - PB;

  const n = Math.max(yieldData.length, 2);
  const allVals = [...yieldData, ...seedingData, ...badTrayData].map((d) => d.value);
  const maxVal = Math.max(...allVals, 1);

  function pts(data: { value: number }[]) {
    if (data.length < 2) return "";
    return data
      .map((d, i) => {
        const x = PL + (i / (n - 1)) * chartW;
        const y = PT + chartH - (d.value / maxVal) * chartH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  const labels = yieldData.map((d) => d.label);

  return (
    <View style={s.lineChartWrap}>
      <Svg width="100%" height={VH} viewBox={`0 0 ${VW} ${VH}`}>
        <Line x1={PL} y1={PT} x2={PL} y2={PT + chartH} stroke="#e5e7eb" strokeWidth={1} />
        <Line x1={PL} y1={PT + chartH} x2={VW - PR} y2={PT + chartH} stroke="#e5e7eb" strokeWidth={1} />
        {yieldData.length >= 2 && (
          <Polyline points={pts(yieldData)} fill="none" stroke="#22c55e" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        )}
        {seedingData.length >= 2 && (
          <Polyline points={pts(seedingData)} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        )}
        {badTrayData.length >= 2 && (
          <Polyline points={pts(badTrayData)} fill="none" stroke="#ef4444" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        )}
        {labels.map((label, i) => (
          <SvgText
            key={i}
            x={PL + (i / (n - 1)) * chartW}
            y={VH - 4}
            fontSize={8}
            fill="#9ca3af"
            textAnchor="middle"
          >
            {label}
          </SvgText>
        ))}
      </Svg>
      <View style={s.chartLegend}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: "#22c55e" }]} />
          <Text style={s.legendLabel}>Yield</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: "#3b82f6" }]} />
          <Text style={s.legendLabel}>Seeding</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: "#ef4444" }]} />
          <Text style={s.legendLabel}>Bad Trays</Text>
        </View>
      </View>
    </View>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function formatGrams(g: number) {
  if (g >= 1000) return `${(g / 1000).toFixed(1)} kg`;
  return `${Math.round(g)} g`;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.light.background },
  scroll: { padding: 16, paddingBottom: 100 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
  },
  userName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
  },
  roleBadge: {
    marginTop: 4,
    alignSelf: "flex-start",
    backgroundColor: colors.light.muted,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  roleText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  loadingWrap: { flex: 1, alignItems: "center", padding: 60 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  statCard: {
    backgroundColor: colors.light.card,
    borderRadius: colors.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: colors.light.mutedForeground,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
    marginBottom: 8,
  },
  statSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginTop: 4,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.light.muted,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  card: {
    backgroundColor: colors.light.card,
    borderRadius: colors.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.foreground,
  },
  badge: {
    backgroundColor: colors.light.destructive,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: colors.light.muted,
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: colors.light.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleBtnText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: colors.light.mutedForeground,
  },
  toggleBtnTextActive: {
    color: colors.light.foreground,
    fontFamily: "Inter_600SemiBold",
  },
  lineChartWrap: {
    marginBottom: 8,
  },
  chartLegend: {
    flexDirection: "row",
    gap: 16,
    marginTop: 6,
    marginBottom: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
  },
  yieldTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  yieldTotalLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
  },
  yieldNum: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: colors.light.primary,
  },
  filterChips: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.light.muted,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  chipActive: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: colors.light.mutedForeground,
  },
  chipTextActive: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    textAlign: "center",
    paddingVertical: 12,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  actionLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  actionDot: { width: 10, height: 10, borderRadius: 5 },
  actionName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: colors.light.foreground,
  },
  actionSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginTop: 1,
  },
  actionRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  overdueText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: colors.light.destructive,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
