import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, shadows, spacing } from "../theme";
import { hapticLight } from "../lib/haptics";

interface Props {
  onMenuPress: () => void;
}

export function ChatHeader({ onMenuPress }: Props) {
  const slideY = useRef(new Animated.Value(-16)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 140 }),
      Animated.timing(opacity, { toValue: 1, duration: 420, useNativeDriver: true }),
    ]).start();
  }, [slideY, opacity]);

  return (
    <Animated.View style={[styles.outer, shadows.header, { opacity, transform: [{ translateY: slideY }] }]}>
      <View style={styles.container}>
        <View style={styles.left}>
          <Pressable
            style={({ pressed }) => [styles.menuPill, pressed && styles.pressed]}
            onPress={() => {
              hapticLight();
              onMenuPress();
            }}
            hitSlop={12}
            android_ripple={{ color: "rgba(255,255,255,0.08)", borderless: false }}
          >
            <View style={styles.menuBar} />
            <View style={[styles.menuBar, styles.menuBarMid]} />
            <View style={styles.menuBar} />
          </Pressable>

          <LinearGradient colors={[colors.accentMuted, "rgba(99,102,241,0.2)"]} style={styles.iconRing}>
            <View style={styles.icon}>
              <Text style={styles.iconText}>?</Text>
            </View>
          </LinearGradient>

          <View style={styles.titleBlock}>
            <Text style={styles.title} numberOfLines={1}>
              Tritiya AI
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              Private · Encrypted · Anonymous
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: colors.glass,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  menuPill: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  menuBar: {
    width: 18,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.textSecondary,
  },
  menuBarMid: {
    width: 12,
    alignSelf: "flex-start",
    marginLeft: 2,
  },
  iconRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    padding: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.bgPrimary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.accent,
  },
  iconText: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.accent,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.35,
  },
  sub: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 2,
    letterSpacing: 0.2,
  },
});
