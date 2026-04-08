import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, gradCta, gradVoice, radius, shadows, spacing } from "../theme";
import { hapticLight, hapticMedium, hapticSuccess } from "../lib/haptics";
import {
  cancelRecording,
  requestMicPermission,
  startRecording,
  stopAndTranscribe,
} from "../lib/speechToText";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  speakModeActive?: boolean;
}

type VoiceState = "idle" | "recording" | "transcribing";

/* ── Animated sub-components ────────────────────────── */

function BlinkingDot() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.12,
          duration: 620,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 620,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return <Animated.View style={[styles.recDot, { opacity }]} />;
}

function WaveBars() {
  const COUNT = 7;
  const anims = useRef(
    Array.from({ length: COUNT }, () => new Animated.Value(0.3)),
  ).current;

  useEffect(() => {
    const loops: Animated.CompositeAnimation[] = [];
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    anims.forEach((anim, i) => {
      const tid = setTimeout(() => {
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 320 + (i % 3) * 70,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.18,
              duration: 320 + (i % 3) * 70,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        );
        loops.push(loop);
        loop.start();
      }, i * 85);
      timeouts.push(tid);
    });

    return () => {
      timeouts.forEach(clearTimeout);
      loops.forEach((l) => l.stop());
      anims.forEach((a) => a.setValue(0.3));
    };
  }, [anims]);

  return (
    <View style={styles.waveBars}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[styles.waveBar, { transform: [{ scaleY: anim }] }]}
        />
      ))}
    </View>
  );
}

function SpinnerDots() {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={[styles.spinnerWrap, { transform: [{ rotate: spin }] }]}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.spinnerDot,
            { opacity: 1 - i * 0.3 },
          ]}
        />
      ))}
    </Animated.View>
  );
}

/* ── Send flash overlay ─────────────────────────────── */

