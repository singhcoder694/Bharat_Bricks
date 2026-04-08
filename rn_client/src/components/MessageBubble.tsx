import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { ChatMessage } from "../data/dummyChat";
import { colors, gradUser, radius, shadows, spacing } from "../theme";

interface Props {
  message: ChatMessage;
  index: number;
}

export function MessageBubble({ message, index }: Props) {
  const isUser = message.role === "user";
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const scale = useRef(new Animated.Value(0.97)).current;

  useEffect(() => {
    const delay = Math.min(index * 55, 280);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, delay, useNativeDriver: true, damping: 16, stiffness: 140 }),
      Animated.spring(scale, { toValue: 1, delay, useNativeDriver: true, damping: 14, stiffness: 160 }),
    ]).start();
  }, [opacity, translateY, scale, index]);

  return (
    <Animated.View
      style={[
        styles.row,
        isUser ? styles.rowUser : styles.rowBot,
        { opacity, transform: [{ translateY }, { scale }] },
      ]}
    >
      {!isUser && (
        <LinearGradient colors={[colors.accentMuted, "transparent"]} style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>?</Text>
          </View>
        </LinearGradient>
      )}

      {isUser ? (
        <LinearGradient colors={[...gradUser]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bubble, styles.bubbleUser, shadows.soft]}>
          <Text style={[styles.text, styles.textUser]}>{message.text}</Text>
        </LinearGradient>
      ) : (
        <View style={[styles.bubble, styles.bubbleBot, shadows.card]}>
          <Text style={[styles.text, styles.textBot]}>{message.text}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    maxWidth: "88%",
    marginBottom: spacing.sm + 2,
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
  avatarText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.accent,
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
    backgroundColor: colors.bubbleBot,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    borderBottomLeftRadius: radius.xs,
    borderBottomRightRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
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
    color: colors.bubbleBotText,
    fontWeight: "400",
  },
});
