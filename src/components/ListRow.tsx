/**
 * List row + grouped container — settings, pickers, schedules (components §5).
 * Rows sit in a ListGroup surface with inset hairline dividers; leading icon in
 * a tint circle, trailing value/chevron/toggle/checkmark.
 */
import { ChevronRight, LucideIcon } from 'lucide-react-native';
import React, { Children, isValidElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { Text } from './Text';

export type ListRowProps = {
  label: string;
  secondary?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconTint?: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  trailing?: React.ReactNode;
  destructive?: boolean;
};

export function ListRow({
  label,
  secondary,
  icon: Icon,
  iconColor,
  iconTint,
  value,
  onPress,
  showChevron,
  trailing,
  destructive = false,
}: ListRowProps) {
  const theme = useTheme();
  const chevron = showChevron ?? (!!onPress && !trailing);

  const content = (
    <View style={styles.row}>
      {Icon ? (
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: iconTint ?? theme.color.surfaceSunken },
          ]}
        >
          <Icon
            size={20}
            color={iconColor ?? (destructive ? theme.color.error : theme.color.textSecondary)}
            strokeWidth={1.75}
          />
        </View>
      ) : null}
      <View style={styles.labelWrap}>
        <Text variant="label" color={destructive ? 'error' : 'text'}>
          {label}
        </Text>
        {secondary ? (
          <Text variant="caption" color="textSecondary">
            {secondary}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="label" color="textSecondary" tabular>
          {value}
        </Text>
      ) : null}
      {trailing}
      {chevron ? (
        <ChevronRight size={20} color={theme.color.textMuted} strokeWidth={1.75} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [
          styles.pressable,
          pressed && { backgroundColor: theme.color.surfaceSunken },
        ]}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={styles.pressable}>{content}</View>;
}

export type ListGroupProps = {
  children: React.ReactNode;
};

/** Wraps rows in a surface container with inset hairline dividers. */
export function ListGroup({ children }: ListGroupProps) {
  const theme = useTheme();
  const items = Children.toArray(children).filter(isValidElement);

  return (
    <View
      style={[
        styles.group,
        {
          backgroundColor: theme.color.surface,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.isDark ? theme.color.border : theme.color.hairline,
          ...theme.elevation[1],
        },
      ]}
    >
      {items.map((child, i) => (
        <View key={i}>
          {i > 0 ? (
            <View
              style={[
                styles.divider,
                { backgroundColor: theme.color.border, marginLeft: theme.space[4] },
              ]}
            />
          ) : null}
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { overflow: 'hidden' },
  pressable: { paddingHorizontal: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrap: { flex: 1, gap: 2 },
  divider: { height: StyleSheet.hairlineWidth },
});
