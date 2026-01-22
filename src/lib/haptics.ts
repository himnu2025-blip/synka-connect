import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export const hapticFeedback = {
  light: async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    } else if ('vibrate' in navigator) {
      navigator.vibrate(8);
    }
  },

  medium: async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } else if ('vibrate' in navigator) {
      navigator.vibrate(12);
    }
  },

  success: async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.notification({
        type: NotificationType.Success,
      });
    } else if ('vibrate' in navigator) {
      navigator.vibrate([20, 20, 20]);
    }
  },

  error: async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.notification({
        type: NotificationType.Error,
      });
    } else if ('vibrate' in navigator) {
      navigator.vibrate([60, 30, 60]);
    }
  },
};
