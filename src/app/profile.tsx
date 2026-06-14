/**
 * Profile (screens §D ②, profile route) — a small, local snapshot of the user's
 * practice: active reminders, streak, and subscription status, plus the privacy
 * link. The app is anonymous/local-first (master-spec §2.7 — no accounts), so
 * there is no identity, sign in, or sign out here; everything stays on device.
 */
import { useRouter } from 'expo-router';
import {
  CalendarRange,
  ChevronLeft,
  Flame,
  Gem,
  ListChecks,
  ShieldCheck,
} from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Avatar,
  Button,
  IconButton,
  ListGroup,
  ListRow,
  Screen,
  SectionHeader,
  Text,
} from '@/components';
import { useItems, useStreakStats } from '@/features/items/useItems';
import { useSettings } from '@/features/settings/SettingsProvider';
import { links, openUrl } from '@/lib/links';
import { useTheme } from '@/theme';

export default function Profile() {
  const theme = useTheme();
  const router = useRouter();
  const { settings } = useSettings();
  const { data: items } = useItems();
  const stats = useStreakStats();

  const activeCount = (items ?? []).filter((i) => i.status === 'active').length;
  const streak = stats.data?.currentStreak ?? 0;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <IconButton icon={ChevronLeft} onPress={() => router.back()} accessibilityLabel="Back" />
        <View style={{ width: 44 }} />
      </View>

      {/* Identity — anonymous, device-local */}
      <View style={styles.identity}>
        <Avatar size={88} />
        <Text variant="title" style={{ marginTop: theme.space[4] }}>
          Your Profile
        </Text>
        <Text variant="body" color="textSecondary" align="center" style={{ marginTop: theme.space[1] }}>
          Everything stays on this device, just for you.
        </Text>
      </View>

      {/* Weekly recap — a calm look back at this week's practice */}
      <Button
        label="Weekly Recap"
        icon={CalendarRange}
        variant="tonal"
        fullWidth
        onPress={() => router.push('/recap')}
        style={{ marginTop: theme.space[6] }}
        accessibilityHint="See this week's practice summary"
      />

      {/* Snapshot */}
      <View style={styles.group}>
        <SectionHeader title="Overview" />
        <ListGroup>
          <ListRow
            label="Active reminders"
            icon={ListChecks}
            value={String(activeCount)}
          />
          {settings.showStreaks ? (
            <ListRow
              label="Day streak"
              icon={Flame}
              value={streak > 0 ? `${streak}` : '—'}
            />
          ) : null}
          <ListRow
            label="Subscription"
            icon={Gem}
            value={settings.premiumActive ? 'Premium' : 'Free'}
            onPress={() => router.push('/premium')}
          />
        </ListGroup>
      </View>

      {/* Privacy */}
      <View style={styles.group}>
        <SectionHeader title="Privacy" />
        <ListGroup>
          <ListRow
            label="Privacy"
            icon={ShieldCheck}
            secondary="Your content stays on this device"
            onPress={() => openUrl(links.privacy)}
          />
        </ListGroup>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 },
  identity: { alignItems: 'center', marginTop: 16 },
  group: { marginTop: 24 },
});
