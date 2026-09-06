// docs/USER_FLOWS.md Flow 4 — the notification-tap deep-link target.
// getById isn't part of RecurringTransactionRepository's contract
// (docs/API_DESIGN.md), so this filters the existing list() result rather
// than inventing a new repository method.
import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions';
import { Amount, Button } from '@/components/ds';
import * as recurringTransactionRepository from '@/repositories/recurringTransactionRepository';
import * as transactionRepository from '@/repositories/transactionRepository';
import { PaywallRequiredError } from '@/types/errors';

export default function RecurringDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, space, font } = useTheme();
  const router = useRouter();
  const { recurringTransactions, refetch } = useRecurringTransactions(false);
  const { currencies } = useCurrencies();
  const [busy, setBusy] = useState(false);

  const item = useMemo(() => recurringTransactions.find((s) => s.id === id), [recurringTransactions, id]);
  const decimalDigits = item
    ? (currencies.find((c) => c.code === item.currencyCode)?.decimalDigits ?? 2)
    : 2;

  if (!item) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.textMuted, padding: 20 }}>Recurring item not found.</Text>
      </SafeAreaView>
    );
  }

  async function markRenewed() {
    setBusy(true);
    try {
      await transactionRepository.create({
        accountId: item!.accountId,
        type: item!.kind === 'income' ? 'income' : 'expense',
        amountMinor: item!.amountMinor,
        currencyCode: item!.currencyCode,
        categoryId: item!.categoryId ?? undefined,
        note: `${item!.name} renewal`,
        occurredAt: new Date().toISOString().slice(0, 10),
        recurringTransactionId: item!.id,
      });
      await recurringTransactionRepository.advanceRenewal(item!.id);
      await refetch();
      Alert.alert('Logged', `${item!.name} renewal was logged and the next date was updated.`);
      router.back();
    } catch (e) {
      Alert.alert('Could not log renewal', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  async function pause() {
    setBusy(true);
    try {
      await recurringTransactionRepository.deactivate(item!.id);
      await refetch();
      router.back();
    } catch (e) {
      Alert.alert('Could not update', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  async function resume() {
    setBusy(true);
    try {
      await recurringTransactionRepository.reactivate(item!.id);
      await refetch();
      router.back();
    } catch (e) {
      if (e instanceof PaywallRequiredError) {
        router.push({ pathname: '/paywall', params: { reason: 'subscription_limit' } });
      } else {
        Alert.alert('Could not resume', e instanceof Error ? e.message : 'Unknown error');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.content, { padding: space[24] }]}>
        <Text style={{ color: colors.text, fontSize: font.size['4xl'], fontWeight: '700', marginBottom: space[8] }}>
          {item.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: space[4] }}>
          <Amount amountMinor={item.amountMinor} currencyCode={item.currencyCode} decimalDigits={decimalDigits} size="lg" />
          <Text style={{ color: colors.textMuted, fontSize: font.size.body }}>/ {item.billingCycle}</Text>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: font.size.bodySm, marginBottom: space[32] }}>
          Next renewal: {item.nextRenewalDate.slice(0, 10)}
        </Text>

        {item.isActive ? (
          <Button fullWidth disabled={busy} onPress={markRenewed}>
            Mark as Renewed
          </Button>
        ) : null}

        {item.isActive ? (
          <View style={{ marginTop: space[12] }}>
            <Button variant="secondary" fullWidth disabled={busy} onPress={pause}>
              Pause
            </Button>
          </View>
        ) : (
          <View style={{ marginTop: space[12] }}>
            <Text style={{ color: colors.textMuted, fontSize: font.size.bodySm, marginBottom: space[12] }}>
              This item is paused. It stays in your list and won&apos;t log renewals or send reminders until resumed.
            </Text>
            <Button variant="secondary" fullWidth disabled={busy} onPress={resume}>
              Resume
            </Button>
          </View>
        )}

        <View style={{ marginTop: space[12] }}>
          <Button variant="quiet" fullWidth disabled={busy} onPress={() => router.back()}>
            Dismiss
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {},
});
