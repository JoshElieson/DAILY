/**
 * Screen — the canvas wrapper. Applies the themed background, safe-area insets,
 * and the standard 20px phone side margins (foundations §3, §8). Use
 * `scroll` for content that may overflow.
 */
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type ViewStyle,
} from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

export type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: Edge[];
  contentContainerStyle?: ViewStyle;
  style?: ViewStyle;
  refreshControl?: ScrollViewProps['refreshControl'];
};

export function Screen({
  children,
  scroll = false,
  padded = true,
  edges = ['top', 'left', 'right'],
  contentContainerStyle,
  style,
  refreshControl,
}: ScreenProps) {
  const theme = useTheme();
  const padding = padded ? { paddingHorizontal: theme.space[5] } : null;

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.flex, { backgroundColor: theme.color.bg }, style]}
    >
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            padding,
            { paddingBottom: theme.space[8] },
            contentContainerStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, padding, contentContainerStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
