/**
 * Empty state — soft sunrise, serif headline, reassuring copy, single CTA
 * (components §18). Tone is never "you're behind".
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { Button } from './Button';
import { Logo } from './Logo';
import { Text } from './Text';

export type EmptyStateProps = {
  title: string;
  body?: string;
  ctaLabel?: string;
  onCta?: () => void;
};

export function EmptyState({ title, body, ctaLabel, onCta }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={[styles.wrap, { paddingTop: theme.space[10] }]}>
      <Logo size={72} />
      <Text variant="title" align="center" style={{ marginTop: theme.space[6] }}>
        {title}
      </Text>
      {body ? (
        <Text
          variant="body"
          color="textSecondary"
          align="center"
          style={{ marginTop: theme.space[3], maxWidth: 320 }}
        >
          {body}
        </Text>
      ) : null}
      {ctaLabel && onCta ? (
        <Button
          label={ctaLabel}
          onPress={onCta}
          style={{ marginTop: theme.space[7], minWidth: 200 }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
});
