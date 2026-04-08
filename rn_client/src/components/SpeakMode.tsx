import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, gradBg } from "../theme";
import { sendChat, textToSpeech } from "../lib/api";
import { playTtsSegments, stopTts } from "../lib/ttsPlayer";
import {
  startRecording,
  stopAndTranscribe,
  cancelRecording,
  requestMicPermission,
} from "../lib/speechToText";
import { hapticLight, hapticMedium, hapticSuccess } from "../lib/haptics";

const { width: SW } = Dimensions.get("window");
const ORB_SIZE = Math.min(150, SW * 0.38);
const WAVE_D = ORB_SIZE * 2.2;

type SpeakState = "idle" | "recording" | "processing" | "speaking";

const THINKING_MESSAGES = [
  "Analyzing your query…",
  "Searching knowledge base…",
  "Processing your request…",
  "Understanding the context…",
  "Connecting the dots…",
  "Preparing a thoughtful response…",
  "Digging deeper into your question…",
  "Running through our models…",
  "Almost there…",
  "Crafting the best answer…",
  "Reviewing relevant information…",
  "Generating insights…",
];

const SPEAKING_MESSAGES = [
  "Reading the response…",
  "Speaking the answer…",
  "Delivering insights…",
  "Playing the answer for you…",
  "Narrating the response…",
];

interface Props {
  visible: boolean;
  onClose: () => void;
  sessionId: string;
  languageCode: string;
  onMessage: (userText: string, botText: string) => void;
}

/* ── Ripple Rings (recording) ─────────────────────────── */

function RippleRings({ color }: { color: string }) {
  const rings = useRef(
    Array.from({ length: 3 }, () => ({
      scale: new Animated.Value(1),
      opacity: new Animated.Value(0),
    })),
  ).current;

  useEffect(() => {
    const anims: Animated.CompositeAnimation[] = [];
    const tids: ReturnType<typeof setTimeout>[] = [];
    rings.forEach((r, i) => {
      const tid = setTimeout(() => {
        const a = Animated.loop(
          Animated.sequence([
            Animated.parallel([
              Animated.timing(r.scale, { toValue: 1, duration: 0, useNativeDriver: true }),
              Animated.timing(r.opacity, { toValue: 0.4, duration: 0, useNativeDriver: true }),
            ]),
            Animated.parallel([
              Animated.timing(r.scale, {
                toValue: 2.4,
                duration: 1800,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.timing(r.opacity, {
                toValue: 0,
                duration: 1800,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
            ]),
          ]),
        );
        anims.push(a);
        a.start();
      }, i * 600);
      tids.push(tid);
    });
    return () => {
      tids.forEach(clearTimeout);
      anims.forEach((a) => a.stop());
    };
  }, [rings]);

  return (
    <>
      {rings.map((r, i) => (
        <Animated.View
          key={i}
          style={[
            ripStyles.ring,
            {
              borderColor: color,
              opacity: r.opacity,
              transform: [{ scale: r.scale }],
            },
          ]}
        />
      ))}
    </>
  );
}

const ripStyles = StyleSheet.create({
  ring: {
    position: "absolute",
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    borderWidth: 2,
  },
});

/* ── Cycling Loading Messages ─────────────────────────── */

function CyclingLoader({ messages }: { messages: readonly string[] }) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * messages.length));
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -6, duration: 220, useNativeDriver: true }),
      ]).start(() => {
        setIdx((prev) => {
          let next = Math.floor(Math.random() * messages.length);
          while (next === prev && messages.length > 1) {
            next = Math.floor(Math.random() * messages.length);
          }
          return next;
        });
        translateY.setValue(6);
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 14,
            stiffness: 160,
          }),
        ]).start();
      });
    }, 2600);

    return () => clearInterval(timer);
  }, [messages, opacity, translateY]);

  return (
    <Animated.View style={[loadStyles.wrap, { opacity, transform: [{ translateY }] }]}>
      <View style={loadStyles.dotRow}>
        <PulsingDot delay={0} />
        <PulsingDot delay={150} />
        <PulsingDot delay={300} />
      </View>
      <Text style={loadStyles.text}>{messages[idx]}</Text>
    </Animated.View>
  );
}

function PulsingDot({ delay }: { delay: number }) {
  const scale = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1,
          duration: 500,
          delay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.6,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [scale, delay]);

  return (
    <Animated.View
      style={[loadStyles.dot, { transform: [{ scale }] }]}
    />
  );
}

const loadStyles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  dotRow: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    opacity: 0.7,
  },
  text: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textMuted,
    letterSpacing: 0.2,
    textAlign: "center",
  },
});

