/**
 * External links + helpers (privacy policy, terms, support, subscription
 * management). The URLs below are the public endpoints the app points at; swap
 * the privacy/terms URLs for the live policy pages before App Store submission
 * (roadmap T-410 — submission gate).
 */
import { Linking, Platform } from 'react-native';

export const links = {
  privacy: 'https://daily.app/privacy',
  terms: 'https://daily.app/terms',
  supportEmail: 'support@daily.app',
} as const;

/** Open a URL, swallowing the rejection if no handler is available. */
export async function openUrl(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    /* no handler available */
  }
}

export async function openSupportEmail(subject = 'Daily — support'): Promise<void> {
  await openUrl(`mailto:${links.supportEmail}?subject=${encodeURIComponent(subject)}`);
}

/** Open the OS subscription-management screen (for active subscribers). */
export async function openManageSubscriptions(): Promise<void> {
  const url =
    Platform.OS === 'ios'
      ? 'https://apps.apple.com/account/subscriptions'
      : 'https://play.google.com/store/account/subscriptions';
  await openUrl(url);
}
