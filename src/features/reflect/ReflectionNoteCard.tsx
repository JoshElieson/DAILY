/**
 * Reflection note card. Exactly one reflection may be saved per day. Saving
 * plays a calm "settle" moment — a success haptic, a soft sage flush across the
 * card, and a check that pops in as the footer cross-fades from Save → Done
 * (motion §6.3). Once done the text locks and the card reads as a finalized
 * entry until the next day.
 */
import { Check } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, Text } from '@/components';
import { haptics } from '@/lib/haptics';
import { useReduceMotion } from '@/lib/useReduceMotion';
import { useTheme } from '@/theme';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  loaded: boolean;
  committed: boolean;
  /** Persist the reflection. Returns true if the save was accepted. */
  onSave: () => boolean;
};

type Phase = 'editing' | 'saving' | 'done';

export function ReflectionNoteCard({ value, onChangeText, loaded, committed, onSave }: Props) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();

  // 'editing' → input + Save · 'saving' → brief transition · 'done' → locked.
  const [phase, setPhase] = useState<Phase>(committed ? 'done' : 'editing');

  // 0 = editing footer (Save) · 1 = done footer (Done badge).
  const footerT = useRef(new Animated.Value(committed ? 1 : 0)).current;
  // Check pops in independently for a tactile, slightly-delayed beat.
  const checkScale = useRef(new Animated.Value(committed ? 1 : 0)).current;
  // Sage background flush that rises then fades back to surface.
  const flush = useRef(new Animated.Value(0)).current;

  // Adopt persisted state on load / date change, but never clobber an
  // in-flight save animation.
  useEffect(() => {
    if (!loaded) return;
    setPhase((prev) => (prev === 'saving' ? prev : committed ? 'done' : 'editing'));
  }, [loaded, committed]);

  // Keep the animated values aligned with non-animated settling (load of an
  // already-committed day, or reduce-motion).
  useEffect(() => {
    if (phase === 'done') {
      footerT.setValue(1);
      checkScale.setValue(1);
    } else if (phase === 'editing') {
      footerT.setValue(0);
      checkScale.setValue(0);
      flush.setValue(0);
    }
  }, [phase, footerT, checkScale, flush]);

  const handleSave = () => {
    const accepted = onSave();
    if (!accepted) return;
    haptics.success();

    if (reduceMotion) {
      setPhase('done');
      return;
    }

    setPhase('saving');
    footerT.setValue(0);
    checkScale.setValue(0);
    flush.setValue(0);

    Animated.parallel([
      Animated.timing(footerT, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(140),
        Animated.spring(checkScale, {
          toValue: 1,
          friction: 5,
          tension: 180,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(flush, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(flush, {
          toValue: 0,
          duration: 760,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    ]).start(() => setPhase('done'));
  };

  const isDone = phase !== 'editing';
  const canSave = !isDone && value.trim().length > 0;

  const flushBg = flush.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,0,0,0)', theme.color.successTint],
  });

  const saveOpacity = footerT.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const saveShift = footerT.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const doneOpacity = footerT.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <Card style={styles.card}>
      {/* Sage flush sits behind the content, clipped to the card radius. */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: theme.radius.lg, backgroundColor: flushBg },
        ]}
      />

      <Text variant="caption" color="textMuted" style={{ marginBottom: theme.space[2] }}>
        Your reflection
      </Text>

      <TextInput
        value={loaded ? value : ''}
        onChangeText={onChangeText}
        editable={!isDone}
        onSubmitEditing={handleSave}
        placeholder="Write something…"
        placeholderTextColor={theme.color.textMuted}
        multiline
        returnKeyType="done"
        blurOnSubmit
        style={[
          styles.input,
          {
            color: isDone ? theme.color.textSecondary : theme.color.text,
            fontFamily: theme.typography.bodyL.fontFamily,
            fontSize: theme.typography.bodyL.fontSize,
            lineHeight: theme.typography.bodyL.lineHeight,
          },
        ]}
      />

      <View style={styles.footer}>
        {/* Save (editing) */}
        <Animated.View
          pointerEvents={phase === 'editing' ? 'auto' : 'none'}
          style={[
            styles.footerItem,
            { opacity: saveOpacity, transform: [{ translateY: saveShift }] },
          ]}
        >
          <Button
            variant="tonal"
            size="small"
            label="Save"
            disabled={!canSave}
            onPress={handleSave}
          />
        </Animated.View>

        {/* Done (saved) */}
        <Animated.View
          pointerEvents="none"
          style={[styles.footerItem, styles.doneRow, { opacity: doneOpacity }]}
        >
          <Animated.View
            style={[
              styles.checkCircle,
              {
                backgroundColor: theme.color.success,
                transform: [{ scale: checkScale }],
              },
            ]}
          >
            <Check size={14} color={theme.color.textOnAccent} strokeWidth={3} />
          </Animated.View>
          <Text variant="label" color="success">
            Done
          </Text>
        </Animated.View>
      </View>
    </Card>
  );
}

const FOOTER_HEIGHT = 36;

const styles = StyleSheet.create({
  card: { marginTop: 20, overflow: 'hidden' },
  input: { minHeight: 72, textAlignVertical: 'top' },
  footer: {
    height: FOOTER_HEIGHT,
    marginTop: 12,
    justifyContent: 'center',
  },
  // Both footer states occupy the same right-aligned slot and cross-fade.
  footerItem: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
