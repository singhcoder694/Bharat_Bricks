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
import { colors, gradCta, gradDrawer, radius, shadows, spacing } from "../theme";
import { PREVIOUS_SESSIONS, LANGUAGES, type Language } from "../data/dummySessions";
import { hapticLight } from "../lib/haptics";

const { width: SCREEN_W } = Dimensions.get("window");
const DRAWER_W = SCREEN_W * 0.84;

interface Props {
  visible: boolean;
  onClose: () => void;
  onNewChat: () => void;
}

export function SideDrawer({ visible, onClose, onNewChat }: Props) {
  const translateX = useRef(new Animated.Value(-DRAWER_W)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  const [selectedLang, setSelectedLang] = useState<string>("en");

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 160 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, { toValue: -DRAWER_W, duration: 260, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible, translateX, backdropOpacity]);

  if (!mounted) return null;

  const handleLang = (lang: Language) => {
    hapticLight();
    setSelectedLang(lang.code);
  };

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.drawerShell, { transform: [{ translateX }], width: DRAWER_W }]}>
        <LinearGradient colors={[...gradDrawer]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
        <View style={styles.drawerEdge} pointerEvents="none" />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <LinearGradient colors={[colors.accentMuted, "rgba(99,102,241,0.3)"]} style={styles.headerIconRing}>
              <View style={styles.headerIcon}>
                <Text style={styles.headerIconText}>?</Text>
              </View>
            </LinearGradient>
            <Text style={styles.headerTitle}>Tritiya AI</Text>
            <Text style={styles.headerSub}>Your conversations</Text>
          </View>

          <Pressable
            style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}
            onPress={() => {
              hapticLight();
              onNewChat();
              onClose();
            }}
            android_ripple={{ color: "rgba(255,255,255,0.1)" }}
          >
            <LinearGradient colors={[...gradCta]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.newChatBtn}>
              <Text style={styles.newChatPlus}>+</Text>
              <Text style={styles.newChatText}>New conversation</Text>
            </LinearGradient>
          </Pressable>

          <Text style={styles.sectionLabel}>Recent</Text>
          {PREVIOUS_SESSIONS.map((s) => (
            <Pressable
              key={s.id}
              style={({ pressed }) => [styles.sessionRow, pressed && styles.sessionRowPressed]}
              onPress={() => {
                hapticLight();
                onClose();
              }}
              android_ripple={{ color: "rgba(255,255,255,0.06)" }}
            >
              <LinearGradient colors={["rgba(94,234,212,0.5)", colors.accent]} style={styles.sessionDot} />
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionTitle} numberOfLines={1}>{s.title}</Text>
                <Text style={styles.sessionPreview} numberOfLines={1}>{s.preview}</Text>
              </View>
              <View style={styles.sessionMeta}>
                <Text style={styles.sessionDate}>{s.date}</Text>
                <Text style={styles.sessionCount}>{s.messageCount} msgs</Text>
              </View>
            </Pressable>
          ))}

          <Text style={[styles.sectionLabel, { marginTop: 22 }]}>Language</Text>
          <View style={styles.langGrid}>
            {LANGUAGES.map((lang) => {
              const active = selectedLang === lang.code;
              return (
                <Pressable
                  key={lang.code}
                  onPress={() => handleLang(lang)}
                  style={({ pressed }) => [
                    styles.langChip,
                    active && styles.langChipActive,
                    pressed && !active && { opacity: 0.85 },
                  ]}
                >
                  <Text style={[styles.langNative, active && styles.langTextActive]}>
                    {lang.native}
                  </Text>
                  <Text style={[styles.langLabel, active && styles.langTextActive]}>
                    {lang.label}
                  </Text>
                </Pressable>
              );
            })}
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
    marginBottom: 12,
  },

  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: spacing.sm,
    marginBottom: 4,
    paddingVertical: 12,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.sm,
    backgroundColor: "rgba(15,23,42,0.35)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionRowPressed: {
    backgroundColor: "rgba(94,234,212,0.08)",
    borderColor: "rgba(94,234,212,0.2)",
  },
  sessionDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  sessionPreview: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
  },
  sessionMeta: {
    alignItems: "flex-end",
  },
  sessionDate: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: "600",
  },
  sessionCount: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
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
  langChipActive: {
    borderColor: colors.accent,
    backgroundColor: "rgba(94,234,212,0.12)",
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
  langTextActive: {
    color: colors.accent,
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
