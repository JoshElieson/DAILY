/**
 * App Store ratings prompt (roadmap T-409). `maybeRequestReview` fires once,
 * after a positive moment (a few completions / a short streak); `openReview` is
 * the explicit "Rate Daily" action from Settings. Both use the OS-throttled
 * StoreReview API and are safe no-ops on web / when unavailable.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';

const ASKED_KEY = 'daily.review.asked';

function storeReview(): typeof import('expo-store-review') | null {
  if (Platform.OS === 'web') return null;
  try {
    return require('expo-store-review') as typeof import('expo-store-review');
  } catch {
    return null;
  }
}

/** Ask for a review at most once, ever, after a positive moment. */
export async function maybeRequestReview(): Promise<void> {
  const SR = storeReview();
  if (!SR) return;
  try {
    if (await AsyncStorage.getItem(ASKED_KEY)) return;
    if (!(await SR.isAvailableAsync())) return;
    await AsyncStorage.setItem(ASKED_KEY, '1');
    await SR.requestReview();
  } catch {
    /* best-effort */
  }
}

/** Explicit "Rate Daily" — in-app prompt if available, else the store page. */
export async function openReview(): Promise<boolean> {
  const SR = storeReview();
  if (!SR) return false;
  try {
    if (await SR.isAvailableAsync()) {
      await SR.requestReview();
      return true;
    }
    const url = await SR.storeUrl();
    if (url) {
      await Linking.openURL(url);
      return true;
    }
  } catch {
    /* best-effort */
  }
  return false;
}
