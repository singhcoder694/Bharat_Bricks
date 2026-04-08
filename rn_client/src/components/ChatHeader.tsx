import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, shadows, spacing } from "../theme";
import { hapticLight } from "../lib/haptics";

interface Props {
  onMenuPress: () => void;
  serverOnline?: boolean | null;
  onSpeakMode?: () => void;
}

function PulsingDot({ color }: { color: string }) {
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseScale, {
            toValue: 2.8,
            duration: 1400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0,
            duration: 1400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseScale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.5,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseScale, pulseOpacity]);

  return (
    <View style={styles.dotWrap}>
      <Animated.View
        style={[
          styles.dotPulse,
          {
            backgroundColor: color,
            opacity: pulseOpacity,
            transform: [{ scale: pulseScale }],
          },
        ]}
      />
      <View style={[styles.statusDot, { backgroundColor: color }]} />
    </View>
  );
}

export function ChatHeader({ onMenuPress, serverOnline, onSpeakMode }: Props) {
  const slideY = useRef(new Animated.Value(-16)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 140,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideY, opacity]);

  const statusColor =
    serverOnline === true
      ? "#22c55e"
      : serverOnline === false
        ? "#ef4444"
        : colors.textMuted;

  const statusLabel =
    serverOnline === true
      ? "Online"
      : serverOnline === false
        ? "Offline"
        : "Connecting…";

  return (
    <Animated.View
      style={[
        styles.outer,
        shadows.header,
        { opacity, transform: [{ translateY: slideY }] },
      ]}
    >
      <LinearGradient
        colors={["rgba(30,41,59,0.9)", "rgba(15,23,42,0.75)"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.container}>
        <View style={styles.left}>
          <Pressable
            style={({ pressed }) => [
              styles.menuPill,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              hapticLight();
              onMenuPress();
            }}
            hitSlop={12}
            android_ripple={{
              color: "rgba(255,255,255,0.08)",
              borderless: false,
            }}
          >
            <View style={styles.menuBar} />
            <View style={[styles.menuBar, styles.menuBarMid]} />
            <View style={styles.menuBar} />
          </Pressable>

          <LinearGradient
            colors={[colors.accentMuted, "rgba(99,102,241,0.2)"]}
            style={styles.iconRing}
          >
            <View style={styles.icon}>
              <Text style={styles.iconText}>T</Text>
            </View>
          </LinearGradient>

          <View style={styles.titleBlock}>
            <Text style={styles.title} numberOfLines={1}>
              Tritiya AI
            </Text>
            <View style={styles.statusRow}>
              {serverOnline === true ? (
                <PulsingDot color={statusColor} />
              ) : (
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              )}
              <Text style={styles.sub} numberOfLines={1}>
                {statusLabel}
              </Text>
            </View>
          </View>
        </View>

        {onSpeakMode && (
          <Pressable
            style={({ pressed }) => [styles.speakBtn, pressed && styles.pressed]}
            onPress={() => {
              hapticLight();
              onSpeakMode();
            }}
            hitSlop={10}
          >
            <LinearGradient
              colors={["rgba(94,234,212,0.15)", "rgba(99,102,241,0.15)"]}
              style={styles.speakGrad}
            >
              <Ionicons name="radio-outline" size={20} color={colors.accent} />
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(94,234,212,0.08)",
    overflow: "hidden",
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
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  dotWrap: {
    width: 10,
    height: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dotPulse: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  sub: {
    fontSize: 10.5,
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  speakBtn: {
    marginLeft: 8,
  },
  speakGrad: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(94,234,212,0.15)",
  },
});
