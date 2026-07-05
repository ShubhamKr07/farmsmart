import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { type Cycle } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import StageTracker, { type CycleStatus } from "./StageTracker";

interface Props {
  cycle: Cycle;
  onPress: () => void;
  onAction?: (action: "fertigation" | "harvest" | "manual-check") => void;
}

const STATUS_LABEL: Record<string, string> = {
  germination: "Germinating",
  fertigation: "Fertigation",
  harvest: "Harvesting",
  completed: "Completed",
};

// Matches web's Cycles.tsx stage-badge mapping exactly (germination: status
// -ok green, fertigation: primary green, harvest: status-warn amber) — was
// previously hardcoded Tailwind hex with fertigation as blue, a mismatch
// with web's all-green-for-growing-stages convention (Phase 4.2).
function statusColor(status: string, colors: ReturnType<typeof useColors>): string {
  const map: Record<string, string> = {
    germination: colors.statusOk,
    fertigation: colors.primary,
    harvest: colors.statusWarn,
    completed: colors.mutedForeground,
  };
  return map[status] ?? colors.mutedForeground;
}

interface CountdownResult {
  daysOverdue: number | null;
  daysUntil: number | null;
  daysRemaining: number;
  isLocked: boolean;
  actionLabel: string;
}

function getCountdown(cycle: Cycle, now: number): CountdownResult | null {
  if (cycle.status === "germination") {
    const overdue = cycle.daysOverdueFertigation ?? null;
    if (overdue !== null && overdue > 0) {
      return { daysOverdue: overdue, daysUntil: null, daysRemaining: 0, isLocked: false, actionLabel: "fertigation" };
    }
    if (cycle.germinationStartedAt) {
      const dueMs =
        new Date(cycle.germinationStartedAt).getTime() +
        cycle.germinationDays * 864e5;
      const isLocked = now < dueMs;
      const daysRemaining = isLocked ? Math.ceil((dueMs - now) / 864e5) : 0;
      const remaining = Math.floor((dueMs - now) / 864e5);
      return { daysOverdue: null, daysUntil: Math.max(remaining, 0), daysRemaining, isLocked, actionLabel: "fertigation" };
    }
    return null;
  }

  if (cycle.status === "fertigation") {
    const overdue = cycle.daysOverdueHarvest ?? null;
    if (overdue !== null && overdue > 0) {
      return { daysOverdue: overdue, daysUntil: null, daysRemaining: 0, isLocked: false, actionLabel: "harvest" };
    }
    if (cycle.fertigationStartedAt) {
      const dueMs =
        new Date(cycle.fertigationStartedAt).getTime() +
        cycle.fertigationDays * 864e5;
      const isLocked = now < dueMs;
      const daysRemaining = isLocked ? Math.ceil((dueMs - now) / 864e5) : 0;
      const remaining = Math.floor((dueMs - now) / 864e5);
      return { daysOverdue: null, daysUntil: Math.max(remaining, 0), daysRemaining, isLocked, actionLabel: "harvest" };
    }
    return null;
  }

  return null;
}

function countdownColor(result: CountdownResult, colors: ReturnType<typeof useColors>): string {
  if (result.daysOverdue !== null) return colors.destructive;
  if (result.daysUntil !== null && result.daysUntil <= 2) return colors.statusWarn;
  return colors.statusOk;
}

function countdownLabel(result: CountdownResult): string {
  if (result.daysOverdue !== null) {
    return `${result.daysOverdue}d overdue`;
  }
  if (result.daysUntil === 0) return `due today`;
  return `${result.daysUntil}d until ${result.actionLabel}`;
}

