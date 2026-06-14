/**
 * Text field — sunken fill, hairline border, focus + error states, optional
 * multiline auto-grow and clear button (components §6).
 */
import { X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { useTheme } from '@/theme';
import { Text } from './Text';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  helper?: string;
  error?: string;
  multiline?: boolean;
  onClear?: () => void;
};

export function TextField({
  label,
  helper,
  error,
  multiline = false,
  value,
  onClear,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.color.error
    : focused
      ? theme.color.accent
      : theme.color.border;

  const showClear = !!value && value.length > 0 && !!onClear;

  return (
    <View>
      {label ? (
        <Text variant="caption" color="textSecondary" style={{ marginBottom: theme.space[1] }}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          {
            backgroundColor: theme.color.surfaceSunken,
            borderColor,
            borderRadius: theme.radius.md,
            minHeight: multiline ? 84 : 52,
            paddingHorizontal: theme.space[4],
            paddingVertical: multiline ? theme.space[3] : 0,
          },
          focused && !error ? theme.elevation[0] : null,
        ]}
      >
        <TextInput
          value={value}
          multiline={multiline}
          placeholderTextColor={theme.color.textMuted}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            theme.typography.bodyL,
            {
              flex: 1,
              color: theme.color.text,
              paddingVertical: multiline ? 0 : 14,
              textAlignVertical: multiline ? 'top' : 'center',
            },
          ]}
          {...rest}
        />
        {showClear ? (
          <Pressable
            onPress={onClear}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Clear text"
            style={styles.clear}
          >
            <X size={18} color={theme.color.textMuted} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>
      {error || helper ? (
        <Text
          variant="caption"
          color={error ? 'error' : 'textSecondary'}
          style={{ marginTop: theme.space[1] }}
        >
          {error ?? helper}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  clear: { paddingLeft: 8 },
});
