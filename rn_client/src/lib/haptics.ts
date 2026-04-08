import * as Haptics from "expo-haptics";

export function hapticLight() {
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    /* optional on web / unsupported */
  }
}

export function hapticMedium() {
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    /* optional */
  }
}

export function hapticSuccess() {
  try {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    /* optional */
  }
}
