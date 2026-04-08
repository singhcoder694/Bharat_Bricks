import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { ChatMessage } from "../lib/types";
import { textToSpeech } from "../lib/api";
import { playTtsSegments, stopTts } from "../lib/ttsPlayer";
import { colors, gradUser, radius, shadows, spacing } from "../theme";
import { hapticLight } from "../lib/haptics";

interface Props {
  message: ChatMessage;
  index: number;
  languageCode?: string;
  onRetry?: () => void;
}

type TtsState = "idle" | "loading" | "playing" | "error";

/* ── Glow pulse on new bot messages ─────────────────── */
function useGlowPulse(isBot: boolean) {
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isBot) return;
    Animated.sequence([
      Animated.timing(glow, {
        toValue: 1,
        duration: 600,
        delay: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(glow, {
        toValue: 0,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start();
  }, [isBot, glow]);

  return glow;
}

export function MessageBubble({ message, index, languageCode, onRetry }: Props) {
  const isUser = message.role === "user";
  const isError = !!message.error;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  const scale = useRef(new Animated.Value(0.95)).current;
  const [ttsState, setTtsState] = useState<TtsState>("idle");

  const glow = useGlowPulse(!isUser && !isError);

  useEffect(() => {
    const delay = Math.min(index * 55, 280);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        useNativeDriver: true,
        damping: 18,
        stiffness: 130,
      }),
      Animated.spring(scale, {
        toValue: 1,
        delay,
        useNativeDriver: true,
        damping: 16,
        stiffness: 140,
      }),
    ]).start();
  }, [opacity, translateY, scale, index]);

  const handleTts = useCallback(async () => {
    if (ttsState === "playing") {
      await stopTts();
      setTtsState("idle");
      return;
    }
    if (ttsState === "loading") return;

    hapticLight();
    setTtsState("loading");
    try {
      const res = await textToSpeech(message.text, languageCode || "en-IN");
      setTtsState("playing");
      await playTtsSegments(res.segments);
      setTtsState("idle");
    } catch {
      setTtsState("error");
      setTimeout(() => setTtsState("idle"), 2000);
    }
  }, [ttsState, message.text, languageCode]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const glowBorderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(94,234,212,0.06)", "rgba(94,234,212,0.25)"],
  });

  const glowShadowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.15],
  });

  if (isError) {
    return (
      <Animated.View
        style={[
          styles.row,
          styles.rowBot,
          { opacity, transform: [{ translateY }, { scale }] },
        ]}
      >
        <LinearGradient
          colors={["rgba(239,68,68,0.2)", "transparent"]}
          style={styles.avatarRing}
        >
          <View style={[styles.avatar, styles.avatarError]}>
            <Ionicons name="alert" size={14} color="#f87171" />
          </View>
        </LinearGradient>

        <Pressable onPress={onRetry} style={styles.bubbleCol}>
          <View style={[styles.bubble, styles.bubbleError]}>
            <Text style={[styles.text, styles.textError]}>{message.text}</Text>
            {onRetry && (
              <View style={styles.retryRow}>
                <Ionicons name="refresh" size={13} color="#f87171" />
                <Text style={styles.retryText}>Tap to retry</Text>
              </View>
            )}
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.row,
        isUser ? styles.rowUser : styles.rowBot,
        { opacity, transform: [{ translateY }, { scale }] },
      ]}
    >
      {!isUser && (
        <LinearGradient
          colors={[colors.accentMuted, "transparent"]}
          style={styles.avatarRing}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>T</Text>
          </View>
        </LinearGradient>
      )}

      <View style={styles.bubbleCol}>
        {isUser ? (
          <LinearGradient
            colors={[...gradUser]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bubble, styles.bubbleUser, shadows.soft]}
          >
            <Text style={[styles.text, styles.textUser]}>{message.text}</Text>
          </LinearGradient>
        ) : (
          <Animated.View
            style={[
              styles.bubble,
              styles.bubbleBot,
              {
                borderColor: glowBorderColor,
                shadowColor: "#5eead4",
                shadowOpacity: glowShadowOpacity,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 0 },
              },
            ]}
          >
            <Text style={[styles.text, styles.textBot]}>{message.text}</Text>
          </Animated.View>
        )}

        <View style={[styles.metaRow, isUser && styles.metaRowUser]}>
          <Text style={styles.timestamp}>{formatTime(message.timestamp)}</Text>

          {!isUser && message.id !== "welcome" && (
            <Pressable
              onPress={handleTts}
              hitSlop={6}
              style={({ pressed }) => [
                styles.ttsBtn,
                pressed && styles.ttsBtnPressed,
              ]}
            >
              {ttsState === "loading" ? (
                <ActivityIndicator size={12} color={colors.accent} />
              ) : ttsState === "playing" ? (
                <Ionicons name="stop-circle" size={15} color={colors.accent} />
              ) : ttsState === "error" ? (
                <Ionicons
                  name="alert-circle-outline"
                  size={15}
                  color="#f87171"
                />
              ) : (
                <Ionicons
                  name="volume-high-outline"
                  size={15}
                  color={colors.textMuted}
                />
              )}
            </Pressable>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    maxWidth: "88%",
    marginBottom: spacing.sm + 4,
  },
  rowUser: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
  },
  rowBot: {
    alignSelf: "flex-start",
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
  avatarError: {
    borderColor: "#f87171",
    backgroundColor: "rgba(239,68,68,0.06)",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.accent,
  },
  bubbleCol: {
    flexShrink: 1,
    maxWidth: "100%",
  },
  bubble: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexShrink: 1,
    maxWidth: "100%",
  },
  bubbleUser: {
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.xs,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  bubbleBot: {
    backgroundColor: "rgba(30,41,59,0.85)",
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    borderBottomLeftRadius: radius.xs,
    borderBottomRightRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(94,234,212,0.06)",
  },
  bubbleError: {
    backgroundColor: "rgba(239,68,68,0.06)",
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    borderBottomLeftRadius: radius.xs,
    borderBottomRightRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  text: {
    fontSize: 15,
    lineHeight: 23,
    letterSpacing: 0.1,
  },
  textUser: {
    color: colors.bubbleUserText,
    fontWeight: "500",
  },
  textBot: {
    color: colors.textPrimary,
    fontWeight: "400",
  },
  textError: {
    color: "#fca5a5",
    fontWeight: "400",
    fontSize: 14,
  },
  retryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(239,68,68,0.15)",
  },
  retryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#f87171",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    paddingLeft: 2,
  },
  metaRowUser: {
    justifyContent: "flex-end",
    paddingRight: 2,
    paddingLeft: 0,
  },
  timestamp: {
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  ttsBtn: {
    padding: 4,
    borderRadius: 12,
  },
  ttsBtnPressed: {
    opacity: 0.6,
    backgroundColor: "rgba(94,234,212,0.1)",
  },
});
