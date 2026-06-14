/**
 * Thin haptics wrapper so feature code never imports expo-haptics directly and
 * we can centrally respect platform support. The design system calls for light
 * impact on primary/destructive press and a `success` notification on
 * completion (components §1, motion §6.3).
 */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

export const haptics = {
  light() {
    if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  medium() {
    if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  success() {
    if (enabled)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  selection() {
    if (enabled) Haptics.selectionAsync().catch(() => {});
  },
};