/* ── Karaoke Text (highlighted word-by-word + auto-scroll) ── */

function KaraokeText({ text, progress }: { text: string; progress: number }) {
  const scrollRef = useRef<ScrollView>(null);
  const containerH = useRef(0);
  const contentH = useRef(0);
  const prevIdx = useRef(-1);

  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  const activeIdx = Math.min(
    Math.floor(progress * words.length),
    words.length - 1,
  );

  useEffect(() => {
    if (activeIdx === prevIdx.current) return;
    prevIdx.current = activeIdx;
    const scrollable = contentH.current - containerH.current;
    if (scrollable > 0 && scrollRef.current) {
      scrollRef.current.scrollTo({
        y: (activeIdx / Math.max(words.length - 1, 1)) * scrollable,
        animated: true,
      });
    }
  }, [activeIdx, words.length]);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        useNativeDriver: true,
        damping: 16,
        stiffness: 120,
      }),
    ]).start();
  }, [fadeIn, slideUp]);

  return (
    <Animated.View
      style={[karStyles.outer, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}
    >
      <LinearGradient
        colors={["rgba(94,234,212,0.12)", "rgba(99,102,241,0.08)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={karStyles.border}
      >
        <View style={karStyles.card}>
          <ScrollView
            ref={scrollRef}
            style={karStyles.scroll}
            showsVerticalScrollIndicator={false}
            onLayout={(e) => {
              containerH.current = e.nativeEvent.layout.height;
            }}
            onContentSizeChange={(_, h) => {
              contentH.current = h;
            }}
          >
            <Text style={karStyles.textWrap}>
              {words.map((w, i) => (
                <Text
                  key={i}
                  style={i <= activeIdx ? karStyles.active : karStyles.dim}
                >
                  {w}{" "}
                </Text>
              ))}
            </Text>
          </ScrollView>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const karStyles = StyleSheet.create({
  outer: {
    width: "100%",
    paddingHorizontal: 20,
    maxHeight: 200,
    marginTop: 12,
  },
  border: {
    borderRadius: 18,
    padding: 1.5,
  },
  card: {
    backgroundColor: "rgba(15,23,42,0.8)",
    borderRadius: 17,
    padding: 16,
  },
  scroll: {
    maxHeight: 170,
  },
  textWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  active: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "500",
    color: "#f8fafc",
  },
  dim: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "400",
    color: "rgba(148,163,184,0.35)",
  },
});

/* ── Water Wave Layer ─────────────────────────────────── */

function WaterWaves({
  active,
  waveColors,
}: {
  active: boolean;
  waveColors: readonly [string, string, string];
}) {
  const w1 = useRef(new Animated.Value(0)).current;
  const w2 = useRef(new Animated.Value(0)).current;
  const w3 = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(ORB_SIZE * 0.7)).current;

  useEffect(() => {
    if (!active) {
      Animated.timing(rise, {
        toValue: ORB_SIZE * 0.7,
        duration: 600,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(rise, {
      toValue: ORB_SIZE * 0.1,
      duration: 1400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const a1 = Animated.loop(
      Animated.sequence([
        Animated.timing(w1, {
          toValue: ORB_SIZE * 0.18,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(w1, {
          toValue: -ORB_SIZE * 0.18,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const a2 = Animated.loop(
      Animated.sequence([
        Animated.timing(w2, {
          toValue: -ORB_SIZE * 0.14,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(w2, {
          toValue: ORB_SIZE * 0.14,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const a3 = Animated.loop(
      Animated.sequence([
        Animated.timing(w3, {
          toValue: ORB_SIZE * 0.12,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(w3, {
          toValue: -ORB_SIZE * 0.12,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [active, w1, w2, w3, rise]);

  const left = (ORB_SIZE - WAVE_D) / 2;

  return (
    <>
      <Animated.View
        style={[
          waterS.circle,
          {
            backgroundColor: waveColors[0],
            left,
            transform: [{ translateX: w1 }, { translateY: rise }],
          },
        ]}
      />
      <Animated.View
        style={[
          waterS.circle,
          {
            backgroundColor: waveColors[1],
            left,
            top: 6,
            transform: [{ translateX: w2 }, { translateY: rise }],
          },
        ]}
      />
      <Animated.View
        style={[
          waterS.circle,
          {
            backgroundColor: waveColors[2],
            left,
            top: 12,
            transform: [{ translateX: w3 }, { translateY: rise }],
          },
        ]}
      />
    </>
  );
}

const waterS = StyleSheet.create({
  circle: {
    position: "absolute",
    width: WAVE_D,
    height: WAVE_D,
    borderRadius: WAVE_D / 2,
    top: 0,
  },
});

/* ── Fading Text ────────────────────────────────────── */

function FadingText({ text, style }: { text: string; style?: object }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const tY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    opacity.setValue(0);
    tY.setValue(10);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(tY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 16,
        stiffness: 120,
      }),
    ]).start();
  }, [text, opacity, tY]);

  if (!text) return null;

  return (
    <Animated.Text
      style={[style, { opacity, transform: [{ translateY: tY }] }]}
      numberOfLines={3}
    >
      {text}
    </Animated.Text>
  );
}

/* ── Ambient Glow Layers ─────────────────────────────── */

function AmbientGlow({ state }: { state: SpeakState }) {
  const tealOp = useRef(new Animated.Value(1)).current;
  const redOp = useRef(new Animated.Value(0)).current;
  const indigoOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const to = { duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true };
    Animated.parallel([
      Animated.timing(tealOp, {
        toValue: state === "idle" || state === "speaking" ? 1 : 0,
        ...to,
      }),
      Animated.timing(redOp, {
        toValue: state === "recording" ? 1 : 0,
        ...to,
      }),
      Animated.timing(indigoOp, {
        toValue: state === "processing" ? 1 : 0,
        ...to,
      }),
    ]).start();
  }, [state, tealOp, redOp, indigoOp]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: tealOp }]}>
        <LinearGradient
          colors={["rgba(94,234,212,0.1)", "transparent", "rgba(94,234,212,0.06)"]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: redOp }]}>
        <LinearGradient
          colors={["rgba(239,68,68,0.12)", "transparent", "rgba(239,68,68,0.08)"]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: indigoOp }]}>
        <LinearGradient
          colors={["rgba(99,102,241,0.12)", "transparent", "rgba(99,102,241,0.08)"]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

/* ── Main SpeakMode ─────────────────────────────────── */

export function SpeakMode({
  visible,
  onClose,
  sessionId,
  languageCode,
  onMessage,
}: Props) {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<SpeakState>("idle");
  const [userText, setUserText] = useState("");
  const [botText, setBotText] = useState("");
  const [readProgress, setReadProgress] = useState(0);
  const [errorText, setErrorText] = useState("");
  const [mounted, setMounted] = useState(false);
  const mountedRef = useRef(false);
  const busyRef = useRef(false);
  const interruptedRef = useRef(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const orbBreath = useRef(new Animated.Value(1)).current;
  const orbPress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!errorText) return;
    const t = setTimeout(() => setErrorText(""), 4000);
    return () => clearTimeout(t);
  }, [errorText]);

  useEffect(() => {
    mountedRef.current = mounted;
  }, [mounted]);

  // Mount / unmount
  useEffect(() => {
    if (visible) {
      setMounted(true);
      setState("idle");
      setUserText("");
      setBotText("");
      setReadProgress(0);
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeIn, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setMounted(false));
    }
  }, [visible, fadeIn]);

  // Breathing
  useEffect(() => {
    if (!mounted) return;
    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(orbBreath, {
          toValue: 1.05,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orbBreath, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    b.start();
    return () => b.stop();
  }, [mounted, orbBreath]);

  useEffect(() => {
    if (visible) {
      cancelRecording().catch(() => {});
    } else {
      cancelRecording().catch(() => {});
      stopTts().catch(() => {});
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    cancelRecording().catch(() => {});
    stopTts().catch(() => {});
    onClose();
  }, [onClose]);

  const handleOrb = useCallback(async () => {
    Animated.sequence([
      Animated.timing(orbPress, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(orbPress, { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 200 }),
    ]).start();

    if (state === "processing") return;

    if (state === "speaking") {
      interruptedRef.current = true;
      hapticLight();
      await stopTts();
      setReadProgress(1);
      await new Promise((r) => setTimeout(r, 300));
      if (!mountedRef.current) return;
      const granted = await requestMicPermission();
      if (!granted || !mountedRef.current) {
        setState("idle");
        setErrorText("Microphone permission required");
        busyRef.current = false;
        return;
      }
      try {
        setUserText("");
        setBotText("");
        setErrorText("");
        setReadProgress(0);
        await startRecording();
        setState("recording");
      } catch {
        setState("idle");
        setErrorText("Could not start recording");
      }
      busyRef.current = false;
      return;
    }

    if (busyRef.current) return;
    busyRef.current = true;

    try {
      if (state === "recording") {
        hapticMedium();
        setState("processing");
        setErrorText("");
        interruptedRef.current = false;
        try {
          const result = await stopAndTranscribe();
          if (!mountedRef.current) return;

          if (!result.text) {
            console.warn("[SpeakMode] STT returned empty text");
            setErrorText("No speech detected. Tap to try again.");
            setState("idle");
            return;
          }

          setUserText(result.text);

          const chatRes = await sendChat({
            session_id: sessionId,
            message: result.text,
            language_code: languageCode !== "en-IN" ? languageCode : null,
          });

          if (!mountedRef.current) return;

          const reply = chatRes.response;
          setBotText(reply);
          onMessage(result.text, reply);

          setState("speaking");
          hapticSuccess();

          try {
            const ttsRes = await textToSpeech(reply, languageCode);
            if (mountedRef.current && !interruptedRef.current) {
              await playTtsSegments(ttsRes.segments, (p) => {
                if (mountedRef.current) setReadProgress(p);
              });
            }
          } catch (ttsErr) {
            console.warn("[SpeakMode] TTS playback failed:", ttsErr);
          }

          if (mountedRef.current && !interruptedRef.current) {
            setReadProgress(1);
            setState("idle");
          }
        } catch (e: any) {
          console.warn("[SpeakMode] Voice pipeline error:", e);
          if (mountedRef.current) {
            const msg = e?.message || "";
            if (/no speech|empty/i.test(msg)) {
              setErrorText("No speech detected. Tap to try again.");
            } else if (/timed? ?out/i.test(msg)) {
              setErrorText("Request timed out. Please try again.");
            } else if (/cannot reach|network|fetch/i.test(msg)) {
              setErrorText("Cannot reach server. Check your connection.");
            } else {
              setErrorText("Something went wrong. Tap to try again.");
            }
            setBotText("");
            setState("idle");
          }
        }
        return;
      }

      // idle → recording
      hapticLight();
      setUserText("");
      setBotText("");
      setErrorText("");
      setReadProgress(0);
      const granted = await requestMicPermission();
      if (!granted) {
        setErrorText("Microphone permission required");
        return;
      }

      try {
        await startRecording();
        setState("recording");
      } catch {
        setState("idle");
        setErrorText("Could not start recording");
      }
    } finally {
      if (!interruptedRef.current) {
        busyRef.current = false;
      }
    }
  }, [state, sessionId, languageCode, onMessage, orbPress]);

  if (!mounted) return null;

  const showWaves = state === "processing" || state === "speaking";

  const orbGradient: readonly [string, string, string] =
    state === "recording"
      ? ["#f87171", "#ef4444", "#dc2626"]
      : state === "processing"
        ? ["#818cf8", "#6366f1", "#4f46e5"]
        : ["#5eead4", "#2dd4bf", "#14b8a6"];

  const waveColors: readonly [string, string, string] =
    state === "processing"
      ? ["rgba(199,210,254,0.2)", "rgba(165,180,252,0.3)", "rgba(129,140,248,0.4)"]
      : ["rgba(153,246,228,0.2)", "rgba(94,234,212,0.3)", "rgba(45,212,191,0.42)"];

  const showLoading = state === "processing" || state === "speaking";
  const loadingMessages = state === "speaking" ? SPEAKING_MESSAGES : THINKING_MESSAGES;
  const showKaraoke = state === "speaking" && botText.length > 0;

  return (
    <Animated.View style={[s.overlay, { opacity: fadeIn }]}>
      {/* Background gradient */}
      <LinearGradient
        colors={[...gradBg]}
        locations={[0, 0.35, 0.7, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* State-reactive ambient glow */}
      <AmbientGlow state={state} />

      {/* Top bar */}
      <View style={[s.topBar, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <Pressable
          onPress={handleClose}
          hitSlop={14}
          style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.6, transform: [{ scale: 0.95 }] }]}
        >
          <Ionicons name="chevron-down" size={24} color={colors.textSecondary} />
        </Pressable>
        <View style={s.titleRow}>
          <View style={s.liveIndicator}>
            <View style={s.liveDot} />
          </View>
          <Text style={s.modeLabel}>Voice Mode</Text>
        </View>
        <View style={s.placeholder} />
      </View>

      {/* Main body */}
      <View style={s.body}>
        {/* Top section — user transcript */}
        <View style={s.topSection}>
          {userText ? (
            <View style={s.userCard}>
              <FadingText text={`"${userText}"`} style={s.userText} />
            </View>
          ) : (
            state === "idle" && (
              <Text style={s.hint}>
                Tap the orb below to start speaking
              </Text>
            )
          )}
        </View>

        {/* Orb */}
        <Pressable onPress={handleOrb} style={s.orbTouchArea}>
          <Animated.View
            style={[
              s.orbOuter,
              { transform: [{ scale: Animated.multiply(orbBreath, orbPress) }] },
            ]}
          >
            {state === "recording" && <RippleRings color={orbGradient[0]} />}

            {/* Outer glow ring */}
            <LinearGradient
              colors={[`${orbGradient[0]}50`, `${orbGradient[2]}18`]}
              style={s.orbGlow}
            />

            {/* Orb body */}
            <View style={s.orbClip}>
              <LinearGradient
                colors={[...orbGradient]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />

              {/* Water waves */}
              <WaterWaves active={showWaves} waveColors={waveColors} />

              {/* Glass highlight */}
              <View style={s.glassHighlight} />

              {/* Center icon */}
              <View style={s.orbCenter}>
                {state === "idle" && (
                  <Ionicons name="mic" size={44} color="rgba(0,0,0,0.55)" />
                )}
                {state === "recording" && (
                  <Ionicons name="mic" size={44} color="rgba(255,255,255,0.9)" />
                )}
                {state === "processing" && (
                  <Ionicons name="hourglass-outline" size={36} color="rgba(255,255,255,0.8)" />
                )}
                {state === "speaking" && (
                  <Ionicons name="volume-high" size={36} color="rgba(0,0,0,0.45)" />
                )}
              </View>
            </View>

            {/* Orb border ring */}
            <View style={[s.orbBorder, { borderColor: `${orbGradient[0]}40` }]} />
          </Animated.View>
        </Pressable>

        {/* Bottom section — loading + karaoke + errors */}
        <View style={s.bottomSection}>
          {showLoading && <CyclingLoader messages={loadingMessages} />}
          {showKaraoke && <KaraokeText text={botText} progress={readProgress} />}

          {state === "recording" && (
            <Text style={s.recordHint}>Tap again when done</Text>
          )}

          {errorText ? (
            <FadingText text={errorText} style={s.errorHint} />
          ) : null}
        </View>
      </View>

      {/* Footer */}
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        {state === "speaking" && (
          <Pressable onPress={handleOrb} style={s.interruptBtn}>
            <Ionicons name="hand-left-outline" size={14} color={colors.textMuted} />
            <Text style={s.interruptText}>Tap orb to interrupt</Text>
          </Pressable>
        )}
        {state === "idle" && botText ? (
          <Text style={s.idleHint}>Tap to continue conversation</Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

/* ── Styles ──────────────────────────────────────────── */

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(34,197,94,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#22c55e",
  },
  modeLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  placeholder: {
    width: 42,
  },

  body: {
    flex: 1,
    justifyContent: "center",
  },

  topSection: {
    alignItems: "center",
    paddingHorizontal: 24,
    minHeight: 60,
    justifyContent: "flex-end",
    paddingBottom: 16,
  },
  userCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.08)",
  },
  userText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 20,
    maxWidth: SW * 0.8,
  },
  hint: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    letterSpacing: 0.2,
  },

  orbTouchArea: {
    alignSelf: "center",
  },
  orbOuter: {
    width: ORB_SIZE + 40,
    height: ORB_SIZE + 40,
    alignItems: "center",
    justifyContent: "center",
  },
  orbGlow: {
    position: "absolute",
    width: ORB_SIZE + 32,
    height: ORB_SIZE + 32,
    borderRadius: (ORB_SIZE + 32) / 2,
  },
  orbClip: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: "hidden",
  },
  orbBorder: {
    position: "absolute",
    width: ORB_SIZE + 4,
    height: ORB_SIZE + 4,
    borderRadius: (ORB_SIZE + 4) / 2,
    borderWidth: 2,
  },
  glassHighlight: {
    position: "absolute",
    top: 10,
    left: ORB_SIZE * 0.18,
    width: ORB_SIZE * 0.3,
    height: ORB_SIZE * 0.12,
    borderRadius: ORB_SIZE * 0.1,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  orbCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },

  bottomSection: {
    alignItems: "center",
    minHeight: 100,
    paddingTop: 20,
  },
  recordHint: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 12,
    letterSpacing: 0.3,
  },
  errorHint: {
    fontSize: 13,
    color: "#f87171",
    textAlign: "center",
    marginTop: 10,
    letterSpacing: 0.2,
  },

  footer: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 20,
  },
  interruptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.08)",
  },
  interruptText: {
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  idleHint: {
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
});
