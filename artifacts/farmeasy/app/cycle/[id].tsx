import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useGetCycle,
  getGetCycleQueryKey,
  type ManualCheck,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import StageTracker, { type CycleStatus } from "@/components/StageTracker";

export default function CycleDetailScreen() {
  const colors = useColors();
  const s = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const cycleId = parseInt(id ?? "0");

  const {
    data: cycle,
    isLoading,
    refetch,
    isRefetching,
  } = useGetCycle(cycleId);

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (!cycle) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.emptyText}>Cycle not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const canFertigation = cycle.status === "germination";
  const canHarvest = cycle.status === "fertigation";
  const canManualCheck = cycle.status !== "completed";

  const now = Date.now();
  let fertigationDaysRemaining = 0;
  if (canFertigation && cycle.germinationStartedAt && cycle.germinationDays) {
    const dueMs = new Date(cycle.germinationStartedAt).getTime() + cycle.germinationDays * 86_400_000;
    fertigationDaysRemaining = Math.max(0, Math.ceil((dueMs - now) / 86_400_000));
  }
  let harvestDaysRemaining = 0;
  if (canHarvest && cycle.fertigationStartedAt && cycle.fertigationDays) {
    const dueMs = new Date(cycle.fertigationStartedAt).getTime() + cycle.fertigationDays * 86_400_000;
    harvestDaysRemaining = Math.max(0, Math.ceil((dueMs - now) / 86_400_000));
  }

  function DetailRow({
    icon,
    label,
    value,
  }: {
    icon: string;
    label: string;
    value: string;
  }) {
    return (
      <View style={s.detailRow}>
        <View style={s.detailLeft}>
          <Feather name={icon as any} size={14} color={colors.mutedForeground} />
          <Text style={s.detailLabel}>{label}</Text>
        </View>
        <Text style={s.detailValue}>{value}</Text>
      </View>
    );
  }

  function TimelineEntry({
    icon,
    label,
    date,
    done,
  }: {
    icon: string;
    label: string;
    date?: string | null;
    done: boolean;
  }) {
    const formatted = date
      ? new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null;
    return (
      <View style={s.timelineRow}>
        <View style={[s.timelineDot, done && s.timelineDotDone]}>
          <Feather
            name={icon as any}
            size={12}
            color={done ? "#fff" : colors.mutedForeground}
          />
        </View>
        <View style={s.timelineContent}>
          <Text style={s.timelineLabel}>{label}</Text>
          {formatted && <Text style={s.timelineDate}>{formatted}</Text>}
        </View>
      </View>
    );
  }

  function CheckCard({ check }: { check: ManualCheck }) {
    return (
      <View style={s.checkCard}>
        <View style={s.checkHeader}>
          <Text style={s.checkDate}>
            {new Date(check.createdAt).toLocaleDateString()}
          </Text>
          {check.isBadTrays && (
            <View style={s.badTrayBadge}>
              <Text style={s.badTrayText}>Bad Trays</Text>
            </View>
          )}
        </View>
        <Text style={s.checkMeta}>
          {check.fullTrays}F + {check.halfTrays}H trays
        </Text>
        {check.issue && (
          <Text style={s.checkIssue}>{check.issue}</Text>
        )}
        {check.notes && <Text style={s.checkNotes}>{check.notes}</Text>}
        {check.photoUrls.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={s.photoRow}>
              {check.photoUrls.slice(0, 4).map((uri, i) => (
                <Image key={i} source={{ uri }} style={s.checkPhoto} />
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetch();
              queryClient.invalidateQueries({
                queryKey: getGetCycleQueryKey(cycleId),
              });
            }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header card */}
        <View style={s.heroCard}>
          <View style={s.heroTop}>
            <View style={s.idChip}>
              <Text style={s.idText}>#{cycle.shortId}</Text>
            </View>
          </View>
          <Text style={s.heroName}>{cycle.seedName}</Text>
          <Text style={s.heroProfile}>{cycle.growthProfileName}</Text>
          <View style={s.trackerWrap}>
            <StageTracker status={cycle.status as CycleStatus} />
          </View>
        </View>

        {/* Details */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Details</Text>
          <DetailRow icon="calendar" label="Seeding Date" value={cycle.seedingDate} />
          <DetailRow
            icon="grid"
            label="Trays"
            value={`${cycle.fullTrays} full + ${cycle.halfTrays} half`}
          />
          <DetailRow
            icon="package"
            label="Seed Weight/Tray"
            value={`${cycle.seedWeightTray} g`}
          />
          {cycle.trayPosition && (
            <DetailRow icon="map-pin" label="Rack Slot" value={cycle.trayPosition} />
          )}
          {cycle.seedLotQrCodes.length > 0 && (
            <View style={s.seedLotRow}>
              <Feather name="tag" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
              <Text style={s.detailLabel}>Seed Lots</Text>
              <View style={s.seedLotChips}>
                {cycle.seedLotQrCodes.map((qr) => (
                  <Pressable
                    key={qr}
                    onPress={() => router.push({ pathname: "/seed-lot/[qrCode]", params: { qrCode: qr } })}
                    style={s.seedLotChip}
                  >
                    <Text style={s.seedLotChipText} numberOfLines={1}>{qr}</Text>
                    <Feather name="chevron-right" size={12} color={colors.primary} />
                  </Pressable>
                ))}
              </View>
            </View>
          )}
          <DetailRow
            icon="clock"
            label="Germination"
            value={`${cycle.germinationDays} days`}
          />
          <DetailRow
            icon="droplet"
            label="Fertigation"
            value={`${cycle.fertigationDays} days`}
          />
          {cycle.harvestedQty && (
            <DetailRow
              icon="trending-up"
              label="Harvested"
              value={`${cycle.harvestedQty} g`}
            />
          )}
          {(cycle.daysOverdueFertigation ?? 0) > 0 && (
            <View style={s.overdueAlert}>
              <Feather
                name="alert-circle"
                size={16}
                color={colors.destructive}
              />
              <Text style={s.overdueAlertText}>
                Fertigation is {cycle.daysOverdueFertigation} day(s) overdue
              </Text>
            </View>
          )}
          {(cycle.daysOverdueHarvest ?? 0) > 0 && (
            <View style={s.overdueAlert}>
              <Feather
                name="alert-circle"
                size={16}
                color={colors.destructive}
              />
              <Text style={s.overdueAlertText}>
                Harvest is {cycle.daysOverdueHarvest} day(s) overdue
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        {canFertigation && fertigationDaysRemaining > 0 && (
          <View style={s.lockedBtn}>
            <Feather name="lock" size={18} color={colors.mutedForeground} />
            <Text style={s.lockedBtnText}>Locked — {fertigationDaysRemaining}d remaining</Text>
          </View>
        )}
        {canFertigation && fertigationDaysRemaining === 0 && (
          <Pressable
            style={s.actionBtn}
            onPress={() => router.push(`/fertigation/${cycleId}` as any)}
          >
            <Feather name="droplet" size={18} color="#fff" />
            <Text style={s.actionBtnText}>Move to Fertigation</Text>
          </Pressable>
        )}
        {canHarvest && harvestDaysRemaining > 0 && (
          <View style={[s.lockedBtn, { marginBottom: 10 }]}>
            <Feather name="lock" size={18} color={colors.mutedForeground} />
            <Text style={s.lockedBtnText}>Locked — {harvestDaysRemaining}d remaining</Text>
          </View>
        )}
        {canHarvest && harvestDaysRemaining === 0 && (
          <Pressable
            style={[s.actionBtn, { backgroundColor: "#F59E0B" }]}
            onPress={() => router.push(`/harvest/${cycleId}` as any)}
          >
            <Feather name="scissors" size={18} color="#fff" />
            <Text style={s.actionBtnText}>Harvest</Text>
          </Pressable>
        )}
        {canManualCheck && (
          <Pressable
            style={s.secondaryBtn}
            onPress={() => router.push(`/manual-check/${cycleId}` as any)}
          >
            <Feather name="clipboard" size={18} color={colors.primary} />
            <Text style={s.secondaryBtnText}>Manual Check</Text>
          </Pressable>
        )}

        {/* Lifecycle Timeline */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Lifecycle Timeline</Text>
          <TimelineEntry icon="sun" label="Seeding" date={cycle.seedingDate} done />
          {cycle.germinationStartedAt && (
            <TimelineEntry
              icon="clock"
              label="Germination started"
              date={cycle.germinationStartedAt}
              done={!!cycle.fertigationStartedAt}
            />
          )}
          {cycle.fertigationStartedAt ? (
            <TimelineEntry
              icon="droplet"
              label="Fertigation started"
              date={cycle.fertigationStartedAt}
              done={!!cycle.harvestStartedAt}
            />
          ) : null}
          {cycle.harvestStartedAt ? (
            <TimelineEntry
              icon="scissors"
              label="Harvest started"
              date={cycle.harvestStartedAt}
              done={!!cycle.closedAt}
            />
          ) : null}
          {cycle.closedAt ? (
            <TimelineEntry
              icon="check-circle"
              label="Completed"
              date={cycle.closedAt}
              done
            />
          ) : null}
        </View>

        {/* Manual Checks */}
        {(cycle.manualChecks?.length ?? 0) > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>
              Manual Checks ({cycle.manualChecks!.length})
            </Text>
            {cycle.manualChecks!.map((check) => (
              <CheckCard key={check.id} check={check} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: colors.mutedForeground,
  },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: colors.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  heroTop: { flexDirection: "row", marginBottom: 8 },
  idChip: {
    backgroundColor: colors.muted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  idText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: colors.mutedForeground,
  },
  heroName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: colors.foreground,
    marginBottom: 2,
  },
  heroProfile: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.mutedForeground,
    marginBottom: 14,
  },
  trackerWrap: {},
  card: {
    backgroundColor: colors.card,
    borderRadius: colors.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: colors.foreground,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.mutedForeground,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: colors.foreground,
    maxWidth: "50%",
    textAlign: "right",
  },
  overdueAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.destructive + "15",
    padding: 12,
    borderRadius: colors.radius,
    marginTop: 8,
  },
  overdueAlertText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: colors.destructive,
  },
  lockedBtn: {
    flexDirection: "row",
    height: 50,
    borderRadius: colors.radius,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
  },
  lockedBtnText: {
    color: colors.mutedForeground,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  actionBtn: {
    flexDirection: "row",
    height: 50,
    borderRadius: colors.radius,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  secondaryBtn: {
    flexDirection: "row",
    height: 50,
    borderRadius: colors.radius,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  secondaryBtnText: {
    color: colors.primary,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  checkCard: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  checkHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  checkDate: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: colors.foreground,
  },
  badTrayBadge: {
    backgroundColor: colors.destructive + "20",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badTrayText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: colors.destructive,
  },
  checkMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.mutedForeground,
    marginBottom: 4,
  },
  checkIssue: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.destructive,
    marginBottom: 4,
  },
  checkNotes: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.mutedForeground,
    marginBottom: 8,
  },
  photoRow: { flexDirection: "row", gap: 8 },
  checkPhoto: {
    width: 80,
    height: 80,
    borderRadius: colors.radius,
    backgroundColor: colors.muted,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  timelineDotDone: { backgroundColor: colors.primary },
  timelineContent: { flex: 1 },
  timelineLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: colors.foreground,
  },
  timelineDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.mutedForeground,
    marginTop: 2,
  },
  seedLotRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  seedLotChips: { flex: 1, gap: 4 },
  seedLotChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.secondary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  seedLotChipText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.primary,
    flex: 1,
  },
});
