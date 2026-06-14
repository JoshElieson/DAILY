/**
 * TimePickerSheet — a bottom-sheet wrapper around TimePicker, reused by the
 * create flow, settings, and onboarding (components §10, §14). Controlled via
 * `visible`.
 */
import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { Text } from './Text';
import { TimePicker } from './TimePicker';

export type TimePickerSheetProps = {
  visible: boolean;
  value: string;
  title?: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
};

export function TimePickerSheet({
  visible,
  value,
  title = 'Remind me at',
  onConfirm,
  onClose,
}: TimePickerSheetProps) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.scrim, { backgroundColor: theme.color.scrim }]}>
        <View
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
          <Text variant="heading" align="center" style={{ marginBottom: theme.space[5] }}>
            {title}
          </Text>
          <TimePicker value={value} onConfirm={onConfirm} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end' },
  sheet: { paddingTop: 8 },
  grabber: { alignItems: 'center', paddingVertical: 12 },
  grabberBar: { width: 36, height: 4, borderRadius: 999 },
});
