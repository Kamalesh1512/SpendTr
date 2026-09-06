// docs/USER_FLOWS.md Flow 5 + docs/UI_UX_GUIDELINES.md "Paywall modal":
// contextual copy, one price, no countdown/urgency, Restore Purchases
// always visible. Feature list mirrors docs/MONETIZATION.md; the displayed
// price is always the live, localized price from RevenueCat's offering
// (never hardcoded), since App Store/Play pricing varies by region/currency.
// Redrawn from docs/design_system/templates/spendtr-app/settings.jsx
// `PaywallScreen` — icon-badged feature rows with a hint line each, a
// bordered price card, and the closing privacy line.
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PurchasesError, PurchasesPackage } from 'react-native-purchases';
import { useTheme } from '../theme/ThemeProvider';
import { Button, Icon, Note, PrivacyLine } from './ds';
import { SpendTrMark } from './brand/SpendTrMark';
import * as purchases from '../services/purchases';
import type { PaywallRequiredError } from '../types/errors';

function isUserCancelled(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as PurchasesError).userCancelled === true;
}

const REASON_COPY: Record<PaywallRequiredError['reason'], string> = {
  multi_currency: 'You hit the free limit on extra currencies. Pro removes every limit below, once.',
  subscription_limit: 'You hit the free limit on active recurring items. Pro removes every limit below, once.',
  historical_reports: 'You hit the free limit on past-month reports. Pro removes every limit below, once.',
  custom_category: 'You hit the free limit on categories. Pro removes every limit below, once.',
  export: 'Exporting your data is a Pro feature. Pro removes every limit below, once.',
  account_limit: 'You hit the free limit on accounts. Pro removes every limit below, once.',
  split: 'Splitting an entry across categories is a Pro feature. Pro removes every limit below, once.',
  goals: 'Savings goals are a Pro feature. Pro removes every limit below, once.',
  debts: 'Tracking debts is a Pro feature. Pro removes every limit below, once.',
  flexible_budget_periods: 'Weekly, daily and custom-range budgets are a Pro feature. Pro removes every limit below, once.',
  backup: 'Encrypted backup and restore is a Pro feature. Pro removes every limit below, once.',
};

const PRO_FEATURES: Array<[icon: React.ComponentProps<typeof Icon>['name'], label: string, hint: string | null]> = [
  ['swap-horizontal', 'Unlimited currencies', 'Free covers your base currency plus one.'],
  ['repeat', 'Unlimited recurring items', 'Free tracks up to five.'],
  ['stats-chart', 'Every past month in Reports', 'Free shows the current month.'],
  ['git-branch-outline', 'Split entries across categories', null],
  ['flag-outline', 'Savings goals and debts', 'Track what you owe and what you’re saving toward.'],
  ['calendar-outline', 'Flexible budget periods', 'Weekly, daily or a custom date range.'],
  ['wallet-outline', 'More than one account', 'Free tracks a single wallet.'],
  ['pricetag', 'Your own categories', 'Beyond the fourteen defaults.'],
  ['document-text-outline', 'CSV and PDF export', null],
  ['cloud-upload-outline', 'Encrypted backups', null],
];

interface PaywallModalProps {
  reason?: PaywallRequiredError['reason'];
  onPurchased: () => void;
  onClose: () => void;
}

export function PaywallModal({ reason, onPurchased, onClose }: PaywallModalProps) {
  const { colors, space, font, radius, borderWidth } = useTheme();
  const [busy, setBusy] = useState(false);
  const [loadingOffering, setLoadingOffering] = useState(true);
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    purchases
      .getOfferings()
      .then((offerings) => {
        if (cancelled) return;
        setPkg(offerings.current?.availablePackages[0] ?? null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Could not load pricing.');
      })
      .finally(() => {
        if (!cancelled) setLoadingOffering(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handlePurchase() {
    if (!pkg) return;
    setBusy(true);
    setError(null);
    try {
      const isPro = await purchases.purchasePro(pkg);
      if (isPro) onPurchased();
    } catch (e) {
      if (!isUserCancelled(e)) {
        setError(e instanceof Error ? e.message : 'Purchase failed.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    setBusy(true);
    setError(null);
    try {
      const isPro = await purchases.restorePurchases();
      if (isPro) onPurchased();
      else setError('No previous purchase found for this account.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restore failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: space[24] }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', gap: space[12] }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: radius.lg,
              backgroundColor: colors.brand,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SpendTrMark size={30} ink={colors.textOnBrand} accent={colors.textOnBrand} mono />
          </View>
          <Text style={{ fontSize: font.size['4xl'], fontWeight: '800', color: colors.text, textAlign: 'center' }}>
            SpendTr Pro
          </Text>
          <Text style={{ fontSize: font.size.bodySm, color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
            {reason ? REASON_COPY[reason] : 'Pro removes every limit below, once.'}
          </Text>
        </View>

        <View style={{ marginTop: space[20], gap: space[14] }}>
          {PRO_FEATURES.map(([icon, label, hint]) => (
            <View key={label} style={{ flexDirection: 'row', gap: space[12], alignItems: 'flex-start' }}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: radius.full,
                  backgroundColor: colors.accentQuiet,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={icon} size={16} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: font.size.body, color: colors.text }}>{label}</Text>
                {hint ? (
                  <Text style={{ fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 }}>{hint}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        <View
          style={{
            marginTop: space[20],
            padding: space[14],
            borderRadius: radius.lg,
            borderWidth: borderWidth.hairline,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            alignItems: 'center',
          }}
        >
          {loadingOffering ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text
              style={{
                fontSize: 26,
                fontWeight: '800',
                color: colors.text,
                fontVariant: ['tabular-nums'],
              }}
            >
              {pkg ? pkg.product.priceString : 'Pricing unavailable right now'}
            </Text>
          )}
          <Text style={{ fontSize: font.size.xs, color: colors.textMuted, marginTop: space[4], textAlign: 'center' }}>
            One payment. No subscription, no renewal, no price that goes up later.
          </Text>
        </View>

        {error ? (
          <View style={{ marginTop: space[16] }}>
            <Note tone="danger">{error}</Note>
          </View>
        ) : null}

        <View style={{ marginTop: space[16], marginBottom: space[8] }}>
          <PrivacyLine>Pro unlocks features on this device. It still creates no account.</PrivacyLine>
        </View>

        <Button
          fullWidth
          loading={busy}
          disabled={loadingOffering || !pkg}
          onPress={handlePurchase}
        >
          {busy ? 'Contacting the App Store…' : pkg ? `Unlock Pro — ${pkg.product.priceString}` : 'Unlock Pro'}
        </Button>

        <View style={{ marginTop: space[4] }}>
          <Button variant="link" fullWidth disabled={busy} onPress={handleRestore}>
            Restore Purchases
          </Button>
        </View>

        <Button variant="quiet" fullWidth onPress={onClose}>
          Not now
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
