/**
 * Toast / snackbar — floating pill above the tab bar with optional Undo
 * (components §16). Provided app-wide via ToastProvider + useToast().
 * Auto-dismisses after 4s.
 */
import { Check, Info, LucideIcon } from 'lucide-react-native';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { Text } from './Text';

type ToastTone = 'success' | 'info';

type ToastOptions = {
  message: string;
  tone?: ToastTone;
  actionLabel?: string;
  onAction?: () => void;
};

type ToastContextValue = {
  show: (options: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneIcon: Record<ToastTone, LucideIcon> = {
  success: Check,
  info: Info,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 20, duration: 180, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [opacity, translateY]);

  const show = useCallback(
    (options: ToastOptions) => {
      if (timer.current) clearTimeout(timer.current);
      setToast(options);
      haptics.selection();
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, friction: 8, useNativeDriver: true }),
      ]).start();
      timer.current = setTimeout(hide, 4000);
    },
    [opacity, translateY, hide],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const Icon = toast ? toneIcon[toast.tone ?? 'success'] : Check;

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrap,
            { bottom: insets.bottom + 80, opacity, transform: [{ translateY }] },
          ]}
        >
          <View
            style={[
              styles.pill,
              {
                backgroundColor: theme.color.surface,
                borderRadius: theme.radius.full,
                ...theme.elevation[3],
              },
            ]}
          >
            <Icon
              size={18}
              color={toast.tone === 'info' ? theme.color.info : theme.color.success}
              strokeWidth={2}
            />
            <Text variant="label" style={styles.msg} numberOfLines={1}>
              {toast.message}
            </Text>
            {toast.actionLabel && toast.onAction ? (
              <Pressable
                onPress={() => {
                  toast.onAction?.();
                  hide();
                }}
                hitSlop={8}
              >
                <Text variant="label" color="accent">
                  {toast.actionLabel}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxWidth: '100%',
  },
  msg: { flexShrink: 1 },
});
