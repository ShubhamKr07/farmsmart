import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
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
import colors from "@/constants/colors";

export default function SeedLotDetailScreen() {
  const { qrCode } = useLocalSearchParams<{ qrCode: string }>();
  const router = useRouter();

  const { data: lot, isLoading, isError } = useLookupSeedLot(
    { qrCode: qrCode ?? "" },
    { query: { enabled: !!qrCode } },
  );

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color={colors.light.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (isError || !lot) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Feather name="alert-circle" size={40} color={colors.light.mutedForeground} />
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
              <View style={[s.typeBadge, typeColor(lot.type)]}>
                <Text style={s.typeBadgeText}>{lot.type}</Text>
              </View>
            )}
            {lot.currentlyGrown !== null && (
              <View style={[s.grownBadge, lot.currentlyGrown ? s.grownYes : s.grownNo]}>
                <Text style={s.grownBadgeText}>
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
            <Feather name="external-link" size={16} color={colors.light.primary} />
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

function typeColor(type: string) {
  switch (type.toLowerCase()) {
    case "microgreen": return { backgroundColor: "#E8F5E9" };
    case "lettuce":    return { backgroundColor: "#E3F2FD" };
    case "edible flower": return { backgroundColor: "#FCE4EC" };
    default:           return { backgroundColor: colors.light.muted };
  }
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={s.row}>
      <Feather name={icon as any} size={16} color={colors.light.mutedForeground} style={s.rowIcon} />
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.light.background },
  scroll: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.light.foreground },
  emptySubtext: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.light.mutedForeground },

  heroCard: {
    backgroundColor: colors.light.card,
    borderRadius: colors.radius,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  heroTop: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 12 },
  heroName: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.light.foreground },
  heroCode: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.light.mutedForeground, marginTop: 4 },

  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  typeBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.light.foreground },
  grownBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  grownBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  grownYes: { backgroundColor: "#E8F5E9" },
  grownNo: { backgroundColor: "#FFF3E0" },

  card: {
    backgroundColor: colors.light.card,
    borderRadius: colors.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  cardTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  row: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.light.border },
  rowIcon: { marginRight: 10 },
  rowLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: colors.light.mutedForeground },
  rowValue: { flex: 2, fontSize: 14, fontFamily: "Inter_400Regular", color: colors.light.foreground, textAlign: "right" },

  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    backgroundColor: colors.light.card,
    borderRadius: colors.radius,
    borderWidth: 1,
    borderColor: colors.light.primary,
  },
  linkBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.light.primary },

  qrText: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.light.mutedForeground },
});
