/**
 * Typographic primitive. Every piece of text in the app goes through this so we
 * never set raw sizes in feature code (implementation §4) and color stays
 * semantic + theme-aware.
 */
import React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme } from '@/theme';
import { tabularNums, type TypeVariant } from '@/theme/typography';
import type { SemanticColors } from '@/theme/colors';

export type TextProps = RNTextProps & {
  variant?: TypeVariant;
  color?: keyof SemanticColors;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  tabular?: boolean;
  children?: React.ReactNode;
};

export function Text({
  variant = 'body',
  color = 'text',
  align,
  tabular = false,
  style,
  maxFontSizeMultiplier = 1.3,
  ...rest
}: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        theme.typography[variant],
        { color: theme.color[color] },
        align ? { textAlign: align } : null,
        tabular ? tabularNums : null,
        style,
      ]}
      {...rest}
    />
  );
}
