import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useGetCycle,
  useCompleteCycleHarvest,
  getListCyclesQueryKey,
  getGetDashboardQueryKey,
  getGetCycleQueryKey,
} from "@workspace/api-client-react";
import colors from "@/constants/colors";
import QRScanner from "@/components/QRScanner";
import RackReadingsCard from "@/components/RackReadingsCard";
import StageTracker from "@/components/StageTracker";
import { parseQR, type RackPositionQR } from "@/utils/parseQR";

type Step = 1 | 2 | 3;

const ISSUE_OPTIONS = [
  { id: "mold", label: "Mold / Fungi" },
  { id: "root_rot", label: "Root Rot" },
  { id: "nutrient_deficiency", label: "Nutrient Deficiency" },
  { id: "pest", label: "Pest Infestation" },
  { id: "contamination", label: "Contamination" },
  { id: "equipment", label: "Equipment Failure" },
  { id: "other", label: "Other" },
] as const;

type IssueId = (typeof ISSUE_OPTIONS)[number]["id"];

export default function HarvestWizard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(1);
  const [scannedLotQr, setScannedLotQr] = useState("");
  const [rackQr, setRackQr] = useState("");
  const [rackReadings, setRackReadings] = useState<RackPositionQR | null>(null);
  const [fullTrays, setFullTrays] = useState("0");
  const [halfTrays, setHalfTrays] = useState("0");
  const [harvestedQty, setHarvestedQty] = useState("");
  const [isBadTrays, setIsBadTrays] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<IssueId | null>(null);
  const [error, setError] = useState("");

  const cycleId = parseInt(id ?? "0");
  const { data: cycle } = useGetCycle(cycleId);
  const { mutateAsync: completeHarvest, isPending } = useCompleteCycleHarvest();

  const issueLabel =
    ISSUE_OPTIONS.find((o) => o.id === selectedIssue)?.label ?? "";

  const canAdvanceStep2 =
    !!harvestedQty && (!isBadTrays || selectedIssue !== null);

  const handleLotQr = (qr: string) => {
    setScannedLotQr(qr);
    setError("");
    setStep(2);
  };

  const handleRackQr = (qr: string) => {
    setRackQr(qr);
    setError("");
    const parsed = parseQR(qr);
    if (parsed?.type === "rack_position") {
      setRackReadings(parsed as RackPositionQR);
    } else {
      setRackReadings(null);
    }
  };

  const handleConfirm = async () => {
    if (!rackQr) {
      setError("Please scan the rack position QR code first.");
      return;
    }
    try {
      await completeHarvest({
        id: cycleId,
        data: {
          fullTrays: parseInt(fullTrays) || 0,
          halfTrays: parseInt(halfTrays) || 0,
          harvestedQty: parseFloat(harvestedQty) || 0,
          trayQrCode: rackQr,
          isBadTrays,
          issue: isBadTrays && selectedIssue ? issueLabel : undefined,
        } as any,
      });
      queryClient.invalidateQueries({ queryKey: getListCyclesQueryKey({ status: "ongoing" }) });
      queryClient.invalidateQueries({ queryKey: getListCyclesQueryKey({ status: "history" }) });
      queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetCycleQueryKey(cycleId) });
      Alert.alert(
        "Harvest Complete!",
        `${cycle?.seedName} cycle #${cycle?.shortId} has been harvested. Yield: ${harvestedQty} g`,
        [{ text: "Done", onPress: () => router.back() }]
      );
    } catch (err) {
      console.error(err);
      setError("Failed to complete harvest. Please try again.");
    }
  };

  if (!cycle) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color={colors.light.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <View style={s.topBar}>
        <Pressable onPress={() => (step > 1 ? setStep((x) => (x - 1) as Step) : router.back())}>
          <Feather
            name={step === 1 ? "x" : "arrow-left"}
            size={24}
            color={colors.light.foreground}
          />
        </Pressable>
        <Text style={s.topTitle}>Harvest</Text>
        <Text style={s.stepNum}>Step {step}/3</Text>
      </View>

      <View style={s.stepDots}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={[s.dot, n <= step && s.dotActive]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.cycleInfo}>
          <Text style={s.cycleName}>{cycle.seedName}</Text>
          <Text style={s.cycleId}>#{cycle.shortId}</Text>
          <StageTracker status="fertigation" />
        </View>

        {/* ── Step 1: Scan Seed Lot QR ── */}
        {step === 1 && (
          <>
            <Text style={s.stepTitle}>Scan Seed Lot QR</Text>
            <Text style={s.stepSub}>
              Confirm the seed lot by scanning a QR code from the tray label.
            </Text>
            <View style={s.qrTypeHint}>
              <Feather name="info" size={13} color={colors.light.primary} />
              <Text style={s.qrTypeHintText}>
                Seed lot QR codes contain the seed name, lot ID and variety.
              </Text>
            </View>
            <View style={s.scannerBox}>
              <QRScanner onScanned={handleLotQr} hint="Scan seed lot QR code" />
            </View>
          </>
        )}

        {/* ── Step 2: Harvest Details ── */}
        {step === 2 && (
          <>
            <Text style={s.stepTitle}>Harvest Details</Text>
            <Text style={s.stepSub}>Enter the harvest quantities and flag any issues.</Text>

            <View style={s.rowInput}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Full Trays Harvested</Text>
                <View style={s.counter}>
                  <Pressable
                    style={s.ctrBtn}
                    onPress={() => setFullTrays((v) => String(Math.max(0, parseInt(v || "0") - 1)))}
                  >
                    <Feather name="minus" size={18} color={colors.light.foreground} />
                  </Pressable>
                  <Text style={s.ctrVal}>{fullTrays}</Text>
                  <Pressable
                    style={s.ctrBtn}
                    onPress={() => setFullTrays((v) => String(parseInt(v || "0") + 1))}
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
                    onPress={() => setHalfTrays((v) => String(Math.max(0, parseInt(v || "0") - 1)))}
                  >
                    <Feather name="minus" size={18} color={colors.light.foreground} />
                  </Pressable>
                  <Text style={s.ctrVal}>{halfTrays}</Text>
                  <Pressable
                    style={s.ctrBtn}
                    onPress={() => setHalfTrays((v) => String(parseInt(v || "0") + 1))}
                  >
                    <Feather name="plus" size={18} color={colors.light.foreground} />
                  </Pressable>
                </View>
              </View>
            </View>

            <Text style={s.label}>Total Harvested (g) <Text style={s.required}>*</Text></Text>
            <TextInput
              style={s.input}
              value={harvestedQty}
              onChangeText={setHarvestedQty}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.light.mutedForeground}
            />

            <View style={s.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.toggleLabel}>Flag Bad Trays</Text>
                <Text style={s.toggleSub}>Report any tray issues at harvest</Text>
              </View>
              <Switch
                value={isBadTrays}
                onValueChange={(v) => {
                  setIsBadTrays(v);
                  if (!v) setSelectedIssue(null);
                }}
                trackColor={{ false: colors.light.muted, true: colors.light.destructive }}
                thumbColor="#fff"
              />
            </View>

            {isBadTrays && (
              <>
                <Text style={s.label}>
                  Issue Type <Text style={s.required}>*</Text>
                </Text>
                <View style={s.issueGrid}>
                  {ISSUE_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.id}
                      style={[
                        s.issueChip,
                        selectedIssue === opt.id && s.issueChipActive,
                      ]}
                      onPress={() => setSelectedIssue(opt.id)}
                    >
                      {selectedIssue === opt.id && (
                        <Feather name="check" size={12} color="#fff" style={{ marginRight: 4 }} />
                      )}
                      <Text
                        style={[
                          s.issueChipText,
                          selectedIssue === opt.id && s.issueChipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <Pressable
              style={[s.nextBtn, !canAdvanceStep2 && s.btnDisabled]}
              onPress={() => setStep(3)}
              disabled={!canAdvanceStep2}
            >
              <Text style={s.nextBtnText}>Scan Rack Slot</Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </Pressable>
          </>
        )}

        {/* ── Step 3: Scan Rack Position QR + Confirm ── */}
        {step === 3 && (
          <>
            <Text style={s.stepTitle}>Scan Rack Position & Confirm</Text>
            <Text style={s.stepSub}>
              Scan the rack slot QR code to capture environmental readings and confirm the harvest location.
            </Text>
            <View style={s.qrTypeHint}>
              <Feather name="info" size={13} color={colors.light.primary} />
              <Text style={s.qrTypeHintText}>
                Rack QR codes contain humidity, temperature, pH, water level and nutrient mix.
              </Text>
            </View>
            <View style={s.scannerBox}>
              <QRScanner
                onScanned={handleRackQr}
                hint="Scan rack position QR code"
              />
            </View>

            {rackQr && (
              rackReadings ? (
                <RackReadingsCard
                  data={rackReadings}
                  position={rackReadings.position ?? rackQr}
                />
              ) : (
                <View style={s.rackRawChip}>
                  <Feather name="grid" size={14} color={colors.light.primary} />
                  <Text style={s.rackRawText}>{rackQr}</Text>
                </View>
              )
            )}

            {rackQr && (
              <View style={s.summaryCard}>
                <SummaryRow label="Cycle" value={`#${cycle.shortId}`} />
                <SummaryRow label="Seed" value={cycle.seedName} />
                <SummaryRow
                  label="Trays"
                  value={`${fullTrays}F + ${halfTrays}H`}
                />
                <SummaryRow label="Harvested" value={`${harvestedQty} g`} />
                {isBadTrays && selectedIssue && (
                  <SummaryRow label="Bad Trays" value={issueLabel} />
                )}
              </View>
            )}

            {error ? <Text style={s.errorText}>{error}</Text> : null}

            <Pressable
              style={[s.nextBtn, (isPending || !rackQr) && s.btnDisabled]}
              onPress={handleConfirm}
              disabled={isPending || !rackQr}
            >
              {isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={s.nextBtnText}>Complete Harvest</Text>
                  <Feather name="check" size={18} color="#fff" />
                </>
              )}
            </Pressable>

            {!rackQr && (
              <Text style={s.waitingText}>Waiting for rack position scan…</Text>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
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
  topTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.light.foreground },
  stepNum: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.light.mutedForeground },
  stepDots: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 16 },
  dot: { width: 28, height: 4, borderRadius: 2, backgroundColor: colors.light.muted },
  dotActive: { backgroundColor: colors.light.primary },
  content: { padding: 20, paddingBottom: 40 },
  cycleInfo: {
    backgroundColor: colors.light.secondary,
    borderRadius: colors.radius,
    padding: 14,
    marginBottom: 20,
    gap: 4,
  },
  cycleName: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.light.foreground },
  cycleId: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginBottom: 8,
  },
  stepTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.light.foreground, marginBottom: 6 },
  stepSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginBottom: 14,
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
    backgroundColor: colors.light.muted,
    marginBottom: 16,
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
  rowInput: { flexDirection: "row", gap: 12 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.light.foreground, marginBottom: 6, marginTop: 12 },
  required: { color: colors.light.destructive },
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
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.light.card,
    padding: 14,
    borderRadius: colors.radius,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginVertical: 12,
  },
  toggleLabel: { fontSize: 15, fontFamily: "Inter_500Medium", color: colors.light.foreground },
  toggleSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.light.mutedForeground, marginTop: 2 },
  issueGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  issueChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    backgroundColor: colors.light.card,
  },
  issueChipActive: {
    backgroundColor: colors.light.destructive,
    borderColor: colors.light.destructive,
  },
  issueChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: colors.light.foreground,
  },
  issueChipTextActive: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },
  summaryCard: {
    backgroundColor: colors.light.card,
    borderRadius: colors.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  summaryLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.light.mutedForeground },
  summaryValue: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.light.foreground, flex: 1, textAlign: "right", marginLeft: 8 },
  errorText: { color: colors.light.destructive, fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 8 },
  waitingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    textAlign: "center",
    marginTop: 12,
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
  nextBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  btnDisabled: { opacity: 0.4 },
});
