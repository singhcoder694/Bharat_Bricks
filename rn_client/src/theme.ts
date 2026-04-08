import { Platform, type TextStyle, type ViewStyle } from "react-native";

export const colors = {
  bgDeep: "#020617",
  bgPrimary: "#0f172a",
  bgSecondary: "#1e293b",
  bgElevated: "#1e293b",
  bgSurface: "#334155",
  bgInput: "#1e293b",
  glass: "rgba(30, 41, 59, 0.72)",
  glassBorder: "rgba(148, 163, 184, 0.12)",

  accent: "#5eead4",
  accentMuted: "rgba(94, 234, 212, 0.15)",
  accentDim: "#2dd4bf",
  accentGlow: "rgba(94, 234, 212, 0.35)",

  violet: "#8b5cf6",
  indigo: "#6366f1",
  indigoDeep: "#4338ca",

  bubbleUser: "#4f46e5",
  bubbleUserText: "#f8fafc",
  bubbleBot: "#f1f5f9",
  bubbleBotText: "#0f172a",

  textPrimary: "#f8fafc",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",

  border: "rgba(148, 163, 184, 0.14)",
  borderStrong: "rgba(148, 163, 184, 0.22)",
} as const;

/** Full-screen mesh-style gradient */
export const gradBg = ["#020617", "#0f172a", "#1e1b4b", "#0f172a"] as const;
/** User message bubble */
export const gradUser = ["#818cf8", "#6366f1", "#4f46e5"] as const;
/** Primary CTA / send */
export const gradCta = ["#5eead4", "#2dd4bf", "#14b8a6"] as const;
/** Drawer / modal accent strip */
export const gradDrawer = ["#1e293b", "#172554", "#1e1b4b"] as const;
/** Voice recording stop button */
export const gradVoice = ["#ef4444", "#dc2626", "#b91c1c"] as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  xs: 6,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 28,
  full: 999,
} as const;

export const typography = {
  title: { fontSize: 18, fontWeight: "700" as const, letterSpacing: -0.4, color: colors.textPrimary },
  body: { fontSize: 15, lineHeight: 23, color: colors.textPrimary },
  caption: { fontSize: 12, color: colors.textSecondary },
  micro: { fontSize: 10.5, color: colors.textMuted, letterSpacing: 0.8, textTransform: "uppercase" as const },
} satisfies Record<string, TextStyle>;

export const shadows = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.28,
      shadowRadius: 20,
    },
    android: { elevation: 10 },
    default: {},
  }),
  soft: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#6366f1",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
    },
    android: { elevation: 6 },
    default: {},
  }),
  header: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    android: { elevation: 4 },
    default: {},
  }),
} as const;
