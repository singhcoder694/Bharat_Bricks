import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SUGGESTED_PROMPTS } from "../data/dummyChat";
import { colors, radius, spacing } from "../theme";
import { hapticLight } from "../lib/haptics";

function Chip({
  text,
  delay,
  index,
  onPress,
}: {
  text: string;
  delay: number;
  index: number;
  onPress: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const scaleVal = useRef(new Animated.Value(0.9)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 450,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        useNativeDriver: true,
        damping: 14,
        stiffness: 100,
      }),
      Animated.spring(scaleVal, {
        toValue: 1,
        delay,
        useNativeDriver: true,
        damping: 12,
        stiffness: 120,
      }),
    ]).start(() => {
      const floatAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(float, {
            toValue: -3,
            duration: 2000 + index * 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(float, {
            toValue: 3,
            duration: 2000 + index * 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      floatAnim.start();
    });
  }, [opacity, translateY, scaleVal, float, delay, index]);

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY: Animated.add(translateY, float) }, { scale: scaleVal }],
      }}
    >
      <Pressable
        onPress={() => {
          hapticLight();
          onPress();
        }}
        style={({ pressed }) => [pressed && styles.chipPressed]}
        android_ripple={{ color: "rgba(94,234,212,0.2)", borderless: false }}
      >
        <LinearGradient
          colors={["rgba(94,234,212,0.3)", "rgba(99,102,241,0.2)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.chipBorder}
        >
          <View style={styles.chipInner}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={13}
              color={colors.accentDim}
              style={styles.chipIcon}
            />
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
          <Chip
            key={text}
            text={text}
            index={i}
            delay={380 + i * 90}
            onPress={() => onPick(text)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
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
    paddingVertical: 6,
    paddingRight: 8,
  },
  chipBorder: {
    borderRadius: radius.full,
    padding: 1.5,
  },
  chipInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    backgroundColor: "rgba(15,23,42,0.92)",
    gap: 8,
  },
  chipIcon: {
    marginTop: 1,
  },
  chipText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: "600",
    maxWidth: 240,
  },
  chipPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
});
