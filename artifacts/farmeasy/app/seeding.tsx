import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useCreateCycle,
  useListGrowthProfiles,
  useLookupSeedLot,
  getListCyclesQueryKey,
  getGetDashboardQueryKey,
} from "@workspace/api-client-react";
import colors from "@/constants/colors";
import QRScanner from "@/components/QRScanner";
import RackReadingsCard from "@/components/RackReadingsCard";
import { parseQR, type RackPositionQR, type SeedLotQR } from "@/utils/parseQR";

type Step = 1 | 2 | 3;

interface FormData {
  seedLotQrCodes: string[];
  seedName: string;
  fullTrays: string;
  halfTrays: string;
  seedWeightTray: string;
  growthProfileId: number | null;
  seedingDate: string;
  trayPosition: string;
}

const today = new Date().toISOString().split("T")[0];

export default function SeedingWizard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>({
    seedLotQrCodes: [],
    seedName: "",
    fullTrays: "0",
    halfTrays: "0",
    seedWeightTray: "0",
    growthProfileId: null,
    seedingDate: today,
    trayPosition: "",
  });
  const [pendingQr, setPendingQr] = useState("");
  const [autoFillChip, setAutoFillChip] = useState<string | null>(null);
  const [rackReadings, setRackReadings] = useState<RackPositionQR | null>(null);

  const { data: profiles } = useListGrowthProfiles();
  const { mutateAsync: createCycle, isPending } = useCreateCycle();
  const { data: seedLotData } = useLookupSeedLot(
    { qrCode: pendingQr },
    { query: { enabled: !!pendingQr, retry: false } },
  );

  useEffect(() => {
    if (seedLotData?.seedName) {
      setForm((f) => ({ ...f, seedName: seedLotData.seedName }));
      setAutoFillChip(seedLotData.seedName);
    }
  }, [seedLotData]);

  const handleLotScanned = (qr: string) => {
    if (!form.seedLotQrCodes.includes(qr)) {
      setForm((f) => ({ ...f, seedLotQrCodes: [...f.seedLotQrCodes, qr] }));
    }
    // Try to parse structured seed lot QR
    const parsed = parseQR(qr);
    if (parsed?.type === "seed_lot") {
      const lot = parsed as SeedLotQR;
      if (lot.seedName) {
        setForm((f) => ({ ...f, seedName: lot.seedName! }));
        setAutoFillChip(lot.seedName!);
      }
    }
    setPendingQr(qr);
  };

  const handleRackScanned = (qr: string) => {
    setForm((f) => ({ ...f, trayPosition: qr }));
    const parsed = parseQR(qr);
    if (parsed?.type === "rack_position") {
      setRackReadings(parsed as RackPositionQR);
    } else {
      setRackReadings(null);
    }
  };

  const handleConfirm = async () => {
    if (!form.growthProfileId || !form.trayPosition) return;
    try {
      const cycle = await createCycle({
        data: {
          seedLotQrCodes: form.seedLotQrCodes,
          seedName: form.seedName,
          fullTrays: parseInt(form.fullTrays) || 0,
          halfTrays: parseInt(form.halfTrays) || 0,
          seedWeightTray: parseFloat(form.seedWeightTray) || 0,
          growthProfileId: form.growthProfileId!,
          seedingDate: form.seedingDate,
          trayPosition: form.trayPosition,
        },
      });
      queryClient.invalidateQueries({ queryKey: getListCyclesQueryKey({ status: "ongoing" }) });
      queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      Alert.alert(
        "Cycle Started!",
        `${cycle.seedName} cycle #${cycle.shortId} is now in Germination.`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err) {
      console.error(err);
    }
  };

  const profileList = Array.isArray(profiles) ? profiles : [];
  const selectedProfile = profileList.find(
    (p) => p.id === form.growthProfileId,
  );

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <View style={s.topBar}>
        <Pressable onPress={() => (step > 1 ? setStep((s) => (s - 1) as Step) : router.back())}>
          <Feather
            name={step === 1 ? "x" : "arrow-left"}
            size={24}
            color={colors.light.foreground}
          />
        </Pressable>
        <Text style={s.topTitle}>New Seeding</Text>
        <Text style={s.stepNum}>Step {step}/3</Text>
      </View>

      <View style={s.stepDots}>
        {[1, 2, 3].map((n) => (
          <View
            key={n}
            style={[s.dot, n <= step && s.dotActive]}
          />
        ))}
      </View>

      {step === 1 && (
        <ScrollView contentContainerStyle={s.stepContent}>
          <Text style={s.stepTitle}>Scan Seed Lot QR</Text>
          <Text style={s.stepSubtitle}>
            Point the camera at a seed lot QR code. Scanned codes appear below.
          </Text>
          <View style={s.qrTypeHint}>
            <Feather name="info" size={13} color={colors.light.primary} />
            <Text style={s.qrTypeHintText}>
              Seed lot QR codes contain the seed name, lot ID, variety and batch weight.
            </Text>
          </View>
          <View style={s.scannerBox}>
            <QRScanner
              onScanned={handleLotScanned}
              hint="Point camera at seed lot QR code"
            />
          </View>
          {form.seedLotQrCodes.length > 0 && (
            <View style={s.qrChips}>
              {form.seedLotQrCodes.map((qr) => {
                const parsed = parseQR(qr);
                const label =
                  parsed?.type === "seed_lot" && (parsed as SeedLotQR).seedName
                    ? `${(parsed as SeedLotQR).seedName} · ${(parsed as SeedLotQR).lotId ?? qr}`
                    : qr;
                return (
                  <View key={qr} style={s.qrChip}>
                    <Feather name="check-circle" size={13} color={colors.light.primary} />
                    <Text style={s.qrChipText} numberOfLines={1}>{label}</Text>
                    <Pressable
                      onPress={() =>
                        setForm((f) => ({
                          ...f,
                          seedLotQrCodes: f.seedLotQrCodes.filter((q) => q !== qr),
                        }))
                      }
                    >
                      <Feather name="x" size={14} color={colors.light.mutedForeground} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
          <Pressable
            style={[
              s.nextBtn,
              form.seedLotQrCodes.length === 0 && s.btnDisabled,
            ]}
            onPress={() => setStep(2)}
            disabled={form.seedLotQrCodes.length === 0}
          >
            <Text style={s.nextBtnText}>Add Details</Text>
            <Feather name="arrow-right" size={18} color="#fff" />
          </Pressable>
        </ScrollView>
      )}

      {step === 2 && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={s.formScroll}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={s.stepTitle}>Tray Details</Text>

            <Text style={s.label}>Seed Name</Text>
            {autoFillChip && (
              <View style={s.autoFillChip}>
                <Feather name="check-circle" size={13} color={colors.light.primary} />
                <Text style={s.autoFillChipText}>Auto-filled: {autoFillChip} — change?</Text>
                <Pressable onPress={() => setAutoFillChip(null)}>
                  <Feather name="x" size={14} color={colors.light.mutedForeground} />
                </Pressable>
              </View>
            )}
            <TextInput
              style={s.input}
              value={form.seedName}
              onChangeText={(v) => {
                setForm((f) => ({ ...f, seedName: v }));
                setAutoFillChip(null);
              }}
              placeholder="e.g. Arugula"
              placeholderTextColor={colors.light.mutedForeground}
            />

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Full Trays</Text>
                <View style={s.counter}>
                  <Pressable
                    style={s.ctrBtn}
                    onPress={() =>
                      setForm((f) => ({
                        ...f,
                        fullTrays: String(Math.max(0, parseInt(f.fullTrays || "0") - 1)),
                      }))
                    }
                  >
                    <Feather name="minus" size={18} color={colors.light.foreground} />
                  </Pressable>
                  <Text style={s.ctrVal}>{form.fullTrays}</Text>
                  <Pressable
                    style={s.ctrBtn}
                    onPress={() =>
                      setForm((f) => ({
                        ...f,
                        fullTrays: String(parseInt(f.fullTrays || "0") + 1),
                      }))
                    }
                  >
                    <Feather name="plus" size={18} color={colors.light.foreground} />
                  </Pressable>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Half Trays</Text>
                <View style={s.counter}>
                  <Pressable
                    style={s.ctrBtn}
                    onPress={() =>
                      setForm((f) => ({
                        ...f,
                        halfTrays: String(Math.max(0, parseInt(f.halfTrays || "0") - 1)),
                      }))
                    }
                  >
                    <Feather name="minus" size={18} color={colors.light.foreground} />
                  </Pressable>
                  <Text style={s.ctrVal}>{form.halfTrays}</Text>
                  <Pressable
                    style={s.ctrBtn}
                    onPress={() =>
                      setForm((f) => ({
                        ...f,
                        halfTrays: String(parseInt(f.halfTrays || "0") + 1),
                      }))
                    }
                  >
                    <Feather name="plus" size={18} color={colors.light.foreground} />
                  </Pressable>
                </View>
              </View>
            </View>

            <Text style={s.label}>Seed Weight / Tray (g)</Text>
            <TextInput
              style={s.input}
              value={form.seedWeightTray}
              onChangeText={(v) => setForm((f) => ({ ...f, seedWeightTray: v }))}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.light.mutedForeground}
            />

            <Text style={s.label}>Growth Profile</Text>
            <View style={s.profileList}>
              {profileList.map((p) => (
                <Pressable
                  key={p.id}
                  style={[
                    s.profileOption,
                    form.growthProfileId === p.id && s.profileOptionSelected,
                  ]}
                  onPress={() =>
                    setForm((f) => ({
                      ...f,
                      growthProfileId: p.id,
                      seedName: f.seedName || p.seedName,
                    }))
                  }
                >
                  <Text
                    style={[
                      s.profileName,
                      form.growthProfileId === p.id && s.profileNameSelected,
                    ]}
                  >
                    {p.name}
                  </Text>
                  <Text style={s.profileMeta}>
                    Germ {p.germinationDays}d · Fert {p.fertigationDays}d
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={s.label}>Seeding Date</Text>
            <TextInput
              style={s.input}
              value={form.seedingDate}
              onChangeText={(v) => setForm((f) => ({ ...f, seedingDate: v }))}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.light.mutedForeground}
            />

            <Pressable
              style={[
                s.nextBtn,
                (!form.seedName || !form.growthProfileId) && s.btnDisabled,
              ]}
              onPress={() => setStep(3)}
              disabled={!form.seedName || !form.growthProfileId}
            >
              <Text style={s.nextBtnText}>Scan Rack Slot</Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {step === 3 && (
        <ScrollView contentContainerStyle={s.stepContent}>
          <Text style={s.stepTitle}>Scan Rack Slot</Text>
          <Text style={s.stepSubtitle}>
            Scan the QR code on the rack slot where the trays will be placed.
          </Text>
          <View style={s.qrTypeHint}>
            <Feather name="info" size={13} color={colors.light.primary} />
            <Text style={s.qrTypeHintText}>
              Rack position QR codes include humidity, temperature, pH, water level and nutrient mix.
            </Text>
          </View>
          <View style={s.scannerBox}>
            <QRScanner
              onScanned={handleRackScanned}
              hint="Point camera at rack slot QR code"
            />
          </View>

          {form.trayPosition ? (
            <>
              {rackReadings ? (
                <RackReadingsCard
                  data={rackReadings}
                  position={rackReadings.position ?? form.trayPosition}
                />
              ) : (
                <View style={s.rackRawChip}>
                  <Feather name="grid" size={14} color={colors.light.primary} />
                  <Text style={s.rackRawText}>{form.trayPosition}</Text>
                </View>
              )}

              <View style={s.summaryCard}>
                <Text style={s.summaryTitle}>Confirm Seeding</Text>
                <Row label="Seed Lots" value={form.seedLotQrCodes.length.toString()} />
                <Row label="Seed Name" value={form.seedName} />
                <Row
                  label="Trays"
                  value={`${form.fullTrays} full + ${form.halfTrays} half`}
                />
                <Row label="Weight/Tray" value={`${form.seedWeightTray} g`} />
                <Row label="Profile" value={selectedProfile?.name ?? "-"} />
                <Row label="Seeding Date" value={form.seedingDate} />
              </View>
            </>
          ) : (
            <Text style={s.stepSubtitle}>Waiting for rack slot scan…</Text>
          )}

          <Pressable
            style={[s.nextBtn, (!form.trayPosition || isPending) && s.btnDisabled]}
            onPress={handleConfirm}
            disabled={!form.trayPosition || isPending}
          >
            {isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={s.nextBtnText}>Confirm & Save</Text>
                <Feather name="check" size={18} color="#fff" />
              </>
            )}
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.summaryRow}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={s.summaryValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.light.background },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  topTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.foreground,
  },
  stepNum: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: colors.light.mutedForeground,
  },
  stepDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.light.muted,
  },
  dotActive: { backgroundColor: colors.light.primary },
  stepContent: { padding: 20, paddingBottom: 40 },
  formScroll: { padding: 20, paddingBottom: 40 },
  stepTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginBottom: 12,
  },
  qrTypeHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: colors.light.secondary,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  qrTypeHintText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.primary,
    lineHeight: 18,
  },
  scannerBox: {
    width: "100%",
    borderRadius: colors.radius,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: colors.light.muted,
  },
  qrChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  qrChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.light.secondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    maxWidth: "100%",
  },
  qrChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: colors.light.primary,
    flexShrink: 1,
  },
  rackRawChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.light.secondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  rackRawText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: colors.light.foreground,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: colors.light.foreground,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: colors.radius,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: colors.light.foreground,
    backgroundColor: colors.light.card,
  },
  row: { flexDirection: "row", gap: 12 },
  counter: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: colors.radius,
    height: 48,
    overflow: "hidden",
  },
  ctrBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.light.muted,
    height: "100%",
  },
  ctrVal: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.foreground,
  },
  profileList: { gap: 8, marginBottom: 4 },
  profileOption: {
    padding: 12,
    borderRadius: colors.radius,
    borderWidth: 1,
    borderColor: colors.light.border,
    backgroundColor: colors.light.card,
  },
  profileOptionSelected: {
    borderColor: colors.light.primary,
    backgroundColor: colors.light.secondary,
  },
  profileName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: colors.light.foreground,
  },
  profileNameSelected: { color: colors.light.primary, fontFamily: "Inter_600SemiBold" },
  profileMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: colors.light.card,
    borderRadius: colors.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.light.border,
    gap: 2,
    marginBottom: 4,
  },
  summaryTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
  },
  autoFillChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.light.secondary,
    borderWidth: 1,
    borderColor: colors.light.primary + "40",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
  },
  autoFillChipText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: colors.light.primary,
  },
  summaryValue: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: colors.light.foreground,
    maxWidth: "60%",
    textAlign: "right",
  },
  nextBtn: {
    flexDirection: "row",
    height: 50,
    borderRadius: colors.radius,
    backgroundColor: colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  btnDisabled: { opacity: 0.4 },
});
