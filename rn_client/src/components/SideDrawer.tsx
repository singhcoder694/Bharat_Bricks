import { useEffect, useRef, useState } from "react";
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
import {
  colors,
  gradCta,
  gradDrawer,
  radius,
  shadows,
  spacing,
} from "../theme";
import { LANGUAGES } from "../data/dummySessions";
import { hapticLight } from "../lib/haptics";

const { width: SCREEN_W } = Dimensions.get("window");
const DRAWER_W = SCREEN_W * 0.84;

const FEATURES = [
  {
    icon: "shield-checkmark" as const,
    color: "#818cf8",
    title: "Rights & Laws",
    desc: "POSH Act, POCSO, IPC sections & legal protections",
  },
  {
    icon: "heart" as const,
    color: "#f472b6",
    title: "Health & Well-being",
    desc: "Sexual health, mental wellness & safe practices",
  },
  {
    icon: "people" as const,
    color: "#5eead4",
    title: "Support & Resources",
    desc: "Helplines, NGOs, counseling & crisis support",
  },
  {
    icon: "sparkles" as const,
    color: "#fbbf24",
    title: "Identity & Inclusion",
    desc: "Gender identity, LGBTQ+ rights & inclusive info",
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onNewChat: () => void;
}

function AnimatedSection({
  children,
  delay,
}: {
  children: React.ReactNode;
  delay: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY, delay]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

export function SideDrawer({ visible, onClose, onNewChat }: Props) {
  const translateX = useRef(new Animated.Value(-DRAWER_W)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 160,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -DRAWER_W,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [visible, translateX, backdropOpacity]);

  if (!mounted) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.drawerShell,
          { transform: [{ translateX }], width: DRAWER_W },
        ]}
      >
        <LinearGradient
          colors={[...gradDrawer]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <View style={styles.edgeLine} pointerEvents="none" />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Close button */}
          <Pressable
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={12}
          >
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </Pressable>

          {/* Header */}
          <AnimatedSection delay={60}>
            <View style={styles.header}>
              <View style={styles.logoWrap}>
                <LinearGradient
                  colors={["rgba(94,234,212,0.25)", "rgba(99,102,241,0.25)"]}
                  style={styles.logoGlow}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <LinearGradient
                  colors={[colors.accent, "#818cf8"]}
                  style={styles.logoRing}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.logoInner}>
                    <Text style={styles.logoText}>T</Text>
                  </View>
                </LinearGradient>
              </View>
              <Text style={styles.headerTitle}>Tritiya AI</Text>
              <Text style={styles.headerSub}>
                Your safe space for knowledge
              </Text>
            </View>
          </AnimatedSection>

          {/* New chat button */}
          <AnimatedSection delay={140}>
            <Pressable
              style={({ pressed }) => [
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => {
                hapticLight();
                onNewChat();
                onClose();
              }}
              android_ripple={{ color: "rgba(255,255,255,0.1)" }}
            >
              <LinearGradient
                colors={[...gradCta]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.newChatBtn}
              >
                <Ionicons name="add-circle" size={20} color={colors.bgDeep} />
                <Text style={styles.newChatText}>New conversation</Text>
              </LinearGradient>
            </Pressable>
          </AnimatedSection>

          {/* Supported Languages */}
          <AnimatedSection delay={220}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="globe-outline"
                size={14}
                color={colors.accent}
              />
              <Text style={styles.sectionLabel}>Supported Languages</Text>
            </View>
            <View style={styles.langGrid}>
              {LANGUAGES.map((lang) => (
                <View key={lang.code} style={styles.langTag}>
                  <Text style={styles.langNative}>{lang.native}</Text>
                  <View style={styles.langDot} />
                  <Text style={styles.langLabel}>{lang.label}</Text>
                </View>
              ))}
            </View>
          </AnimatedSection>

          {/* Features */}
          <AnimatedSection delay={320}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="bulb-outline"
                size={14}
                color={colors.accent}
              />
              <Text style={styles.sectionLabel}>What I Can Help With</Text>
            </View>
            <View style={styles.featureList}>
              {FEATURES.map((f) => (
                <View key={f.title} style={styles.featureCard}>
                  <View
                    style={[styles.featureAccent, { backgroundColor: f.color }]}
                  />
                  <View style={styles.featureIconWrap}>
                    <Ionicons name={f.icon} size={18} color={f.color} />
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>{f.title}</Text>
                    <Text style={styles.featureDesc}>{f.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </AnimatedSection>

          {/* Privacy card */}
          <AnimatedSection delay={420}>
            <LinearGradient
              colors={["rgba(94,234,212,0.08)", "rgba(99,102,241,0.06)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.privacyCard}
            >
              <View style={styles.privacyIconRow}>
                <Ionicons
                  name="lock-closed"
                  size={16}
                  color={colors.accent}
                />
                <Text style={styles.privacyTitle}>Privacy First</Text>
              </View>
              <Text style={styles.privacyText}>
                Conversations are private and not stored. No personal data is
                collected.
              </Text>
            </LinearGradient>
          </AnimatedSection>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Built for India · © {new Date().getFullYear()} Tritiya AI
          </Text>
          <Text style={styles.footerVersion}>v1.0.0</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,6,23,0.76)",
  },
  drawerShell: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    flexDirection: "column",
    borderRightWidth: 1,
    borderRightColor: colors.glassBorder,
    overflow: "hidden",
  },
  edgeLine: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: "rgba(94,234,212,0.18)",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 16,
  },

  closeBtn: {
    alignSelf: "flex-end",
    marginRight: spacing.md,
    marginBottom: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(148,163,184,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  header: {
    alignItems: "center",
    paddingBottom: 24,
    marginHorizontal: spacing.lg,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logoWrap: {
    width: 76,
    height: 76,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  logoGlow: {
    position: "absolute",
    width: 76,
    height: 76,
    borderRadius: 38,
    opacity: 0.6,
  },
  logoRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    padding: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  logoInner: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: colors.bgDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.accent,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 4,
    letterSpacing: 0.2,
  },

  newChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: spacing.lg,
    marginBottom: 28,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    ...shadows.soft,
  },
  newChatText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.bgDeep,
    letterSpacing: 0.1,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: spacing.lg,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },

  langGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginHorizontal: spacing.lg,
    marginBottom: 28,
  },
  langTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: "rgba(94,234,212,0.06)",
    borderWidth: 1,
    borderColor: "rgba(94,234,212,0.12)",
  },
  langNative: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  langDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textMuted,
    opacity: 0.5,
  },
  langLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },

  featureList: {
    marginHorizontal: spacing.lg,
    gap: 8,
    marginBottom: 24,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    backgroundColor: "rgba(15,23,42,0.5)",
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  featureAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: radius.sm,
    borderBottomLeftRadius: radius.sm,
    opacity: 0.7,
  },
  featureIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(148,163,184,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 11.5,
    color: colors.textMuted,
    lineHeight: 16,
  },

  privacyCard: {
    marginHorizontal: spacing.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(94,234,212,0.12)",
  },
  privacyIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  privacyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accent,
  },
  privacyText: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },

  footer: {
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: "rgba(2,6,23,0.55)",
    alignItems: "center",
    gap: 3,
  },
  footerText: {
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.1,
  },
  footerVersion: {
    fontSize: 10,
    color: colors.textMuted,
    opacity: 0.5,
  },
});
