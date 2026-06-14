/**
 * Onboarding (master-spec D7 flow): Welcome → Promise → Set first intention →
 * **live first generation** ("the wow") → Notification permission (with preview)
 * → **soft paywall** → Home.
 *
 * The intention the user writes becomes their first real Daily (created +
 * persisted via `useCreateItem`) — there are no seeded/default Dailies; if they
 * skip, Home simply starts empty. "Enable reminders" makes the real OS
 * permission request and schedules the reminder they just created. The soft
 * paywall reuses the dismissible `/premium` sheet (annual default).
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Bell, ChevronLeft, Clock } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Button,
  Card,
  Chip,
  ContentCard,
  IconButton,
  Logo,
  ProgressDots,
  Text,
  TextField,
  TimePickerSheet,
} from '@/components';
import { itemStore } from '@/features/items/itemStore';
import { contentTypeByKey } from '@/features/items/metadata';
import type { ContentEntry, ContentType } from '@/features/items/types';
import { useCreateItem } from '@/features/items/useItems';
import { ensurePermission, rescheduleAll } from '@/features/notifications/scheduler';
import { useSettings } from '@/features/settings/SettingsProvider';
import { formatTime, isoDate } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { useReduceMotion } from '@/lib/useReduceMotion';
import { ramp } from '@/theme/tokens';
import { useTheme } from '@/theme';

type Step = 'welcome' | 'promise' | 'intention' | 'generating' | 'permission';
const DOT_STEPS: Step[] = ['welcome', 'promise', 'intention', 'permission'];

// Swipe-to-advance: how far / how fast a leftward drag must be to count as a
// "next" gesture (mirrors the bottom button when it would be enabled).
const SWIPE_DISTANCE = 56;
const SWIPE_VELOCITY = 350;

const suggestions: { label: string; type: ContentType }[] = [
  { label: 'A morning reflection', type: 'reflection' },
  { label: 'A gentle stretch nudge', type: 'habit' },
  { label: 'A journaling prompt', type: 'journal' },
  { label: 'One Spanish phrase', type: 'learning' },
  { label: 'A bedtime micro-story', type: 'story' },
];

export default function Onboarding() {
  const theme = useTheme();
  const router = useRouter();
  const { settings, completeOnboarding } = useSettings();
  const createItem = useCreateItem();

  const [step, setStep] = useState<Step>('welcome');
  const [type, setType] = useState<ContentType>('reflection');
  const [intent, setIntent] = useState('');
  const [time, setTime] = useState(settings.defaultTime);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [generated, setGenerated] = useState<ContentEntry | null>(null);

  const back = () => {
    if (step === 'promise') setStep('welcome');
    else if (step === 'intention') setStep('promise');
    else if (step === 'permission') setStep('intention');
  };

  // Single source of truth for the back affordance — drives both the header
  // arrow and the right-swipe gesture so they can't drift apart. `welcome`
  // (first page) and `generating` (transient) have no back step. Note `back()`
  // sends permission → intention, skipping `generating`, so going back never
  // re-triggers the live first generation.
  const canGoBack = step === 'promise' || step === 'intention' || step === 'permission';

  // Forward navigation that mirrors the bottom button per step. `permission`
  // is intentionally excluded — finishing onboarding ("Enable reminders") stays
  // an explicit tap, never a stray swipe.
  const canAdvance =
    step === 'welcome' ||
    step === 'promise' ||
    (step === 'intention' && intent.trim().length > 0) ||
    (step === 'generating' && generated !== null);

  const advance = () => {
    if (step === 'welcome') setStep('promise');
    else if (step === 'promise') setStep('intention');
    else if (step === 'intention' && intent.trim()) setStep('generating');
    else if (step === 'generating' && generated) setStep('permission');
  };

  // Swipe left to advance / right to go back — each only when its affordance is
  // available (the bottom button for forward, the header arrow for back). The
  // pan is horizontal-only (it fails on vertical movement) so the ScrollView
  // still scrolls; runOnJS keeps the handler on the JS thread (no reanimated).
  const swipe = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-18, 18])
    .onEnd((e) => {
      const swipedLeft =
        e.translationX < 0 &&
        (e.translationX <= -SWIPE_DISTANCE || e.velocityX <= -SWIPE_VELOCITY);
      const swipedRight =
        e.translationX > 0 &&
        (e.translationX >= SWIPE_DISTANCE || e.velocityX >= SWIPE_VELOCITY);
      if (swipedLeft && canAdvance) {
        haptics.light();
        advance();
      } else if (swipedRight && canGoBack) {
        haptics.light();
        back();
      }
    })
    .runOnJS(true);

  // Live first generation when entering the "generating" step.
  useEffect(() => {
    if (step !== 'generating') return;
    let cancelled = false;
    (async () => {
      if (!intent.trim()) {
        setStep('permission');
        return;
      }
      try {
        const item = await createItem.mutateAsync({
          type,
          intent: intent.trim().slice(0, 500),
          title:
            intent.trim().length > 42
              ? `${intent.trim().slice(0, 42).trimEnd()}…`
              : intent.trim(),
          timeOfDay: time,
          frequency: 'daily',
          reminderOn: true,
        });
        const content = await itemStore.getContent(item.id, isoDate());
        if (!cancelled) setGenerated(content ?? null);
      } catch {
        if (!cancelled) setStep('permission');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const finish = () => {
    completeOnboarding();
    // Soft paywall after onboarding, then Home (dismiss ✕ → Home).
    router.replace('/(tabs)');
    router.push('/premium');
  };

  // Request the real OS permission, then schedule the Daily they just created.
  const enableReminders = async () => {
    await ensurePermission();
    try {
      await rescheduleAll(await itemStore.listItems());
    } catch {
      /* scheduling is best-effort */
    }
    finish();
  };

  const dotIndex = DOT_STEPS.indexOf(step);

  return (
    <LinearGradient
      colors={theme.isDark ? [ramp.dusk[900], ramp.dusk[950]] : [ramp.clay[50], ramp.sand[50]]}
      style={styles.flex}
    >
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          {canGoBack ? (
            <IconButton icon={ChevronLeft} onPress={back} accessibilityLabel="Back" />
          ) : (
            <View style={{ width: 44 }} />
          )}
          {step === 'promise' || step === 'intention' ? (
            <Button label="Skip" variant="ghost" size="small" onPress={() => setStep('permission')} />
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>

        <GestureDetector gesture={swipe}>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingHorizontal: theme.space[5] }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {step === 'welcome' ? <Welcome /> : null}
            {step === 'promise' ? <Promise /> : null}
            {step === 'intention' ? (
              <Intention
                intent={intent}
                setIntent={setIntent}
                type={type}
                setType={setType}
                time={time}
                onOpenPicker={() => setPickerOpen(true)}
              />
            ) : null}
            {step === 'generating' ? <Generating content={generated} /> : null}
            {step === 'permission' ? <Permission /> : null}
          </ScrollView>
        </GestureDetector>

        <View style={[styles.footer, { paddingHorizontal: theme.space[5] }]}>
          {dotIndex >= 0 ? (
            <>
              <ProgressDots count={DOT_STEPS.length} index={dotIndex} />
              <View style={{ height: theme.space[5] }} />
            </>
          ) : null}

          {step === 'welcome' ? (
            <Button label="Get started" fullWidth onPress={() => setStep('promise')} />
          ) : null}
          {step === 'promise' ? (
            <Button label="Continue" fullWidth onPress={() => setStep('intention')} />
          ) : null}
          {step === 'intention' ? (
            <Button
              label="Set my intention"
              fullWidth
              disabled={!intent.trim()}
              onPress={() => setStep('generating')}
            />
          ) : null}
          {step === 'generating' ? (
            <Button
              label="Continue"
              fullWidth
              disabled={!generated}
              loading={!generated}
              onPress={() => setStep('permission')}
            />
          ) : null}
          {step === 'permission' ? (
            <>
              <Button label="Enable reminders" fullWidth onPress={enableReminders} />
              <Button
                label="Maybe later"
                variant="ghost"
                fullWidth
                onPress={finish}
                style={{ marginTop: theme.space[2] }}
              />
            </>
          ) : null}
        </View>

        <TimePickerSheet
          visible={pickerOpen}
          value={time}
          onConfirm={(t) => {
            setTime(t);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

function Welcome() {
  const theme = useTheme();
  return (
    <View style={styles.centered}>
      <Logo size={88} />
      <Text variant="displayXl" align="center" style={{ marginTop: theme.space[8] }}>
        Welcome to Daily
      </Text>
      <Text
        variant="bodyL"
        color="textSecondary"
        align="center"
        style={{ marginTop: theme.space[4], maxWidth: 320 }}
      >
        Tell Daily what you need. Get it every day, written just for you.
      </Text>
    </View>
  );
}

function Promise() {
  const theme = useTheme();
  return (
    <View style={styles.centered}>
      <View
        style={[
          styles.illustration,
          { backgroundColor: theme.color.surfaceSunken, borderRadius: theme.radius['2xl'] },
        ]}
      >
        <Logo size={96} />
      </View>
      <Text variant="displayL" align="center" style={{ marginTop: theme.space[7] }}>
        Gentle nudges, not alarms
      </Text>
      <Text
        variant="bodyL"
        color="textSecondary"
        align="center"
        style={{ marginTop: theme.space[4], maxWidth: 320 }}
      >
        Daily writes something fresh for you each day and delivers it softly — no stress,
        no pressure, no red badges shouting at you.
      </Text>
    </View>
  );
}

function Intention({
  intent,
  setIntent,
  type,
  setType,
  time,
  onOpenPicker,
}: {
  intent: string;
  setIntent: (v: string) => void;
  type: ContentType;
  setType: (t: ContentType) => void;
  time: string;
  onOpenPicker: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ paddingTop: theme.space[6] }}>
      <Text variant="displayL">What would you like to return to each day?</Text>
      <View style={{ height: theme.space[6] }} />
      <TextField
        placeholder="e.g. A 2-minute stoic reflection each morning"
        value={intent}
        onChangeText={setIntent}
        onClear={() => setIntent('')}
        autoFocus
        multiline
        returnKeyType="done"
        blurOnSubmit
      />
      <Text variant="caption" color="textSecondary" style={{ marginTop: theme.space[5] }}>
        Try one of these:
      </Text>
      <View style={styles.chips}>
        {suggestions.map((s) => (
          <Chip
            key={s.label}
            label={s.label}
            selected={intent === contentTypeByKey[s.type].starterIntent}
            onPress={() => {
              setType(s.type);
              setIntent(contentTypeByKey[s.type].starterIntent);
            }}
          />
        ))}
      </View>
      <View style={{ height: theme.space[6] }} />
      <Card onPress={onOpenPicker}>
        <View style={styles.timeRow}>
          <Clock size={20} color={theme.color.textSecondary} strokeWidth={1.75} />
          <Text variant="label" style={{ flex: 1 }}>
            Remind me at
          </Text>
          <Text variant="label" color="accent" tabular>
            {formatTime(time)}
          </Text>
        </View>
      </Card>
    </View>
  );
}

function Generating({ content }: { content: ContentEntry | null }) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (content || reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [content, reduceMotion, pulse]);

  return (
    <View style={styles.centered}>
      {content ? (
        <>
          <Text variant="displayL" align="center">
            Here’s your first Daily
          </Text>
          <Text
            variant="body"
            color="textSecondary"
            align="center"
            style={{ marginTop: theme.space[2], marginBottom: theme.space[6] }}
          >
            Fresh content, written just now.
          </Text>
          <View style={{ alignSelf: 'stretch' }}>
            <ContentCard entry={content} showDate={false} />
          </View>
        </>
      ) : (
        <>
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <Logo size={88} />
          </Animated.View>
          <Text variant="displayL" align="center" style={{ marginTop: theme.space[7] }}>
            Writing your first Daily…
          </Text>
          <ActivityIndicator
            color={theme.color.accent}
            style={{ marginTop: theme.space[5] }}
          />
        </>
      )}
    </View>
  );
}

function Permission() {
  const theme = useTheme();
  return (
    <View style={styles.centered}>
      <View
        style={[
          styles.bellCircle,
          { backgroundColor: theme.color.accentTint, borderRadius: theme.radius.full },
        ]}
      >
        <Bell size={40} color={theme.color.accent} strokeWidth={1.75} />
      </View>
      <Text variant="displayL" align="center" style={{ marginTop: theme.space[6] }}>
        Let Daily gently remind you
      </Text>
      <Text
        variant="bodyL"
        color="textSecondary"
        align="center"
        style={{ marginTop: theme.space[4], maxWidth: 320 }}
      >
        We’ll only notify you at the times you choose. No spam, ever. You can change this
        anytime in Settings.
      </Text>
      <Card style={{ marginTop: theme.space[7], alignSelf: 'stretch' }}>
        <Text variant="caption" color="textMuted">
          Daily · now
        </Text>
        <Text variant="subheading" style={{ marginTop: theme.space[1] }}>
          Your daily reflection is ready ✨
        </Text>
        <Text variant="body" color="textSecondary">
          Tap to read today’s — written just for you.
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  content: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  footer: { paddingBottom: 12, paddingTop: 12 },
  illustration: {
    width: '100%',
    aspectRatio: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bellCircle: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
});
