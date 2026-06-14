/**
 * Premium upsell (screens §E). Warm, benefit-led, honest — one screen, no
 * countdowns, no fake scarcity, easily dismissible. Yearly preselected with a
 * BEST VALUE badge. Activating is mocked locally (RevenueCat lands in Phase 4,
 * implementation §8 step 7).
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Check, Gem, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Text, useToast } from '@/components';
import { useSettings } from '@/features/settings/SettingsProvider';
import { links, openManageSubscriptions, openUrl } from '@/lib/links';
import { ramp } from '@/theme/tokens';
import { useTheme } from '@/theme';

type Plan = 'yearly' | 'monthly';

const benefits = [
  'Unlimited reminders',
  'Reflection history & insights',
  'Streak stats & weekly review',
  'More notification sounds & themes',
];

export default function Premium() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { settings, setPremium } = useSettings();

  const [plan, setPlan] = useState<Plan>('yearly');

  const onSubscribe = () => {
    // RevenueCat purchase flow plugs in here (roadmap T-401): on a successful
    // purchase, set the entitlement. For now this grants the local entitlement.
    setPremium(true);
    toast.show({ message: 'Welcome to Daily Premium ✦' });
    router.back();
  };

  const onRestore = async () => {
    // RevenueCat `restorePurchases()` plugs in here (T-401).
    toast.show({ message: 'No previous purchases to restore', tone: 'info' });
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.color.surface }]} edges={['top']}>
      <View style={styles.grabberWrap}>
        <View style={[styles.grabber, { backgroundColor: theme.color.borderStrong }]} />
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={10}
          style={styles.close}
        >
          <X size={22} color={theme.color.textSecondary} strokeWidth={2} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: theme.space[5], paddingBottom: theme.space[8] }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <LinearGradient
            colors={[ramp.clay[400], ramp.clay[600]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.sparkle,
              {
                borderRadius: theme.radius.full,
                shadowColor: theme.color.accent,
                shadowOpacity: 0.4,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 8 },
                elevation: 8,
              },
            ]}
          >
            <Gem size={30} color="#FFFFFF" strokeWidth={2} />
          </LinearGradient>
          <Text variant="title" align="center" style={{ marginTop: theme.space[5] }}>
            Daily Premium
          </Text>
          <Text variant="bodyL" color="textSecondary" align="center" style={{ marginTop: theme.space[2] }}>
            Go deeper with your daily practice.
          </Text>
        </View>

        {settings.premiumActive ? (
          <View
            style={[
              styles.activeBanner,
              { backgroundColor: theme.color.successTint, borderRadius: theme.radius.lg },
            ]}
          >
            <Check size={20} color={theme.color.success} strokeWidth={2.5} />
            <Text variant="label" color="success">
              Premium is active — thank you for the support.
            </Text>
          </View>
        ) : null}

        <View style={{ marginTop: theme.space[7], gap: theme.space[3] }}>
          {benefits.map((b) => (
            <View key={b} style={styles.benefit}>
              <View
                style={[
                  styles.benefitCheck,
                  { backgroundColor: theme.color.successTint, borderRadius: theme.radius.full },
                ]}
              >
                <Check size={14} color={theme.color.success} strokeWidth={3} />
              </View>
              <Text variant="bodyL" style={{ flex: 1 }}>
                {b}
              </Text>
            </View>
          ))}
        </View>

        {/* Plan selector */}
        <View style={styles.plans}>
          <PlanCard
            selected={plan === 'yearly'}
            onPress={() => setPlan('yearly')}
            title="Yearly"
            price="$29.99 / yr"
            badge="BEST VALUE"
            showTrial
          />
          <PlanCard
            selected={plan === 'monthly'}
            onPress={() => setPlan('monthly')}
            title="Monthly"
            price="$2.99 / mo"
            showTrial
          />
        </View>

        <Text variant="caption" color="textSecondary" align="center" style={{ marginTop: theme.space[4] }}>
          {plan === 'yearly'
            ? '7 days free, then $29.99/yr. Cancel anytime.'
            : '7 days free, then $2.99/mo. Cancel anytime.'}
        </Text>

        <Button
          label={settings.premiumActive ? 'Manage subscription' : 'Start free trial'}
          fullWidth
          onPress={settings.premiumActive ? () => openManageSubscriptions() : onSubscribe}
          style={{ marginTop: theme.space[4] }}
        />

        <View style={styles.legal}>
          {[
            { label: 'Restore', onPress: onRestore },
            { label: 'Terms', onPress: () => openUrl(links.terms) },
            { label: 'Privacy', onPress: () => openUrl(links.privacy) },
          ].map((item) => (
            <Pressable key={item.label} hitSlop={8} onPress={item.onPress}>
              <Text variant="caption" color="textSecondary">
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanCard({
  selected,
  onPress,
  title,
  price,
  badge,
  showTrial,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  price: string;
  badge?: string;
  showTrial?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[
        styles.planCard,
        {
          borderColor: selected ? theme.color.accent : theme.color.border,
          backgroundColor: selected ? theme.color.accentTint : theme.color.surface,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      {badge ? (
        <View style={[styles.badge, { backgroundColor: theme.color.accent, borderRadius: theme.radius.full }]}>
          <Text variant="overline" color="textOnAccent">
            {badge}
          </Text>
        </View>
      ) : null}
      <Text variant="subheading">{title}</Text>
      <Text variant="body" color="text" style={{ marginTop: theme.space[1] }} tabular>
        {price}
      </Text>
      {showTrial ? (
        <View
          style={[
            styles.trialPill,
            { backgroundColor: theme.color.successTint, borderRadius: theme.radius.full },
          ]}
        >
          <Text variant="overline" color="success">
            7 DAYS FREE
          </Text>
        </View>
      ) : null}
      <View
        style={[
          styles.radio,
          {
            borderColor: selected ? theme.color.accent : theme.color.borderStrong,
            backgroundColor: selected ? theme.color.accent : 'transparent',
          },
        ]}
      >
        {selected ? <Check size={12} color={theme.color.textOnAccent} strokeWidth={3} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grabberWrap: { alignItems: 'center', paddingTop: 8, justifyContent: 'center' },
  grabber: { width: 36, height: 4, borderRadius: 999 },
  close: { position: 'absolute', right: 16, top: 4, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  brand: { alignItems: 'center', marginTop: 16 },
  sparkle: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  activeBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginTop: 20 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitCheck: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  plans: { flexDirection: 'row', gap: 12, marginTop: 28 },
  planCard: { flex: 1, borderWidth: 2, padding: 16, paddingTop: 32, minHeight: 150, justifyContent: 'flex-end' },
  badge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 8, paddingVertical: 3 },
  trialPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 },
  radio: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legal: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 24 },
});
