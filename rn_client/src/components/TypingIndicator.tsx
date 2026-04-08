import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, shadows } from "../theme";

function Dot({ delay, color }: { delay: number; color: string }) {
  const y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.3)).current;
  const scaleVal = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(y, {
            toValue: -7,
            duration: 340,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 340,
            useNativeDriver: true,
          }),
          Animated.timing(scaleVal, {
            toValue: 1.2,
            duration: 340,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(y, {
            toValue: 0,
            duration: 340,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: 340,
            useNativeDriver: true,
          }),
          Animated.timing(scaleVal, {
            toValue: 0.8,
            duration: 340,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(300),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [delay, y, opacity, scaleVal]);

  return (
    <Animated.View
      style={[
        styles.dotWrap,
        { transform: [{ translateY: y }, { scale: scaleVal }], opacity },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
    </Animated.View>
  );
}

function ShimmerBar() {
  const translateX = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(translateX, {
        toValue: 120,
        duration: 1600,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [translateX]);

  return (
    <Animated.View
      style={[styles.shimmer, { transform: [{ translateX }] }]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={[
          "transparent",
          "rgba(94,234,212,0.08)",
          "transparent",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

export function TypingIndicator() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 14,
        stiffness: 160,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 16,
        stiffness: 140,
      }),
    ]).start();
  }, [opacity, scale, translateY]);

  return (
    <Animated.View
      style={[
        styles.row,
        { opacity, transform: [{ scale }, { translateY }] },
      ]}
    >
      <LinearGradient
        colors={[colors.accentMuted, "transparent"]}
        style={styles.avatarRing}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>T</Text>
        </View>
      </LinearGradient>

      <View style={[styles.bubble, shadows.card]}>
        <ShimmerBar />
        <Dot delay={0} color={colors.accent} />
        <Dot delay={140} color={colors.indigo} />
        <Dot delay={280} color={colors.accentDim} />
      </View>
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
    borderColor: "rgba(94,234,212,0.1)",
    backgroundColor: "rgba(30,41,59,0.85)",
    overflow: "hidden",
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
  shimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 60,
  },
});
