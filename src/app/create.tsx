/**
 * Create / edit a Daily (master-spec §9.3 + D10). Presented as a modal sheet
 * from the FAB. One field the user fills — a free-text **intent** that doubles
 * as the card title and the Claude prompt — plus a content-type chip row, Time,
 * Repeat (Daily / Weekdays / any custom set of days), and a Reminder toggle (on
 * by default). No separate
 * "note" or "category" (deferred — D4/D10).
 *
 * Save is disabled until an intent exists; on save the Daily is persisted and
 * today's content is pre-generated (master-spec §6.6). Editing (`?id=`) prefills
 * values and adds a destructive delete.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Bell, Clock } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Button,
  Card,
  Dialog,
  ListGroup,
  ListRow,
  RepeatSelector,
  Text,
  TextField,
  TimePickerSheet,
  Toggle,
  useToast,
} from '@/components';
import {
  atFreeLimit,
  atReminderLimit,
  FREE_ACTIVE_LIMIT,
  FREE_REMINDER_LIMIT,
} from '@/features/items/limits';
import { contentTypeByKey } from '@/features/items/metadata';
import type { ContentType, Frequency } from '@/features/items/types';
import {
  useCreateItem,
  useDeleteItem,
  useItem,
  useItems,
  useUpdateItem,
} from '@/features/items/useItems';
import { useSettings } from '@/features/settings/SettingsProvider';
import { formatTime } from '@/lib/date';
import { useTheme } from '@/theme';

export default function CreateScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { settings } = useSettings();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;

  const { data: existing } = useItem(id ?? '');
  const { data: allItems } = useItems();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();

  const [type, setType] = useState<ContentType>('reflection');
  const [intent, setIntent] = useState('');
  const [time, setTime] = useState(settings.defaultTime);
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [daysOfWeek, setDaysOfWeek] = useState<number[] | undefined>(undefined);
  const [reminderOn, setReminderOn] = useState(true);

  const [timeOpen, setTimeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reminderLimitOpen, setReminderLimitOpen] = useState(false);

  // Prefill when editing.
  useEffect(() => {
    if (existing) {
      setType(existing.type);
      setIntent(existing.intent);
      setTime(existing.timeOfDay);
      setFrequency(existing.frequency);
      setDaysOfWeek(existing.daysOfWeek);
      setReminderOn(existing.reminderOn);
    }
  }, [existing]);

  const canSave = intent.trim().length > 0;
  const saving = createItem.isPending || updateItem.isPending;

  const onSave = async () => {
    if (!canSave) return;
    const active = (allItems ?? []).filter((i) => i.status === 'active');
    // Free-tier cap (T-403): block a *new* Daily past the limit and offer the
    // upsell. Editing an existing Daily is never blocked.
    if (!editing && atFreeLimit(active.length, settings.premiumActive)) {
      toast.show({
        message: `Free includes ${FREE_ACTIVE_LIMIT} Dailies — go Premium for unlimited`,
        tone: 'info',
      });
      router.push('/premium');
      return;
    }
    // Reminder cap: free includes 2 daily reminders. Turning on a 3rd is blocked
    // by a popup that routes to Premium. The sheet stays put so the user can
    // also just turn the reminder off and save the Daily without a reminder.
    if (reminderOn) {
      const otherReminders = active.filter((i) => i.reminderOn && i.id !== id).length;
      if (atReminderLimit(otherReminders, settings.premiumActive)) {
        setReminderLimitOpen(true);
        return;
      }
    }
    const trimmed = intent.trim();
    const payload = {
      type,
      intent: trimmed.slice(0, 500),
      // Short label derived from the intent (master-spec §4.1 title default).
      title: trimmed.length > 42 ? `${trimmed.slice(0, 42).trimEnd()}…` : trimmed,
      timeOfDay: time,
      frequency,
      // Only custom cadences carry an explicit day-set; presets imply theirs.
      daysOfWeek: frequency === 'custom' ? daysOfWeek : undefined,
      reminderOn,
    };
    if (editing && id) {
      await updateItem.mutateAsync({ id, patch: payload });
      toast.show({ message: 'Daily updated' });
    } else {
      await createItem.mutateAsync(payload);
      toast.show({ message: 'Daily saved' });
    }
    router.back();
  };

  const onDelete = async () => {
    if (!id) return;
    setDeleteOpen(false);
    await deleteItem.mutateAsync(id);
    toast.show({ message: 'Daily deleted', tone: 'info' });
    router.replace('/(tabs)/');
  };

  const typeMeta = contentTypeByKey[type];

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.color.surface }]} edges={['top']}>
      <View style={styles.grabberWrap}>
        <View style={[styles.grabber, { backgroundColor: theme.color.borderStrong }]} />
      </View>
      <View style={styles.header}>
        <Button label="Cancel" variant="ghost" size="small" onPress={() => router.back()} />
        <Text variant="heading">{editing ? 'Edit Daily' : 'New Daily'}</Text>
        <Button
          label="Save"
          variant="ghost"
          size="small"
          disabled={!canSave}
          loading={saving}
          onPress={onSave}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={{ padding: theme.space[5], paddingBottom: theme.space[10] }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* The single field the user fills — intent (title + Claude prompt) */}
          <TextField
            label="What would you like help with each day?"
            placeholder={typeMeta.starterIntent || 'Describe your daily intent…'}
            value={intent}
            onChangeText={setIntent}
            onClear={() => setIntent('')}
            autoFocus={!editing}
            multiline
            maxLength={500}
            helper="This becomes your card title and what Daily writes from."
          />

          <View style={{ height: theme.space[5] }} />
          <ListGroup>
            <ListRow
              label="Time"
              icon={Clock}
              value={formatTime(time)}
              onPress={() => setTimeOpen(true)}
            />
            <ListRow
              label="Reminder"
              icon={Bell}
              trailing={
                <Toggle
                  value={reminderOn}
                  onValueChange={setReminderOn}
                  accessibilityLabel="Reminder notification"
                />
              }
            />
          </ListGroup>

          <Card style={{ marginTop: theme.space[3] }}>
            <RepeatSelector
              frequency={frequency}
              daysOfWeek={daysOfWeek}
              onChange={(v) => {
                setFrequency(v.frequency);
                setDaysOfWeek(v.daysOfWeek);
              }}
            />
          </Card>

          <View style={{ height: theme.space[6] }} />
          <Button label="Save" fullWidth disabled={!canSave} loading={saving} onPress={onSave} />

          {editing ? (
            <Button
              label="Delete Daily"
              variant="destructive"
              fullWidth
              onPress={() => setDeleteOpen(true)}
              style={{ marginTop: theme.space[3] }}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <TimePickerSheet
        visible={timeOpen}
        value={time}
        onConfirm={(t) => {
          setTime(t);
          setTimeOpen(false);
        }}
        onClose={() => setTimeOpen(false)}
      />

      <Dialog
        visible={deleteOpen}
        title="Delete this Daily?"
        message="This removes the Daily and its saved content from this device."
        confirmLabel="Delete"
        destructive
        onConfirm={onDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      <Dialog
        visible={reminderLimitOpen}
        title="Unlock more reminders"
        message={`Free includes ${FREE_REMINDER_LIMIT} daily reminders. Go Premium for unlimited reminders — or turn this reminder off to save the Daily without one.`}
        confirmLabel="Go Premium"
        cancelLabel="Not now"
        onConfirm={() => {
          setReminderLimitOpen(false);
          router.push('/premium');
        }}
        onCancel={() => setReminderLimitOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grabberWrap: { alignItems: 'center', paddingTop: 8 },
  grabber: { width: 36, height: 4, borderRadius: 999 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
