/**
 * Routes notification taps to the relevant Daily (roadmap T-303). Handles warm
 * taps (a live listener) and cold start (the last response that launched the
 * app). No-op on web / when the module is unavailable.
 */
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import type { NotificationResponse } from 'expo-notifications';

export function useNotificationObserver() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let N: typeof import('expo-notifications');
    try {
      N = require('expo-notifications') as typeof import('expo-notifications');
    } catch {
      return;
    }

    let mounted = true;
    const route = (response: NotificationResponse | null) => {
      const itemId = response?.notification.request.content.data?.itemId;
      if (mounted && typeof itemId === 'string' && itemId) {
        router.push({ pathname: '/item/[id]', params: { id: itemId } });
      }
    };

    N.getLastNotificationResponseAsync().then(route).catch(() => {});
    const sub = N.addNotificationResponseReceivedListener(route);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, [router]);
}