function SendFlash({ active }: { active: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (active) {
      opacity.setValue(0.6);
      scale.setValue(0.5);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 2.5,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [active, opacity, scale]);

  if (!active) return null;
  return (
    <Animated.View
      style={[
        styles.sendFlash,
        { opacity, transform: [{ scale }] },
      ]}
      pointerEvents="none"
    />
  );
}

/* ── Main component ─────────────────────────────────── */

export function ChatComposer({ onSend, disabled, speakModeActive }: Props) {
  const [value, setValue] = useState("");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [showFlash, setShowFlash] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (speakModeActive && voiceState === "recording") {
      cancelRecording().catch(() => {});
      setVoiceState("idle");
    }
  }, [speakModeActive, voiceState]);

  const sendScale = useRef(new Animated.Value(1)).current;
  const micPulse = useRef(new Animated.Value(1)).current;
  const shellGlow = useRef(new Animated.Value(0)).current;

  const rings = useRef(
    Array.from({ length: 3 }, () => ({
      scale: new Animated.Value(1),
      opacity: new Animated.Value(0),
    })),
  ).current;

  const runningAnims = useRef<Animated.CompositeAnimation[]>([]);
  const staggerIds = useRef<ReturnType<typeof setTimeout>[]>([]);

  /* ── timer ── */
  useEffect(() => {
    if (voiceState !== "recording") return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(id);
  }, [voiceState]);

  /* ── recording animations ── */
  useEffect(() => {
    runningAnims.current.forEach((a) => a.stop());
    runningAnims.current = [];
    staggerIds.current.forEach(clearTimeout);
    staggerIds.current = [];

    if (voiceState === "recording") {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(micPulse, {
            toValue: 1.18,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(micPulse, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      runningAnims.current.push(pulse);
      pulse.start();

      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(shellGlow, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(shellGlow, {
            toValue: 0,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ]),
      );
      runningAnims.current.push(glow);
      glow.start();

      rings.forEach(({ scale, opacity }, i) => {
        const tid = setTimeout(() => {
          const ripple = Animated.loop(
            Animated.sequence([
              Animated.parallel([
                Animated.timing(scale, {
                  toValue: 1,
                  duration: 0,
                  useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                  toValue: 0.45,
                  duration: 0,
                  useNativeDriver: true,
                }),
              ]),
              Animated.parallel([
                Animated.timing(scale, {
                  toValue: 2.4,
                  duration: 1800,
                  easing: Easing.out(Easing.cubic),
                  useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                  toValue: 0,
                  duration: 1800,
                  easing: Easing.out(Easing.cubic),
                  useNativeDriver: true,
                }),
              ]),
            ]),
          );
          runningAnims.current.push(ripple);
          ripple.start();
        }, i * 600);
        staggerIds.current.push(tid);
      });
    } else {
      micPulse.setValue(1);
      shellGlow.setValue(0);
      rings.forEach(({ scale, opacity }) => {
        scale.setValue(1);
        opacity.setValue(0);
      });
    }

    return () => {
      runningAnims.current.forEach((a) => a.stop());
      runningAnims.current = [];
      staggerIds.current.forEach(clearTimeout);
      staggerIds.current = [];
    };
  }, [voiceState, micPulse, shellGlow, rings]);

  /* ── helpers ── */

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    hapticMedium();
    Animated.sequence([
      Animated.spring(sendScale, {
        toValue: 0.85,
        useNativeDriver: true,
        damping: 14,
        stiffness: 220,
      }),
      Animated.spring(sendScale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 12,
        stiffness: 180,
      }),
    ]).start();
    onSend(trimmed);
    setValue("");
    inputRef.current?.focus();
  }, [value, disabled, onSend, sendScale]);

  const handleMicPress = useCallback(async () => {
    if (voiceState === "recording") {
      hapticMedium();
      setVoiceState("transcribing");
      try {
        const result = await stopAndTranscribe();
        if (result.text) {
          hapticSuccess();
          setShowFlash(true);
          setTimeout(() => setShowFlash(false), 700);
          onSend(result.text);
        }
      } catch (e) {
        console.warn("Transcription error:", e);
      }
      setVoiceState("idle");
      return;
    }

    if (voiceState === "transcribing") return;

    const granted = await requestMicPermission();
    if (!granted) return;

    try {
      hapticLight();
      await startRecording();
      setVoiceState("recording");
    } catch (e) {
      console.warn("Recording error:", e);
      setVoiceState("idle");
    }
  }, [voiceState, onSend]);

  const handleCancel = useCallback(async () => {
    if (voiceState !== "recording") return;
    hapticLight();
    await cancelRecording();
    setVoiceState("idle");
  }, [voiceState]);

  const canSend = value.trim().length > 0 && !disabled;
  const isRecording = voiceState === "recording";
  const isTranscribing = voiceState === "transcribing";

  const shellBorderColor = isRecording
    ? shellGlow.interpolate({
        inputRange: [0, 1],
        outputRange: ["rgba(239,68,68,0.15)", "rgba(239,68,68,0.45)"],
      })
    : colors.borderStrong;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* ── Input shell ── */}
        <Animated.View
          style={[
            styles.inputShell,
            { borderColor: shellBorderColor },
          ]}
        >
          {isRecording ? (
            <View style={styles.recContent}>
              <BlinkingDot />
              <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
              <WaveBars />
              <Pressable onPress={handleCancel} hitSlop={8}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          ) : isTranscribing ? (
            <View style={styles.transContent}>
              <SpinnerDots />
              <Text style={styles.transText}>Sending voice…</Text>
            </View>
          ) : (
            <View style={styles.inputRow}>
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
                onSubmitEditing={handleSend}
                keyboardAppearance="dark"
              />
              {!disabled && (
                <Pressable
                  onPress={handleMicPress}
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.micInline,
                    pressed && styles.micInlinePressed,
                  ]}
                >
                  <Ionicons
                    name="mic-outline"
                    size={20}
                    color={colors.textMuted}
                  />
                </Pressable>
              )}
            </View>
          )}
        </Animated.View>

        {/* ── Action button ── */}
        {isRecording ? (
          <Pressable onPress={handleMicPress}>
            <View style={styles.actionWrap}>
              {rings.map((ring, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.ring,
                    {
                      opacity: ring.opacity,
                      transform: [{ scale: ring.scale }],
                    },
                  ]}
                />
              ))}
              <Animated.View style={{ transform: [{ scale: micPulse }] }}>
                <LinearGradient
                  colors={[...gradVoice]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.actionBtn, styles.actionBtnRecording]}
                >
                  <Ionicons name="stop" size={20} color="#fff" />
                </LinearGradient>
              </Animated.View>
              <SendFlash active={showFlash} />
            </View>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleSend}
            disabled={!canSend || isTranscribing}
          >
            <Animated.View style={{ transform: [{ scale: sendScale }] }}>
              <LinearGradient
                colors={
                  canSend && !isTranscribing
                    ? [...gradCta]
                    : ["#475569", "#334155"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.actionBtn,
                  canSend && !isTranscribing && shadows.soft,
                  (!canSend || isTranscribing) && styles.actionBtnMuted,
                ]}
              >
                <Ionicons
                  name="arrow-up"
                  size={22}
                  color={canSend && !isTranscribing ? colors.bgDeep : colors.textSecondary}
                />
              </LinearGradient>
            </Animated.View>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/* ── Styles ──────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {},
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },

  /* input shell */
  inputShell: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
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
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    paddingVertical: 13,
    paddingHorizontal: 18,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
    textAlignVertical: "center",
  },
  micInline: {
    padding: 14,
    paddingLeft: 4,
  },
  micInlinePressed: {
    opacity: 0.45,
  },

  /* recording state */
  recContent: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingHorizontal: 16,
    gap: 10,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  timerText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    fontVariant: ["tabular-nums"],
    minWidth: 40,
  },
  waveBars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    flex: 1,
    height: 24,
    justifyContent: "center",
  },
  waveBar: {
    width: 3,
    height: 22,
    borderRadius: 1.5,
    backgroundColor: colors.accent,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accentDim,
    letterSpacing: 0.2,
  },

  /* transcribing state */
  transContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
    gap: 10,
  },
  transText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  spinnerWrap: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  spinnerDot: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.accent,
    top: 0,
    left: 7.5,
  },

  /* send flash */
  sendFlash: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
  },

  /* action button (send / stop) */
  actionWrap: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#ef4444",
  },
  actionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  actionBtnRecording: {
    ...Platform.select({
      ios: {
        shadowColor: "#ef4444",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  actionBtnMuted: {
    borderColor: colors.border,
    opacity: 0.55,
  },
});
