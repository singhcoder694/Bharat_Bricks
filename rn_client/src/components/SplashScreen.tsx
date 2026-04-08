import { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradBg, gradCta } from "../theme";

const { width } = Dimensions.get("window");

interface Props {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: Props) {
  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.3)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(28)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(18)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const shieldOpacity = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(ringScale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 72 }),
        Animated.timing(ringOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(iconScale, { toValue: 1, useNativeDriver: true, damping: 11, stiffness: 110 }),
        Animated.timing(iconOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleY, { toValue: 0, duration: 420, useNativeDriver: true }),
        Animated.timing(titleOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(taglineY, { toValue: 0, duration: 360, useNativeDriver: true }),
        Animated.timing(taglineOpacity, { toValue: 1, duration: 360, useNativeDriver: true }),
        Animated.timing(shieldOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
      ]),
      Animated.delay(650),
      Animated.timing(fadeOut, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start(() => {
      onFinish();
    });
  }, [ringScale, ringOpacity, iconScale, iconOpacity, titleY, titleOpacity, taglineY, taglineOpacity, shieldOpacity, fadeOut, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      <LinearGradient colors={[...gradBg]} locations={[0, 0.4, 0.75, 1]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <LinearGradient colors={["rgba(94,234,212,0.12)", "transparent"]} style={styles.topGlow} pointerEvents="none" />

      <Animated.View
        style={[
          styles.ring,
          { opacity: ringOpacity, transform: [{ scale: ringScale }] },
        ]}
      />

      <Animated.View
        style={[
          styles.iconWrap,
          { opacity: iconOpacity, transform: [{ scale: iconScale }] },
        ]}
      >
        <LinearGradient colors={[colors.accentMuted, "rgba(99,102,241,0.35)"]} style={styles.iconRing}>
          <View style={styles.iconInner}>
            <Text style={styles.iconText}>?</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.Text
        style={[styles.title, { opacity: titleOpacity, transform: [{ translateY: titleY }] }]}
      >
        Tritiya AI
      </Animated.Text>

      <Animated.Text
        style={[styles.tagline, { opacity: taglineOpacity, transform: [{ translateY: taglineY }] }]}
      >
        Your private, safe space
      </Animated.Text>

      <Animated.View style={[styles.badges, { opacity: shieldOpacity }]}>
        <LinearGradient colors={["rgba(94,234,212,0.2)", "rgba(45,212,191,0.08)"]} style={styles.badgePill}>
          <Text style={styles.badgeIcon}>🔒</Text>
          <Text style={styles.badgeLabel}>Encrypted</Text>
        </LinearGradient>
        <LinearGradient colors={["rgba(99,102,241,0.2)", "rgba(94,234,212,0.08)"]} style={styles.badgePill}>
          <Text style={styles.badgeIcon}>👤</Text>
          <Text style={styles.badgeLabel}>Anonymous</Text>
        </LinearGradient>
        <LinearGradient colors={[...gradCta]} style={[styles.badgePill, styles.badgeAccent]}>
          <Text style={styles.badgeIconDark}>🛡️</Text>
          <Text style={styles.badgeLabelDark}>Safe</Text>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  ring: {
    position: "absolute",
    width: width * 0.72,
    height: width * 0.72,
    borderRadius: width * 0.36,
    borderWidth: 2,
    borderColor: "rgba(94,234,212,0.18)",
  },
  iconWrap: {
    marginBottom: 22,
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  iconInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.bgDeep,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 40,
    fontWeight: "800",
    color: colors.accent,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.8,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 36,
    fontWeight: "500",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(94,234,212,0.22)",
  },
  badgeAccent: {
    borderColor: "rgba(255,255,255,0.2)",
  },
  badgeIcon: {
    fontSize: 15,
  },
  badgeLabel: {
    fontSize: 12.5,
    color: colors.accent,
    fontWeight: "600",
  },
  badgeIconDark: {
    fontSize: 15,
  },
  badgeLabelDark: {
    fontSize: 12.5,
    color: colors.bgDeep,
    fontWeight: "700",
  },
});
