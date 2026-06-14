/**
 * Dialog (alert) — centered card, stacked full-width buttons (components §15).
 * Destructive confirmations use a destructive primary. Controlled via `visible`.
 */
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

export type DialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function Dialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: DialogProps) {
  const theme = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable
        style={[styles.scrim, { backgroundColor: theme.color.scrim }]}
        onPress={onCancel}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.card,
            {
              backgroundColor: theme.color.surface,
              borderRadius: theme.radius.xl,
              padding: theme.space[6],
              ...theme.elevation[4],
            },
          ]}
        >
          <Text variant="heading" align="center">
            {title}
          </Text>
          {message ? (
            <Text
              variant="body"
              color="textSecondary"
              align="center"
              style={{ marginTop: theme.space[2] }}
            >
              {message}
            </Text>
          ) : null}
          <View style={{ gap: theme.space[2], marginTop: theme.space[6] }}>
            <Button
              label={confirmLabel}
              variant={destructive ? 'destructive' : 'primary'}
              fullWidth
              onPress={onConfirm}
            />
            <Button label={cancelLabel} variant="ghost" fullWidth onPress={onCancel} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 320 },
});
