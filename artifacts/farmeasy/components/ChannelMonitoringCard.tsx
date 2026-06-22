import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import colors from "@/constants/colors";
import type { ChannelResolved } from "@workspace/api-client-react";

interface Props {
  data: ChannelResolved;
}

interface MetricState {
  value: string | null;
  loading: boolean;
  error: boolean;
}

const ROOM_LABEL: Record<string, string> = {
  seeding: "Seeding",
  fertigation: "Fertigation",
  harvesting: "Harvesting",
};

async function fetchMetric(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const text = await res.text().then((t) => t.trim());
  try {
    const json = JSON.parse(text);
    const val =
      json.value ?? json.reading ?? json.result ?? json.data ??
      json.ph ?? json.temperature ?? json.temp ?? json.water_level ??
      json.waterLevel;
    if (val !== undefined) return String(val);
  } catch {
    // not JSON
  }
  return text.slice(0, 30);
}

function useMetric(url: string | null | undefined): MetricState {
  const [state, setState] = useState<MetricState>({ value: null, loading: false, error: false });

  useEffect(() => {
    if (!url) return;
    let active = true;
    setState({ value: null, loading: true, error: false });
    fetchMetric(url)
      .then((v) => active && setState({ value: v, loading: false, error: false }))
      .catch(() => active && setState({ value: null, loading: false, error: true }));
    return () => { active = false; };
  }, [url]);

  return state;
}

interface ReadingRowProps {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  url: string | null | undefined;
  unit?: string;
  color?: string;
}

function ReadingRow({ icon, label, url, unit = "", color }: ReadingRowProps) {
  const metric = useMetric(url);

  let display: React.ReactNode;
  if (!url) {
    display = <Text style={s.notConfigured}>Not configured</Text>;
  } else if (metric.loading) {
    display = <ActivityIndicator size="small" color={color ?? colors.light.primary} />;
  } else if (metric.error) {
    display = <Text style={s.errorText}>Unavailable</Text>;
  } else {
    display = (
      <Text style={[s.rowValue, color ? { color } : null]}>
        {metric.value ?? "—"}{unit}
      </Text>
    );
  }

  return (
    <View style={s.row}>
      <View style={[s.iconWrap, { backgroundColor: (color ?? colors.light.primary) + "18" }]}>
        <Feather name={icon} size={16} color={color ?? colors.light.primary} />
      </View>
      <Text style={s.rowLabel}>{label}</Text>
      {display}
    </View>
  );
}

export default function ChannelMonitoringCard({ data }: Props) {
  const roomLabel = ROOM_LABEL[data.room] ?? data.room;
  const hasAnyApi = data.monitoringApiPh || data.monitoringApiTemp || data.monitoringApiWaterLevel;

  return (
    <View style={s.card}>
      <View style={s.header}>
        <Feather name="activity" size={16} color={colors.light.primary} />
        <Text style={s.headerText}>Environmental Readings</Text>
        <View style={s.badge}>
          <Text style={s.badgeText}>{roomLabel}</Text>
        </View>
      </View>

      <View style={s.channelRow}>
        <Feather name="layers" size={13} color={colors.light.mutedForeground} />
        <Text style={s.channelText}>{data.channel}</Text>
        {data.rack ? (
          <>
            <Feather name="chevron-right" size={13} color={colors.light.mutedForeground} />
            <Text style={s.channelText}>{data.rack}</Text>
          </>
        ) : null}
        {data.trayCount !== undefined && data.trayCount !== null ? (
          <Text style={s.trayCount}>· {data.trayCount} tray{data.trayCount !== 1 ? "s" : ""}</Text>
        ) : null}
      </View>

      <View style={s.divider} />

      {hasAnyApi ? (
        <>
          <ReadingRow
            icon="activity"
            label="pH"
            url={data.monitoringApiPh}
            color="#9C27B0"
          />
          <ReadingRow
            icon="thermometer"
            label="Temperature"
            url={data.monitoringApiTemp}
            unit="°C"
            color="#FF7043"
          />
          <ReadingRow
            icon="bar-chart-2"
            label="Water Level"
            url={data.monitoringApiWaterLevel}
            unit="%"
            color="#00ACC1"
          />
        </>
      ) : (
        <View style={s.noConfig}>
          <Feather name="wifi-off" size={20} color={colors.light.mutedForeground} />
          <Text style={s.noConfigText}>No monitoring APIs configured for this channel.</Text>
          <Text style={s.noConfigHint}>An admin can add them in the Facility Layout page.</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.light.card,
    borderRadius: colors.radius,
    borderWidth: 1,
    borderColor: colors.light.primary + "40",
    overflow: "hidden",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: colors.light.secondary,
  },
  headerText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.primary,
  },
  badge: {
    backgroundColor: colors.light.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  channelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  channelText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: colors.light.foreground,
  },
  trayCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
  },
  divider: {
    height: 1,
    backgroundColor: colors.light.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
  },
  rowValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.foreground,
  },
  notConfigured: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    fontStyle: "italic",
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#C62828",
  },
  noConfig: {
    alignItems: "center",
    padding: 24,
    gap: 8,
  },
  noConfigText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: colors.light.mutedForeground,
    textAlign: "center",
  },
  noConfigHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    textAlign: "center",
  },
});
