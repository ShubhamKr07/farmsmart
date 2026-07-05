import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLookupSeedLot } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

export default function SeedLotDetailScreen() {
  const colors = useColors();
  const s = useMemo(() => createStyles(colors), [colors]);
  const { qrCode } = useLocalSearchParams<{ qrCode: string }>();
  const router = useRouter();

  const { data: lot, isLoading, isError } = useLookupSeedLot(
    { qrCode: qrCode ?? "" },
    { query: { enabled: !!qrCode } },
  );

  function typeColor(type: string) {
    switch (type.toLowerCase()) {
      case "microgreen": return { backgroundColor: "#2E7D3222", text: "#2E7D32" };
      case "lettuce":    return { backgroundColor: "#1565C022", text: "#1565C0" };
      case "edible flower": return { backgroundColor: "#AD145722", text: "#AD1457" };
      default:           return { backgroundColor: colors.muted, text: colors.foreground };
    }
  }

  function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
      <View style={s.row}>
        <Feather name={icon as any} size={16} color={colors.mutedForeground} style={s.rowIcon} />
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={s.rowValue}>{value}</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (isError || !lot) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
          <Text style={s.emptyText}>Seed lot not found</Text>
          <Text style={s.emptySubtext}>{qrCode}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Header */}
        <View style={s.heroCard}>
          <View style={s.heroTop}>
            {lot.type && (
              <View style={[s.typeBadge, { backgroundColor: typeColor(lot.type).backgroundColor }]}>
                <Text style={[s.typeBadgeText, { color: typeColor(lot.type).text }]}>{lot.type}</Text>
              </View>
            )}
            {lot.currentlyGrown !== null && (
              <View style={[s.grownBadge, { backgroundColor: lot.currentlyGrown ? colors.statusOk + "22" : colors.statusWarn + "22" }]}>
                <Text style={[s.grownBadgeText, { color: lot.currentlyGrown ? colors.statusOk : colors.statusWarn }]}>
                  {lot.currentlyGrown ? "Currently Grown" : "Not Currently Grown"}
                </Text>
              </View>
            )}
          </View>
          <Text style={s.heroName}>{lot.seedName}</Text>
          {lot.gpcCode && <Text style={s.heroCode}>{lot.gpcCode}</Text>}
        </View>

        {/* Details card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Details</Text>
          {lot.supplier && <Row icon="truck" label="Supplier" value={lot.supplier} />}
          {lot.vendorShort && <Row icon="tag" label="Vendor" value={lot.vendorShort} />}
          {lot.itemNumber && <Row icon="hash" label="Item #" value={String(lot.itemNumber)} />}
          {lot.success && <Row icon="award" label="Success Rating" value={lot.success} />}
          {lot.growTime && <Row icon="clock" label="Grow Time" value={lot.growTime} />}
          {lot.usedIn && <Row icon="layers" label="Used In" value={lot.usedIn} />}
        </View>

        {/* Product link */}
        {lot.productLink && (
          <Pressable
            style={s.linkBtn}
            onPress={() => Linking.openURL(lot.productLink!)}
          >
            <Feather name="external-link" size={16} color={colors.primary} />
            <Text style={s.linkBtnText}>View Product Page</Text>
          </Pressable>
        )}

        {/* QR ID */}
        <View style={s.card}>
          <Text style={s.cardTitle}>QR Code ID</Text>
          <Text style={s.qrText}>{qrCode}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground },
  emptySubtext: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },

  heroCard: {
    backgroundColor: colors.card,
    borderRadius: colors.radius,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroTop: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 12 },
  heroName: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground },
  heroCode: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginTop: 4 },

  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  typeBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.foreground },
  grownBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  grownBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  card: {
    backgroundColor: colors.card,
    borderRadius: colors.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  row: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIcon: { marginRight: 10 },
  rowLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
  rowValue: { flex: 2, fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground, textAlign: "right" },

  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: colors.radius,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  linkBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.primary },

  qrText: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
});
