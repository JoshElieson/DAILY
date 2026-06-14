/**
 * ErrorState — calm, non-scolding error with a retry. Uses muted rose-clay, not
 * fire-engine red (foundations §1.3). Never blames the user.
 */
import { CloudOff } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

export type ErrorStateProps = {
  title?: string;
  body?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function ErrorState({
  title = 'Something needs a moment',
  body = "We couldn't load this just now. It's not you — let's try again.",
  onRetry,
  retryLabel = 'Try again',
}: ErrorStateProps) {
  const theme = useTheme();
  return (
    <View style={[styles.wrap, { paddingVertical: theme.space[9] }]}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: theme.radius.full,
          backgroundColor: theme.color.surfaceSunken,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CloudOff size={28} color={theme.color.error} strokeWidth={1.75} />
      </View>
      <Text variant="subheading" align="center" style={{ marginTop: theme.space[4] }}>
        {title}
      </Text>
      <Text
        variant="body"
        color="textSecondary"
        align="center"
        style={{ marginTop: theme.space[2], maxWidth: 300 }}
      >
        {body}
      </Text>
      {onRetry ? (
        <Button
          label={retryLabel}
          variant="secondary"
          size="medium"
          onPress={onRetry}
          style={{ marginTop: theme.space[5] }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
});
