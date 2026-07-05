import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

/**
 * Simplified single-field search (Phase 4.1) — web has a full command
 * palette (⌘K), which doesn't map to touch. This resolves a seed lot QR
 * code directly, the one lookup-by-code endpoint that actually exists
 * (@workspace/api-client-react's useLookupSeedLot). Cycles have no
 * short-id lookup endpoint on the API today, so this doesn't pretend to
 * search them — only the seed-lot detail screen it navigates to.
 */
export default function SearchScreen() {
  const colors = useColors();
  const s = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    router.replace({ pathname: "/seed-lot/[qrCode]", params: { qrCode: trimmed } });
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="x" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={s.topTitle}>Search</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.content}>
        <Text style={s.label}>Seed lot QR code</Text>
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            value={query}
            onChangeText={setQuery}
            placeholder="e.g. SL-2024-0417"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="characters"
            autoCorrect={false}
            onSubmitEditing={handleSubmit}
            autoFocus
          />
          <Pressable style={[s.goBtn, !query.trim() && s.goBtnDisabled]} onPress={handleSubmit} disabled={!query.trim()}>
            <Feather name="arrow-right" size={18} color="#fff" />
          </Pressable>
        </View>
        <Text style={s.hint}>
          Scanning a tray's QR code from the Scan tab works too — this is for when you already
          know the code.
        </Text>
      </View>
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
  content: { padding: 16, gap: 10 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
  inputRow: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: colors.radius,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: colors.foreground,
    backgroundColor: colors.card,
  },
  goBtn: {
    width: 48,
    height: 48,
    borderRadius: colors.radius,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  goBtnDisabled: { opacity: 0.4 },
  hint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.mutedForeground,
    lineHeight: 17,
  },
});
