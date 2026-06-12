import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
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
  useCreateManualCheck,
  getGetCycleQueryKey,
} from "@workspace/api-client-react";
import colors from "@/constants/colors";

type Step = 1 | 2;

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

export default function ManualCheckWizard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(1);

  const [fullTrays, setFullTrays] = useState("0");
  const [halfTrays, setHalfTrays] = useState("0");
  const [isBadTrays, setIsBadTrays] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<IssueId | null>(null);
  const [otherIssueText, setOtherIssueText] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState("");

  const cycleId = parseInt(id ?? "0");
  const { data: cycle } = useGetCycle(cycleId);
  const { mutateAsync: createCheck, isPending } = useCreateManualCheck();

  const issueLabel =
    selectedIssue === "other"
      ? otherIssueText || "Other"
      : ISSUE_OPTIONS.find((o) => o.id === selectedIssue)?.label ?? "";

  const canAdvance =
    !isBadTrays || (selectedIssue !== null && (selectedIssue !== "other" || otherIssueText.trim().length > 0));

  const pickPhoto = async () => {
    if (photos.length >= 6) return;
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.6,
      base64: true,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0].base64) {
      setPhotos((p) => [
        ...p,
        `data:image/jpeg;base64,${result.assets[0].base64}`,
      ]);
    }
  };

  const pickFromLibrary = async () => {
    if (photos.length >= 6) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.6,
      base64: true,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0].base64) {
      setPhotos((p) => [
        ...p,
        `data:image/jpeg;base64,${result.assets[0].base64}`,
      ]);
    }
  };

  const handleSubmit = async () => {
    try {
      await createCheck({
        id: cycleId,
        data: {
          fullTrays: parseInt(fullTrays) || 0,
          halfTrays: parseInt(halfTrays) || 0,
          isBadTrays,
          issue: isBadTrays ? issueLabel : null,
          notes: notes || null,
          photoUrls: photos,
        },
      });
      queryClient.invalidateQueries({ queryKey: getGetCycleQueryKey(cycleId) });
      router.back();
    } catch (err) {
      console.error(err);
      setError("Failed to submit. Please try again.");
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
        <Pressable onPress={() => (step === 2 ? setStep(1) : router.back())}>
          <Feather
            name={step === 1 ? "x" : "arrow-left"}
            size={24}
            color={colors.light.foreground}
          />
        </Pressable>
        <Text style={s.topTitle}>Manual Check</Text>
        <Text style={s.stepNum}>Step {step}/2</Text>
      </View>

      <View style={s.stepDots}>
        {[1, 2].map((n) => (
          <View key={n} style={[s.dot, n <= step && s.dotActive]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.cycleInfo}>
          <Text style={s.cycleName}>{cycle.seedName}</Text>
          <Text style={s.cycleId}>#{cycle.shortId} · {cycle.status}</Text>
        </View>

        {step === 1 && (
          <>
            <Text style={s.sectionTitle}>Tray Counts</Text>
            <View style={s.rowInput}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Full Trays</Text>
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

            <Text style={s.sectionTitle}>Photos ({photos.length}/6)</Text>
            <View style={s.photoGrid}>
              {photos.map((uri, i) => (
                <View key={i} style={s.photoWrap}>
                  <Image source={{ uri }} style={s.photo} />
                  <Pressable
                    style={s.removePhoto}
                    onPress={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                  >
                    <Feather name="x" size={14} color="#fff" />
                  </Pressable>
                </View>
              ))}
              {photos.length < 6 && (
                <View style={s.photoActions}>
                  <Pressable style={s.photoBtn} onPress={pickPhoto}>
                    <Feather name="camera" size={22} color={colors.light.primary} />
                    <Text style={s.photoBtnText}>Camera</Text>
                  </Pressable>
                  <Pressable style={s.photoBtn} onPress={pickFromLibrary}>
                    <Feather name="image" size={22} color={colors.light.primary} />
                    <Text style={s.photoBtnText}>Library</Text>
                  </Pressable>
                </View>
              )}
            </View>

            <View style={s.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.toggleLabel}>Report Bad Trays</Text>
                <Text style={s.toggleSub}>Flag this cycle for issues</Text>
              </View>
              <Switch
                value={isBadTrays}
                onValueChange={(v) => {
                  setIsBadTrays(v);
                  if (!v) {
                    setSelectedIssue(null);
                    setOtherIssueText("");
                  }
                }}
                trackColor={{
                  false: colors.light.muted,
                  true: colors.light.destructive,
                }}
                thumbColor="#fff"
              />
            </View>

            {isBadTrays && (
              <>
                <Text style={s.sectionTitle}>Issue Type <Text style={s.required}>*</Text></Text>
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
                        <Feather name="check" size={13} color="#fff" style={{ marginRight: 4 }} />
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
                {selectedIssue === "other" && (
                  <>
                    <Text style={s.label}>Describe the issue <Text style={s.required}>*</Text></Text>
                    <TextInput
                      style={[s.input, { height: 80, textAlignVertical: "top" }]}
                      value={otherIssueText}
                      onChangeText={setOtherIssueText}
                      placeholder="Describe what you observed..."
                      placeholderTextColor={colors.light.mutedForeground}
                      multiline
                    />
                  </>
                )}
              </>
            )}

            <Text style={s.label}>Notes (optional)</Text>
            <TextInput
              style={[s.input, { height: 80, textAlignVertical: "top" }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional observations..."
              placeholderTextColor={colors.light.mutedForeground}
              multiline
            />

            <Pressable
              style={[s.nextBtn, !canAdvance && s.btnDisabled]}
              onPress={() => setStep(2)}
              disabled={!canAdvance}
            >
              <Text style={s.nextBtnText}>Review & Submit</Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </Pressable>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={s.sectionTitle}>Confirm Manual Check</Text>
            <View style={s.summaryCard}>
              <SummaryRow label="Cycle" value={`#${cycle.shortId}`} />
              <SummaryRow
                label="Trays"
                value={`${fullTrays} full + ${halfTrays} half`}
              />
              <SummaryRow label="Photos" value={`${photos.length}`} />
              <SummaryRow label="Bad Trays" value={isBadTrays ? "Yes" : "No"} />
              {isBadTrays && selectedIssue && (
                <SummaryRow label="Issue" value={issueLabel} />
              )}
              {notes && <SummaryRow label="Notes" value={notes} />}
            </View>

            {photos.length > 0 && (
              <View style={s.previewRow}>
                {photos.slice(0, 3).map((uri, i) => (
                  <Image key={i} source={{ uri }} style={s.previewPhoto} />
                ))}
                {photos.length > 3 && (
                  <View style={s.morePhotos}>
                    <Text style={s.morePhotosText}>+{photos.length - 3}</Text>
                  </View>
                )}
              </View>
            )}

            {error ? <Text style={s.errorText}>{error}</Text> : null}

            <Pressable
              style={[s.nextBtn, isPending && s.btnDisabled]}
              onPress={handleSubmit}
              disabled={isPending}
            >
              {isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={s.nextBtnText}>Submit Check</Text>
                  <Feather name="check" size={18} color="#fff" />
                </>
              )}
            </Pressable>
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
  dot: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.light.muted },
  dotActive: { backgroundColor: colors.light.primary },
  content: { padding: 20, paddingBottom: 60 },
  cycleInfo: {
    backgroundColor: colors.light.secondary,
    borderRadius: colors.radius,
    padding: 14,
    marginBottom: 20,
  },
  cycleName: { fontSize: 17, fontFamily: "Inter_700Bold", color: colors.light.foreground },
  cycleId: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.light.mutedForeground, marginTop: 2 },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.foreground,
    marginBottom: 10,
    marginTop: 16,
  },
  required: { color: colors.light.destructive },
  rowInput: { flexDirection: "row", gap: 12 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.light.foreground, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: colors.radius,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  photoWrap: { position: "relative" },
  photo: {
    width: 90,
    height: 90,
    borderRadius: colors.radius,
    backgroundColor: colors.light.muted,
  },
  removePhoto: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.light.destructive,
    alignItems: "center",
    justifyContent: "center",
  },
  photoActions: {
    flexDirection: "row",
    gap: 10,
  },
  photoBtn: {
    width: 90,
    height: 90,
    borderRadius: colors.radius,
    borderWidth: 2,
    borderColor: colors.light.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.light.card,
  },
  photoBtnText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: colors.light.primary,
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
    marginBottom: 16,
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
  previewRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  previewPhoto: { width: 80, height: 80, borderRadius: colors.radius },
  morePhotos: {
    width: 80,
    height: 80,
    borderRadius: colors.radius,
    backgroundColor: colors.light.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  morePhotosText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.light.mutedForeground },
  errorText: { color: colors.light.destructive, fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 8 },
  nextBtn: {
    flexDirection: "row",
    height: 50,
    borderRadius: colors.radius,
    backgroundColor: colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  nextBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  btnDisabled: { opacity: 0.4 },
});