export default function CycleCard({ cycle, onPress, onAction }: Props) {
  const colors = useColors();
  const s = useMemo(() => createStyles(colors), [colors]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const countdown = getCountdown(cycle, now);
  const isOverdue = countdown !== null && countdown.daysOverdue !== null;
  const isLocked = countdown?.isLocked === true;

  const actionLabel =
    cycle.status === "germination"
      ? "Move to Fertigation"
      : cycle.status === "fertigation"
        ? "Harvest"
        : null;

  const handleAction = () => {
    if (cycle.status === "germination") onAction?.("fertigation");
    else if (cycle.status === "fertigation") onAction?.("harvest");
  };

  return (
    <Pressable
      style={[s.card, isLocked && s.cardLocked]}
      onPress={isLocked ? undefined : onPress}
    >
      <View style={s.topRow}>
        <View style={s.idChip}>
          <Text style={s.idText}>#{cycle.shortId}</Text>
        </View>
        <View style={[s.statusChip, { backgroundColor: statusColor(cycle.status, colors) + (isLocked ? "10" : "20") }]}>
          <View style={[s.statusDot, { backgroundColor: statusColor(cycle.status, colors) + (isLocked ? "60" : "ff") }]} />
          <Text style={[s.statusText, { color: statusColor(cycle.status, colors) + (isLocked ? "80" : "ff") }]}>
            {STATUS_LABEL[cycle.status] ?? cycle.status}
          </Text>
        </View>
        {isLocked && (
          <View style={s.lockBadge}>
            <Feather name="lock" size={11} color={colors.mutedForeground} />
            <Text style={s.lockBadgeText}>Locked</Text>
          </View>
        )}
      </View>

      <Text style={[s.seedName, isLocked && s.textMuted]}>{cycle.seedName}</Text>
      <Text style={s.profileName}>{cycle.growthProfileName}</Text>

      <View style={s.trackerWrap}>
        <StageTracker status={cycle.status as CycleStatus} />
      </View>

      {isLocked && countdown !== null ? (
        <View style={s.lockedRow}>
          <Feather name="clock" size={12} color={colors.mutedForeground} />
          <Text style={s.lockedRowText}>
            {countdown.daysRemaining}d until {countdown.actionLabel}
          </Text>
        </View>
      ) : countdown !== null ? (
        <View
          style={[
            s.countdownRow,
            { backgroundColor: countdownColor(countdown, colors) + "18" },
          ]}
        >
          <Feather name="clock" size={12} color={countdownColor(countdown, colors)} />
          <Text style={[s.countdownText, { color: countdownColor(countdown, colors) }]}>
            {countdownLabel(countdown)}
          </Text>
        </View>
      ) : null}

      <View style={s.metaRow}>
        <View style={s.metaItem}>
          <Feather name="grid" size={12} color={colors.mutedForeground} />
          <Text style={s.metaText}>{cycle.fullTrays}F + {cycle.halfTrays}H trays</Text>
        </View>
        {cycle.trayPosition && (
          <View style={s.metaItem}>
            <Feather name="map-pin" size={12} color={colors.mutedForeground} />
            <Text style={s.metaText}>{cycle.trayPosition}</Text>
          </View>
        )}
      </View>

      {cycle.status !== "completed" && actionLabel && !isLocked && (
        <Pressable
          style={[s.actionBtn, isOverdue && s.actionBtnOverdue]}
          onPress={(e) => {
            e.stopPropagation();
            handleAction();
          }}
        >
          <Text style={s.actionBtnText}>{actionLabel}</Text>
          <Feather name="arrow-right" size={14} color="#fff" />
        </Pressable>
      )}

      {isLocked && (
        <View style={s.actionBtnLocked}>
          <Feather name="lock" size={14} color={colors.mutedForeground} />
          <Text style={s.actionBtnLockedText}>
            Locked — {countdown?.daysRemaining ?? 0}d remaining
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: colors.radius,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLocked: {
    opacity: 0.55,
    backgroundColor: colors.muted,
    borderColor: colors.border,
  },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  lockBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: colors.mutedForeground,
  },
  textMuted: {
    color: colors.mutedForeground,
  },
  lockedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 10,
    alignSelf: "flex-start",
    backgroundColor: colors.border,
  },
  lockedRowText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: colors.mutedForeground,
  },
  actionBtnLocked: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius - 2,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.muted,
  },
  actionBtnLockedText: {
    color: colors.mutedForeground,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
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
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  seedName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: colors.foreground,
    marginBottom: 2,
  },
  profileName: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.mutedForeground,
    marginBottom: 12,
  },
  trackerWrap: { marginBottom: 10 },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  countdownText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  metaRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.mutedForeground,
  },
  actionBtn: {
    backgroundColor: colors.primary,
    borderRadius: colors.radius - 2,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionBtnOverdue: {
    backgroundColor: colors.destructive,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
