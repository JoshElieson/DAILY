/**
 * Section header — overline eyebrow, secondary color (screens §B ⑤).
 * Optional trailing slot for actions/counts.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { Text } from './Text';

export type SectionHeaderProps = {
  title: string;
  trailing?: React.ReactNode;
};

export function SectionHeader({ title, trailing }: SectionHeaderProps) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { marginBottom: theme.space[2] }]}>
      <Text variant="overline" color="textSecondary">
        {title}
      </Text>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
