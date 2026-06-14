/**
 * LoadingState — a list of skeleton cards approximating reminder rows, used as
 * the first paint while data loads (components §19).
 */
import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme';
import { Card } from './Card';
import { Skeleton } from './Skeleton';

export type LoadingStateProps = {
  rows?: number;
};

export function LoadingState({ rows = 4 }: LoadingStateProps) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.space[3] }} accessibilityLabel="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[4] }}>
            <Skeleton width={26} height={26} radius={theme.radius.full} />
            <View style={{ flex: 1, gap: theme.space[2] }}>
              <Skeleton width="60%" height={16} />
              <Skeleton width="40%" height={12} />
            </View>
            <Skeleton width={48} height={12} />
          </View>
        </Card>
      ))}
    </View>
  );
}
