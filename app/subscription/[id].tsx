// docs/USER_FLOWS.md Flow 4 — the notification-tap deep-link target.
// getById isn't part of SubscriptionRepository's contract
// (docs/API_DESIGN.md), so this filters the existing list() result rather
// than inventing a new repository method.
import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/hooks/useAppColors';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import * as subscriptionRepository from '@/repositories/subscriptionRepository';
import * as transactionRepository from '@/repositories/transactionRepository';
import { minorToMajor } from '@/utils/money';

export default function SubscriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useAppColors();
  const router = useRouter();
  const { subscriptions, refetch } = useSubscriptions(false);
  const { currencies } = useCurrencies();
  const [busy, setBusy] = useState(false);

  const subscription = useMemo(() => subscriptions.find((s) => s.id === id), [subscriptions, id]);
  const decimalDigits = subscription
    ? (currencies.find((c) => c.code === subscription.currencyCode)?.decimalDigits ?? 2)
    : 2;

  if (!subscription) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted, padding: 20 }}>Subscription not found.</Text>
      </SafeAreaView>
    );
  }

  async function markRenewed() {
    setBusy(true);
    try {
      await transactionRepository.create({
        type: 'expense',
        amountMinor: subscription!.amountMinor,
        currencyCode: subscription!.currencyCode,
        categoryId: subscription!.categoryId ?? undefined,
        note: `${subscription!.name} renewal`,
        occurredAt: new Date().toISOString().slice(0, 10),
        recurringSubscriptionId: subscription!.id,
      });
      await subscriptionRepository.advanceRenewal(subscription!.id);
      await refetch();
      Alert.alert('Logged', `${subscription!.name} renewal was logged and the next date was updated.`);
      router.back();
    } catch (e) {
      Alert.alert('Could not log renewal', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  // Note: docs/API_DESIGN.md's SubscriptionRepository contract defines
  // deactivate() but no corresponding "reactivate" method — pausing is
  // currently one-directional. Flagging this as a gap rather than
  // inventing an undocumented repository method to work around it.
  async function pause() {
    setBusy(true);
    try {
      await subscriptionRepository.deactivate(subscription!.id);
      await refetch();
      router.back();
    } catch (e) {
      Alert.alert('Could not update', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>{subscription.name}</Text>
        <Text style={[styles.amount, { color: colors.text }]}>
          {subscription.currencyCode} {minorToMajor(subscription.amountMinor, decimalDigits).toFixed(decimalDigits)} /{' '}
          {subscription.billingCycle}
        </Text>
        <Text style={[styles.renewal, { color: colors.textMuted }]}>
          Next renewal: {subscription.nextRenewalDate.slice(0, 10)}
        </Text>

        <Pressable
          disabled={busy}
          onPress={markRenewed}
          style={[styles.button, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.buttonText}>Mark as Renewed</Text>
        </Pressable>

        {subscription.isActive ? (
          <Pressable disabled={busy} onPress={pause} style={[styles.secondaryButton, { borderColor: colors.border }]}>
            <Text style={{ color: colors.text }}>Pause Subscription</Text>
          </Pressable>
        ) : (
          <Text style={[styles.renewal, { color: colors.textMuted }]}>
            This subscription is paused. Reactivating a paused subscription isn't supported yet.
          </Text>
        )}

        <Pressable disabled={busy} onPress={() => router.back()} style={styles.dismissButton}>
          <Text style={{ color: colors.textMuted }}>Dismiss</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 8 },
  amount: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  renewal: { fontSize: 14, marginBottom: 32 },
  button: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', minHeight: 44, marginBottom: 12 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  dismissButton: { paddingVertical: 14, alignItems: 'center', minHeight: 44 },
});
