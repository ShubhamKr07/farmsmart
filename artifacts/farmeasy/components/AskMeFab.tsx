import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

/**
 * Global entry point to the Ask Me assistant — floating, bottom-left,
 * positioned above the tab bar (mirrors Home's existing "+" seeding FAB,
 * which sits bottom-right at the same height). Rendered once in the tabs
 * layout so it's visible from every tab, not just Home.
 */
export default function AskMeFab() {
  const colors = useColors();
  const router = useRouter();

  return (
    <Pressable
      style={[styles.fab, { backgroundColor: colors.primary }]}
      onPress={() => router.push("/ask" as any)}
      accessibilityLabel="Ask Me"
      hitSlop={8}
    >
      <Feather name="zap" size={24} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    left: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
  },
});
