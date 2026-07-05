import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePostFacilityLog } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { getLogTypeDef, type FieldConfig } from "@/constants/facilityLogTypes";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Per-category entry form — one dynamic route driven by the field configs
 * in constants/facilityLogTypes.ts rather than 6 near-duplicate files.
 * Presented as a modal (matches the app's existing fertigation/harvest/
 * manual-check convention). Create-only, no history view (Phase 4.3).
 */
export default function LogEntryScreen() {
  const colors = useColors();
  const s = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: string }>();
  const def = getLogTypeDef(type ?? "");

  const [values, setValues] = useState<Record<string, string>>({});
  const [months, setMonths] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const postLog = usePostFacilityLog();

  if (!def) {
    return (
      <SafeAreaView style={s.safe}>
        <Text style={s.errorText}>Unknown log type.</Text>
      </SafeAreaView>
    );
  }

  const setValue = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));

  const toggleMonth = (m: string) =>
    setMonths((current) => (current.includes(m) ? current.filter((x) => x !== m) : [...current, m]));

  const requiredFieldsFilled = def.fields.every((f) => {
    if (f.optional) return true;
    if (f.type === "months") return true;
    return !!values[f.key]?.trim();
  });

  const buildData = (): Record<string, unknown> => {
    const data: Record<string, unknown> = {};
    for (const f of def.fields) {
      if (f.type === "months") {
        data[f.key] = months;
        continue;
      }
      const raw = values[f.key]?.trim();
      if (!raw) continue;
      data[f.key] = f.type === "number" ? Number(raw) : raw;
    }
    return data;
  };

  const handleSave = () => {
    postLog.mutate(
      {
        data: {
          logType: def.type as any,
          data: buildData(),
          notes: notes.trim() || undefined,
        },
      },
      { onSuccess: () => router.back() },
    );
  };

  const renderField = (field: FieldConfig) => {
    if (field.type === "months") {
      return (
        <View key={field.key} style={s.fieldWrap}>
          <Text style={s.label}>{field.label}</Text>
          <View style={s.monthGrid}>
            {MONTHS.map((m) => {
              const active = months.includes(m);
              return (
                <Pressable
                  key={m}
                  style={[s.monthChip, active && s.monthChipActive]}
                  onPress={() => toggleMonth(m)}
                >
                  <Text style={[s.monthChipText, active && s.monthChipTextActive]}>{m}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    if (field.type === "select") {
      return (
        <View key={field.key} style={s.fieldWrap}>
          <Text style={s.label}>{field.label}</Text>
          <View style={s.selectRow}>
            {field.options.map((opt) => {
              const active = values[field.key] === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[s.selectChip, active && s.selectChipActive]}
                  onPress={() => setValue(field.key, opt.value)}
                >
                  <Text style={[s.selectChipText, active && s.selectChipTextActive]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    return (
      <View key={field.key} style={s.fieldWrap}>
        <Text style={s.label}>
          {field.label}
          {field.optional ? "" : " *"}
        </Text>
        <TextInput
          style={s.input}
          value={values[field.key] ?? ""}
          onChangeText={(v) => setValue(field.key, v)}
          placeholder={field.placeholder}
          placeholderTextColor={colors.mutedForeground}
          keyboardType={field.type === "number" ? "numeric" : "default"}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="x" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={s.topTitle}>{def.title}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {def.fields.map(renderField)}

        <View style={s.fieldWrap}>
          <Text style={s.label}>Notes</Text>
          <TextInput
            style={[s.input, s.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional notes"
            placeholderTextColor={colors.mutedForeground}
            multiline
          />
        </View>

        {postLog.isError && <Text style={s.errorText}>Something went wrong. Try again.</Text>}

        <Pressable
          style={[s.saveBtn, (!requiredFieldsFilled || postLog.isPending) && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!requiredFieldsFilled || postLog.isPending}
        >
          {postLog.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.saveBtnText}>Save Log</Text>
          )}
        </Pressable>
      </ScrollView>
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
  content: { padding: 16, gap: 16 },
  fieldWrap: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
  input: {
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
  notesInput: { height: 90, paddingTop: 12, textAlignVertical: "top" },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  monthChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: colors.radius,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  monthChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  monthChipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground },
  monthChipTextActive: { color: "#fff" },
  selectRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  selectChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: colors.radius,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  selectChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  selectChipText: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground },
  selectChipTextActive: { color: "#fff" },
  saveBtn: {
    height: 50,
    borderRadius: colors.radius,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.destructive,
    textAlign: "center",
  },
});
