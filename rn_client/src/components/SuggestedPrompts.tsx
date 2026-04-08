import { useEffect, useRef } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SUGGESTED_PROMPTS } from "../data/dummyChat";
import { colors, radius, spacing } from "../theme";
import { hapticLight } from "../lib/haptics";

function Chip({ text, delay, onPress }: { text: string; delay: number; onPress: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, delay, useNativeDriver: true, damping: 14, stiffness: 120 }),
    ]).start();
  }, [opacity, translateY, delay]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Pressable
        onPress={() => {
          hapticLight();
          onPress();
        }}
        style={({ pressed }) => [pressed && styles.chipPressed]}
        android_ripple={{ color: "rgba(94,234,212,0.2)", borderless: false }}
      >
        <LinearGradient
          colors={["rgba(94,234,212,0.35)", "rgba(99,102,241,0.25)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.chipBorder}
        >
          <View style={styles.chipInner}>
            <Text style={styles.chipText}>{text}</Text>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

interface Props {
  onPick: (text: string) => void;
  visible: boolean;
}

export function SuggestedPrompts({ onPick, visible }: Props) {
  if (!visible) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Try asking</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        style={styles.container}
      >
        {SUGGESTED_PROMPTS.map((text, i) => (
          <Chip key={text} text={text} delay={380 + i * 70} onPress={() => onPick(text)} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 10,
    marginLeft: 4,
  },
  container: {
    flexGrow: 0,
  },
  scroll: {
    gap: 10,
    paddingVertical: 4,
    paddingRight: 8,
  },
  chipBorder: {
    borderRadius: radius.full,
    padding: 1.5,
  },
  chipInner: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: radius.full,
    backgroundColor: "rgba(15,23,42,0.92)",
  },
  chipText: {
    fontSize: 13.5,
    color: colors.textPrimary,
    fontWeight: "600",
    maxWidth: 260,
  },
  chipPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
});
