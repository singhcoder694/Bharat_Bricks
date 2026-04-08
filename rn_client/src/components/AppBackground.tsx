import type { ReactNode } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { gradBg } from "../theme";

interface Props extends ViewProps {
  children: ReactNode;
}

export function AppBackground({ children, style, ...rest }: Props) {
  return (
    <View style={[styles.wrap, style]} {...rest}>
      <LinearGradient
        colors={[...gradBg]}
        locations={[0, 0.35, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Subtle top glow */}
      <LinearGradient
        colors={["rgba(94,234,212,0.08)", "transparent"]}
        style={styles.glowTop}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    overflow: "hidden",
  },
  glowTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 220,
  },
});
