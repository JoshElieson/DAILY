/**
 * Settings (screens §D) — a "Your practice" entry, premium entry, and grouped
 * preference rows (General / Reflection / About). Calm, legible, semantic tokens
 * throughout. The app is anonymous/local-first, so there's no account or sign
 * in/out. Appearance cycles System → Light → Dark; default time opens the shared
 * time picker sheet.
 */
import { useRouter } from 'expo-router';
import {
  Bell,
  BellRing,
  Check,
  ChevronRight,
  Clock,
  Flame,
  Heart,
  Mail,
  MonitorSmartphone,
  Moon,
  Palette,
  Shield,
  Star,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import {
  Card,
  ListGroup,
  ListRow,
  PremiumCard,
  Screen,
  SectionHeader,
  Text,
  TimePickerSheet,
  Toggle,
  useToast,
} from '@/components';
import { openReview } from '@/features/feedback/review';
import { store } from '@/features/items/store';
import { ensurePermission, rescheduleAll } from '@/features/notifications/scheduler';
import {
  NOTIFICATION_THEMES,
  notificationTheme,
} from '@/features/notifications/themes';
import { useSettings } from '@/features/settings/SettingsProvider';
import { formatTime } from '@/lib/date';
import { links, openSupportEmail, openUrl } from '@/lib/links';
import {
  COLOR_THEMES,
  themeMeta,
  useTheme,
  type AppearancePref,
} from '@/theme';

const appearanceLabel: Record<AppearancePref, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { settings, update } = useSettings();

  const [timeOpen, setTimeOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [notifThemeOpen, setNotifThemeOpen] = useState(false);

  // Toggle the global notifications switch: request OS permission when turning
  // on, then reschedule all Dailies (or cancel everything when turning off).
  const onToggleNotifications = async (v: boolean) => {
    update('notificationsEnabled', v);
    if (v) {
      const granted = await ensurePermission();
      if (!granted) {
        toast.show({
          message: 'Allow notifications in system settings to get reminders',
          tone: 'info',
        });
      }
    }
    try {
      await rescheduleAll(v ? await store.listItems() : []);
    } catch {
      /* best-effort */
    }
  };

  // Change the notification theme, then reschedule so the new sound / look takes
  // effect on already-scheduled reminders.
  const onPickNotifTheme = async (id: (typeof NOTIFICATION_THEMES)[number]['id']) => {
    update('notificationTheme', id);
    setNotifThemeOpen(false);
    try {
      if (settings.notificationsEnabled) await rescheduleAll(await store.listItems());
    } catch {
      /* best-effort */
    }
    toast.show({ message: `Notification style: ${notificationTheme(id).label}` });
  };

  return (
    <Screen scroll>
      <Text variant="displayL" style={{ marginTop: theme.space[4], marginBottom: theme.space[5] }}>
        Settings
      </Text>

      {/* Premium card */}
      <PremiumCard
        active={settings.premiumActive}
        onPress={() => router.push('/premium')}
      />

      {/* Your profile — local snapshot (active reminders, streak, subscription) */}
      <Card
        onPress={() => router.push('/profile')}
        accessibilityLabel="Your Profile"
        style={{ marginTop: theme.space[4], paddingVertical: theme.space[5] }}
      >
        <View style={styles.profileRow}>
          <View style={{ flex: 1 }}>
            <Text variant="subheading">Your Profile</Text>
            <Text variant="caption" color="textSecondary">
              Reminders, streak &amp; subscription
            </Text>
          </View>
          <ChevronRight size={20} color={theme.color.textMuted} strokeWidth={1.75} />
        </View>
      </Card>

      {/* General */}
      <View style={styles.group}>
        <SectionHeader title="General" />
        <ListGroup>
          <ListRow
            label="Notifications"
            icon={Bell}
            trailing={
              <Toggle
                value={settings.notificationsEnabled}
                onValueChange={onToggleNotifications}
                accessibilityLabel="Notifications"
                tone="accent"
              />
            }
          />
          <ListRow
            label="Notification style"
            icon={BellRing}
            value={notificationTheme(settings.notificationTheme).label}
            onPress={() => setNotifThemeOpen(true)}
          />
          <ListRow
            label="Appearance"
            icon={MonitorSmartphone}
            value={appearanceLabel[theme.appearance]}
            onPress={() => setAppearanceOpen(true)}
          />
          <ListRow
            label="Theme"
            icon={Palette}
            value={themeMeta(theme.colorTheme).label}
            onPress={() => setThemeOpen(true)}
          />
          <ListRow
            label="Default time"
            icon={Clock}
            value={formatTime(settings.defaultTime)}
            onPress={() => setTimeOpen(true)}
          />
        </ListGroup>
      </View>

      {/* Reflection */}
      <View style={styles.group}>
        <SectionHeader title="Reflection" />
        <ListGroup>
          <ListRow
            label="Daily reflection prompt"
            icon={Moon}
            trailing={
              <Toggle
                value={settings.reflectionPrompt}
                onValueChange={(v) => update('reflectionPrompt', v)}
                accessibilityLabel="Daily reflection prompt"
                tone="accent"
              />
            }
          />
          <ListRow
            label="Show streaks"
            icon={Flame}
            trailing={
              <Toggle
                value={settings.showStreaks}
                onValueChange={(v) => update('showStreaks', v)}
                accessibilityLabel="Show streaks"
                tone="accent"
              />
            }
          />
        </ListGroup>
      </View>

      {/* About */}
      <View style={styles.group}>
        <SectionHeader title="About" />
        <ListGroup>
          <ListRow
            label="Rate Daily"
            icon={Star}
            onPress={async () => {
              const ok = await openReview();
              if (!ok) toast.show({ message: 'Thanks for the support', tone: 'info' });
            }}
          />
          <ListRow
            label="Contact support"
            icon={Mail}
            onPress={() => openSupportEmail()}
          />
          <ListRow
            label="Privacy policy"
            icon={Shield}
            onPress={() => openUrl(links.privacy)}
          />
          <ListRow label="Version" icon={Heart} value="1.0.0" />
        </ListGroup>
      </View>

      <Modal
        visible={appearanceOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAppearanceOpen(false)}
      >
        <Pressable
          style={[styles.scrim, { backgroundColor: theme.color.scrim }]}
          onPress={() => setAppearanceOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.sheet,
              {
                backgroundColor: theme.color.surface,
                borderTopLeftRadius: theme.radius.xl,
                borderTopRightRadius: theme.radius.xl,
                paddingHorizontal: theme.space[5],
                paddingBottom: theme.space[8],
              },
            ]}
          >
            <View style={styles.grabber}>
              <View style={[styles.grabberBar, { backgroundColor: theme.color.borderStrong }]} />
            </View>
            <Text variant="heading" align="center" style={{ marginBottom: theme.space[4] }}>
              Appearance
            </Text>
            {(['system', 'light', 'dark'] as AppearancePref[]).map((pref, i, arr) => (
              <View key={pref}>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: theme.appearance === pref }}
                  onPress={() => {
                    theme.setAppearance(pref);
                    setAppearanceOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    pressed && { backgroundColor: theme.color.surfaceSunken },
                    { borderRadius: theme.radius.md },
                  ]}
                >
                  <Text variant="label" style={{ flex: 1 }}>
                    {appearanceLabel[pref]}
                  </Text>
                  {theme.appearance === pref ? (
                    <Check size={20} color={theme.color.accent} strokeWidth={2} />
                  ) : null}
                </Pressable>
                {i < arr.length - 1 ? (
                  <View style={[styles.divider, { backgroundColor: theme.color.border }]} />
                ) : null}
              </View>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Color theme picker */}
      <Modal
        visible={themeOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setThemeOpen(false)}
      >
        <Pressable
          style={[styles.scrim, { backgroundColor: theme.color.scrim }]}
          onPress={() => setThemeOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.sheet,
              {
                backgroundColor: theme.color.surface,
                borderTopLeftRadius: theme.radius.xl,
                borderTopRightRadius: theme.radius.xl,
                paddingHorizontal: theme.space[5],
                paddingBottom: theme.space[8],
              },
            ]}
          >
            <View style={styles.grabber}>
              <View style={[styles.grabberBar, { backgroundColor: theme.color.borderStrong }]} />
            </View>
            <Text variant="heading" align="center" style={{ marginBottom: theme.space[4] }}>
              Theme
            </Text>
            {COLOR_THEMES.map((t, i, arr) => (
              <View key={t.id}>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: theme.colorTheme === t.id }}
                  onPress={() => {
                    theme.setColorTheme(t.id);
                    setThemeOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    pressed && { backgroundColor: theme.color.surfaceSunken },
                    { borderRadius: theme.radius.md },
                  ]}
                >
                  <View style={[styles.swatch, { backgroundColor: t.swatch }]} />
                  <View style={{ flex: 1 }}>
                    <Text variant="label">{t.label}</Text>
                    <Text variant="caption" color="textSecondary">
                      {t.hint}
                    </Text>
                  </View>
                  {theme.colorTheme === t.id ? (
                    <Check size={20} color={theme.color.accent} strokeWidth={2} />
                  ) : null}
                </Pressable>
                {i < arr.length - 1 ? (
                  <View style={[styles.divider, { backgroundColor: theme.color.border }]} />
                ) : null}
              </View>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Notification style picker */}
      <Modal
        visible={notifThemeOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setNotifThemeOpen(false)}
      >
        <Pressable
          style={[styles.scrim, { backgroundColor: theme.color.scrim }]}
          onPress={() => setNotifThemeOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.sheet,
              {
                backgroundColor: theme.color.surface,
                borderTopLeftRadius: theme.radius.xl,
                borderTopRightRadius: theme.radius.xl,
                paddingHorizontal: theme.space[5],
                paddingBottom: theme.space[8],
              },
            ]}
          >
            <View style={styles.grabber}>
              <View style={[styles.grabberBar, { backgroundColor: theme.color.borderStrong }]} />
            </View>
            <Text variant="heading" align="center" style={{ marginBottom: theme.space[1] }}>
              Notification style
            </Text>
            <Text
              variant="caption"
              color="textSecondary"
              align="center"
              style={{ marginBottom: theme.space[4] }}
            >
              Choose the sound and how reminders pop up
            </Text>
            {NOTIFICATION_THEMES.map((t, i, arr) => (
              <View key={t.id}>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: settings.notificationTheme === t.id }}
                  onPress={() => onPickNotifTheme(t.id)}
                  style={({ pressed }) => [
                    styles.option,
                    pressed && { backgroundColor: theme.color.surfaceSunken },
                    { borderRadius: theme.radius.md },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="label">{t.label}</Text>
                    <Text variant="caption" color="textSecondary">
                      {t.description}
                    </Text>
                  </View>
                  {settings.notificationTheme === t.id ? (
                    <Check size={20} color={theme.color.accent} strokeWidth={2} />
                  ) : null}
                </Pressable>
                {i < arr.length - 1 ? (
                  <View style={[styles.divider, { backgroundColor: theme.color.border }]} />
                ) : null}
              </View>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <TimePickerSheet
        visible={timeOpen}
        value={settings.defaultTime}
        title="Default reminder time"
        onConfirm={(t) => {
          update('defaultTime', t);
          setTimeOpen(false);
          toast.show({ message: 'Default time updated' });
        }}
        onClose={() => setTimeOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  group: { marginTop: 24 },
  scrim: { flex: 1, justifyContent: 'flex-end' },
  sheet: { paddingTop: 8 },
  grabber: { alignItems: 'center', paddingVertical: 12 },
  grabberBar: { width: 36, height: 4, borderRadius: 999 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  swatch: { width: 24, height: 24, borderRadius: 999 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 8 },
});
