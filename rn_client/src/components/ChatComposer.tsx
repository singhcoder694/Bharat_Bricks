import { useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradCta, radius, shadows, spacing } from "../theme";
import { hapticMedium } from "../lib/haptics";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatComposer({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");
  const inputRef = useRef<TextInput>(null);
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    hapticMedium();
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.9, useNativeDriver: true, damping: 14, stiffness: 220 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 180 }),
    ]).start();
    onSend(trimmed);
    setValue("");
    inputRef.current?.focus();
  };

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <View style={styles.container}>
      <View style={styles.inputShell}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Ask something privately…"
          placeholderTextColor={colors.textMuted}
          cursorColor={colors.accent}
          selectionColor={colors.accent}
          value={value}
          onChangeText={setValue}
          editable={!disabled}
          multiline
          returnKeyType="send"
          blurOnSubmit
          onSubmitEditing={handlePress}
          keyboardAppearance="dark"
        />
      </View>

      <Pressable onPress={handlePress} disabled={!canSend}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <LinearGradient
            colors={canSend ? [...gradCta] : ["#475569", "#334155"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.send, canSend && shadows.soft, !canSend && styles.sendMuted]}
          >
            <Text style={[styles.sendIcon, !canSend && styles.sendIconMuted]}>↑</Text>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  inputShell: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: "rgba(15,23,42,0.65)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  input: {
    minHeight: 48,
    maxHeight: 120,
    paddingVertical: 13,
    paddingHorizontal: 18,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
    textAlignVertical: "center",
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  sendMuted: {
    borderColor: colors.border,
    opacity: 0.55,
  },
  sendIcon: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.bgDeep,
    marginTop: -2,
  },
  sendIconMuted: {
    color: colors.textSecondary,
  },
});
