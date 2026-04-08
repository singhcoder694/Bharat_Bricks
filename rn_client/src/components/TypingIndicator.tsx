import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, shadows } from "../theme";

function Dot({ delay, color }: { delay: number; color: string }) {
  const y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(y, { toValue: -6, duration: 320, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 320, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(y, { toValue: 0, duration: 320, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.4, duration: 320, useNativeDriver: true }),
        ]),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [delay, y, opacity]);

  return (
    <Animated.View style={[styles.dotWrap, { transform: [{ translateY: y }], opacity }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
    </Animated.View>
  );
}

export function TypingIndicator() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 160 }),
    ]).start();
  }, [opacity, scale]);

  return (
    <Animated.View style={[styles.row, { opacity, transform: [{ scale }] }]}>
      <LinearGradient colors={[colors.accentMuted, "transparent"]} style={styles.avatarRing}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>?</Text>
        </View>
      </LinearGradient>

      <LinearGradient
        colors={["#f8fafc", "#e2e8f0"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.bubble, shadows.card]}
      >
        <Dot delay={0} color={colors.accent} />
        <Dot delay={120} color={colors.indigo} />
        <Dot delay={240} color={colors.accentDim} />
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  avatarRing: {
    width: 34,
    height: 34,
    borderRadius: 17,
    padding: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.bgPrimary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.accent,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.accent,
  },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: radius.md,
    borderBottomLeftRadius: radius.xs,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
  },
  dotWrap: {
    width: 9,
    height: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
