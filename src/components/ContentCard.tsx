/**
 * ContentCard — renders a generated daily card on the item detail screen
 * (PLANNING.md §3.1 ContentCard). Serif title for the reflective moment, body
 * in comfortable reading text, with date + model meta.
 */
import React from 'react';
import { View } from 'react-native';

import { formatLongDate } from '@/lib/date';
import type { ContentEntry } from '@/features/items/types';
import { useTheme } from '@/theme';
import { Card } from './Card';
import { Text } from './Text';

export type ContentCardProps = {
  entry: ContentEntry;
  showDate?: boolean;
};

export function ContentCard({ entry, showDate = true }: ContentCardProps) {
  const theme = useTheme();
  const date = new Date(`${entry.forDate}T00:00:00`);

  return (
    <Card padded elevation={1} style={{ padding: theme.space[5] }}>
      {showDate ? (
        <Text variant="overline" color="textSecondary">
          {formatLongDate(date)}
        </Text>
      ) : null}
      {entry.title ? (
        <Text variant="title" style={{ marginTop: theme.space[2] }}>
          {entry.title}
        </Text>
      ) : null}
      <Text variant="bodyL" style={{ marginTop: theme.space[3] }}>
        {entry.body}
      </Text>
      {entry.tone ? (
        <View style={{ marginTop: theme.space[4] }}>
          <Text variant="caption" color="textMuted">
            {entry.tone}
            {entry.model && entry.model !== 'mock' ? ` · ${entry.model}` : ''}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}
