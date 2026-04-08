import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../theme";

export function Disclaimer() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>
        Educational info only · Not legal or medical advice
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
    paddingVertical: 8,
    paddingHorizontal: spacing.md + 4,
  },
  text: {
    fontSize: 10.5,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 15,
    letterSpacing: 0.15,
    opacity: 0.7,
  },
  line2: {
    fontSize: 10.5,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 2,
    lineHeight: 15,
    opacity: 0.7,
  },
  bold: {
    fontWeight: "700",
    color: colors.accent,
    opacity: 1,
  },
});
