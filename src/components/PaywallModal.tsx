// docs/USER_FLOWS.md Flow 5 + docs/UI_UX_GUIDELINES.md "Paywall modal":
// contextual copy, one price, no countdown/urgency, Restore Purchases
// always visible. Price/feature list come from docs/MONETIZATION.md, not
// invented here.
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '../hooks/useAppColors';
import * as purchases from '../services/purchases';
import type { PaywallRequiredError } from '../types/errors';

const REASON_COPY: Record<PaywallRequiredError['reason'], string> = {
  multi_currency: 'Track spending in more than one extra currency.',
  subscription_limit: 'Track more than 5 active subscriptions.',
  historical_reports: 'View reports for any past month, not just this one.',
  custom_category: 'Add your own categories beyond the defaults.',
  export: 'Export your data to CSV or PDF.',
};

interface PaywallModalProps {
  reason?: PaywallRequiredError['reason'];
  onPurchased: () => void;
  onClose: () => void;
}

export function PaywallModal({ reason, onPurchased, onClose }: PaywallModalProps) {
  const colors = useAppColors();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePurchase() {
    setBusy(true);
    setError(null);
    try {
      const offerings = await purchases.getOfferings();
      const pkg = offerings.current?.availablePackages[0];
      if (!pkg) throw new Error('No purchase package is configured yet.');
      const isPro = await purchases.purchasePro(pkg);
      if (isPro) onPurchased();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purchase failed.');
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Spendtr Pro</Text>
      {reason ? <Text style={[styles.reason, { color: colors.textMuted }]}>{REASON_COPY[reason]}</Text> : null}

      <View style={styles.features}>
        {[
          'Unlimited currencies',
          'Unlimited active subscriptions',
          'Full historical reports',
          'CSV/PDF export',
          'Custom categories',
        ].map((f) => (
          <Text key={f} style={[styles.feature, { color: colors.text }]}>
            • {f}
          </Text>
        ))}
      </View>

      <Text style={[styles.price, { color: colors.text }]}>$24.99 one-time</Text>

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      <Pressable
        accessibilityRole="button"
        onPress={handlePurchase}
        disabled={busy}
        style={[styles.button, { backgroundColor: colors.primary }]}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Unlock Pro</Text>}
      </Pressable>

      <Pressable accessibilityRole="button" onPress={handleRestore} disabled={busy} style={styles.linkButton}>
        <Text style={[styles.link, { color: colors.primary }]}>Restore Purchases</Text>
      </Pressable>

      <Pressable accessibilityRole="button" onPress={onClose} style={styles.linkButton}>
        <Text style={[styles.link, { color: colors.textMuted }]}>Not now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  reason: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  features: { marginBottom: 24, gap: 6 },
  feature: { fontSize: 15 },
  price: { fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 20 },
  error: { textAlign: 'center', marginBottom: 12 },
  button: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  linkButton: { paddingVertical: 14, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  link: { fontSize: 14, fontWeight: '600' },
});
