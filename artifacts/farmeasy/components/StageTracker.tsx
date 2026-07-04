import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export type CycleStatus = "germination" | "fertigation" | "harvest" | "completed";

const STAGES = [
  { key: "germination", label: "Germination" },
  { key: "fertigation", label: "Fertigation" },
  { key: "harvest", label: "Harvest" },
  { key: "completed", label: "Done" },
] as const;

const STATUS_INDEX: Record<CycleStatus, number> = {
  germination: 0,
  fertigation: 1,
  harvest: 2,
  completed: 3,
};

interface Props {
  status: CycleStatus;
}

export default function StageTracker({ status }: Props) {
  const colors = useColors();
  const s = useMemo(() => createStyles(colors), [colors]);
  const currentIdx = STATUS_INDEX[status] ?? 0;

  return (
    <View style={s.row}>
      {STAGES.map((stage, i) => {
        const isDone = i < currentIdx;
        const isActive = i === currentIdx;
        return (
          <React.Fragment key={stage.key}>
            <View style={s.nodeWrap}>
              <View
                style={[
                  s.dot,
                  isDone && s.dotDone,
                  isActive && s.dotActive,
                ]}
              >
                {isDone && <Text style={s.check}>✓</Text>}
              </View>
              <Text
                style={[
                  s.label,
                  isActive && s.labelActive,
                  isDone && s.labelDone,
                ]}
                numberOfLines={1}
              >
                {stage.label}
              </Text>
            </View>
            {i < STAGES.length - 1 && (
              <View
                style={[s.line, i < currentIdx && s.lineDone]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 4,
  },
  nodeWrap: {
    alignItems: "center",
    width: 60,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  dotActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  dotDone: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  check: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  label: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    color: colors.mutedForeground,
    textAlign: "center",
  },
  labelActive: {
    fontFamily: "Inter_600SemiBold",
    color: colors.primary,
  },
  labelDone: {
    color: colors.primary,
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginTop: 9,
    marginHorizontal: -6,
  },
  lineDone: {
    backgroundColor: colors.primary,
  },
});
