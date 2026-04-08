import { useEffect, useRef } from "react";
import {
  Animated,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradCta, radius, shadows, spacing } from "../theme";
import { hapticLight } from "../lib/haptics";

interface Props {
  visible: boolean;
  onStay: () => void;
  onEnd: () => void;
}

export function ExitModal({ visible, onStay, onEnd }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 160 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.88, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, opacity, scale]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onStay();
      return true;
    });
    return () => sub.remove();
  }, [visible, onStay]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => { hapticLight(); onStay(); }} />
      <Animated.View style={[styles.card, shadows.card, { transform: [{ scale }] }]}>
        <LinearGradient colors={[colors.accentMuted, "transparent"]} style={styles.cardGlow} />

        <View style={styles.iconWrap}>
          <Text style={styles.icon}>🔒</Text>
        </View>

        <Text style={styles.title}>End this session?</Text>
        <Text style={styles.body}>
          Your conversation is private and never stored. Once you close,
          this chat cannot be recovered.
        </Text>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}
            onPress={() => {
              hapticLight();
              onStay();
            }}
          >
            <LinearGradient colors={[...gradCta]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.stayBtn}>
              <Text style={styles.stayText}>Continue</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.endBtn, pressed && { opacity: 0.85 }]}
            onPress={() => {
              hapticLight();
              onEnd();
            }}
          >
            <Text style={styles.endText}>End session</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,6,23,0.78)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 200,
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.xl,
    padding: spacing.lg + 4,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: "hidden",
  },
  cardGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(94,234,212,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(94,234,212,0.25)",
  },
  icon: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 26,
  },
  actions: {
    gap: 12,
    width: "100%",
  },
  stayBtn: {
    width: "100%",
    paddingVertical: 15,
    borderRadius: radius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  stayText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.bgDeep,
    letterSpacing: 0.3,
  },
  endBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: "rgba(239,68,68,0.6)",
    alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  endText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f87171",
  },
});
