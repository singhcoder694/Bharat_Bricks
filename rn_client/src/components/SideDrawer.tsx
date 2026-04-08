import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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

interface Props {
  visible: boolean;
  onClose: () => void;
  onNewChat: () => void;
}

export function SideDrawer({
  visible,
  onClose,
  onNewChat,
}: Props) {
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
        <View style={styles.drawerEdge} pointerEvents="none" />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <LinearGradient
              colors={[colors.accentMuted, "rgba(99,102,241,0.3)"]}
              style={styles.headerIconRing}
            >
              <View style={styles.headerIcon}>
                <Text style={styles.headerIconText}>T</Text>
              </View>
            </LinearGradient>
            <Text style={styles.headerTitle}>Tritiya AI</Text>
            <Text style={styles.headerSub}>Your safe space for knowledge</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
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
              <Text style={styles.newChatPlus}>+</Text>
              <Text style={styles.newChatText}>New conversation</Text>
            </LinearGradient>
          </Pressable>

          <Text style={styles.sectionLabel}>Supported Languages</Text>
          <Text style={styles.sectionHint}>
            Tritiya AI can respond in any of these languages
          </Text>
          <View style={styles.langGrid}>
            {LANGUAGES.map((lang) => (
              <View key={lang.code} style={styles.langChip}>
                <Text style={styles.langNative}>{lang.native}</Text>
                <Text style={styles.langLabel}>{lang.label}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 26 }]}>
            What I Can Help With
          </Text>
          <View style={styles.featureList}>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>⚖️</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Rights & Laws</Text>
                <Text style={styles.featureDesc}>
                  POSH Act, POCSO, IPC sections, and legal protections
                </Text>
              </View>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>🩺</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Health & Well-being</Text>
                <Text style={styles.featureDesc}>
                  Sexual health education, mental wellness, and safe practices
                </Text>
              </View>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>🤝</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Support & Resources</Text>
                <Text style={styles.featureDesc}>
                  Helplines, NGOs, counseling centers, and crisis support
                </Text>
              </View>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>🌈</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Identity & Inclusion</Text>
                <Text style={styles.featureDesc}>
                  Gender identity, LGBTQ+ rights, and inclusive information
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>🔒 Privacy First</Text>
            <Text style={styles.infoText}>
              Your conversations are private and not stored beyond the current session. No personal data is collected.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerAbout}>
            Tritiya AI is a privacy-first assistant for sexual health education,
            rights awareness, and well-being — built for India.
          </Text>
          <View style={styles.footerDivider} />
          <Text style={styles.footerCopy}>
            © {new Date().getFullYear()} Tritiya AI · All rights reserved
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
    backgroundColor: "rgba(2,6,23,0.72)",
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
  drawerEdge: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "rgba(94,234,212,0.22)",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 52,
    paddingBottom: 12,
  },

  header: {
    alignItems: "center",
    paddingBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginHorizontal: spacing.lg,
    marginBottom: 18,
  },
  headerIconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  headerIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.bgDeep,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.accent,
  },
  headerIconText: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.accent,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },

  newChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginHorizontal: spacing.lg,
    marginBottom: 22,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    ...shadows.soft,
  },
  newChatPlus: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.bgDeep,
  },
  newChatText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.bgDeep,
    letterSpacing: 0.2,
  },

  sectionLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginHorizontal: spacing.lg,
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginHorizontal: spacing.lg,
    marginBottom: 14,
    lineHeight: 17,
    opacity: 0.7,
  },

  featureList: {
    marginHorizontal: spacing.lg,
    gap: 6,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    backgroundColor: "rgba(15,23,42,0.35)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureIcon: {
    fontSize: 18,
    marginTop: 1,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  featureDesc: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },

  infoCard: {
    marginHorizontal: spacing.lg,
    marginTop: 20,
    marginBottom: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: "rgba(94,234,212,0.06)",
    borderWidth: 1,
    borderColor: "rgba(94,234,212,0.15)",
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accent,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },

  langGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginHorizontal: spacing.lg,
  },
  langChip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(2,6,23,0.45)",
    alignItems: "center",
  },
  langNative: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  langLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: "rgba(2,6,23,0.5)",
  },
  footerAbout: {
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.textMuted,
  },
  footerDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  footerCopy: {
    fontSize: 10.5,
    color: colors.textSecondary,
    textAlign: "center",
  },
  footerVersion: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 4,
    opacity: 0.65,
  },
});
