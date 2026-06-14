/**
 * Avatar — initials in a clay-tint circle (screens §D ②). Falls back to a
 * single glyph for anonymous users.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { Text } from './Text';

export type AvatarProps = {
  name?: string;
  size?: number;
};

function initials(name?: string): string {
  if (!name) return '·';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '·';
}

export function Avatar({ name, size = 48 }: AvatarProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: 999,
          backgroundColor: theme.color.accentTint,
        },
      ]}
    >
      <Text variant={size >= 48 ? 'subheading' : 'label'} color="accent">
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
});
