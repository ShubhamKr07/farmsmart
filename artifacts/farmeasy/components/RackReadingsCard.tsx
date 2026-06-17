import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import colors from "@/constants/colors";
import type { RackPositionQR } from "@/utils/parseQR";

interface Props {
  data: RackPositionQR;
  position?: string;
}

interface ReadingRowProps {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string;
  color?: string;
}

function ReadingRow({ icon, label, value, color }: ReadingRowProps) {
  return (
    <View style={s.row}>
      <View style={[s.iconWrap, { backgroundColor: (color ?? colors.light.primary) + "18" }]}>
        <Feather name={icon} size={16} color={color ?? colors.light.primary} />
      </View>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

export default function RackReadingsCard({ data, position }: Props) {
  const pos = position ?? data.position ?? "—";

  return (
    <View style={s.card}>
      <View style={s.header}>
        <Feather name="grid" size={16} color={colors.light.primary} />
        <Text style={s.headerText}>Rack Position</Text>
        <View style={s.posBadge}>
          <Text style={s.posBadgeText}>{pos}</Text>
        </View>
      </View>

      <View style={s.divider} />

      {data.humidity !== undefined && (
        <ReadingRow
          icon="droplet"
          label="Humidity"
          value={`${data.humidity}%`}
          color="#2196F3"
        />
      )}
      {data.temperature !== undefined && (
        <ReadingRow
          icon="thermometer"
          label="Temperature"
          value={`${data.temperature}°C`}
          color="#FF7043"
        />
      )}
      {data.ph !== undefined && (
        <ReadingRow
          icon="activity"
          label="pH Value"
          value={`${data.ph}`}
          color="#9C27B0"
        />
      )}
      {data.waterLevel !== undefined && (
        <ReadingRow
          icon="bar-chart-2"
          label="Water Level"
          value={`${data.waterLevel}%`}
          color="#00ACC1"
        />
      )}
      {data.nutrientMix && (
        <ReadingRow
          icon="zap"
          label="Nutrient Mix"
          value={data.nutrientMix}
          color={colors.light.primary}
        />
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
  posBadge: {
    backgroundColor: colors.light.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  posBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#fff",
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
    paddingVertical: 11,
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
});
