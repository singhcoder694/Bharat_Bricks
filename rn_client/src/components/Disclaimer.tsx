import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, spacing } from "../theme";

export function Disclaimer() {
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={["transparent", "rgba(94,234,212,0.06)"]}
        style={styles.glow}
      />
      <Text style={styles.text}>
        Educational information only · Not legal or medical advice
      </Text>
      <Text style={styles.line2}>
        Crisis: Women Helpline <Text style={styles.bold}>181</Text> · iCall{" "}
        <Text style={styles.bold}>9152987821</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 12,
    paddingHorizontal: spacing.md + 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    overflow: "hidden",
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    height: 40,
    top: undefined,
    bottom: 0,
  },
  text: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 16,
    letterSpacing: 0.15,
  },
  line2: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 16,
  },
  bold: {
    fontWeight: "700",
    color: colors.accent,
  },
});
