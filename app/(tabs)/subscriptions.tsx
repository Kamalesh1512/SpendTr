import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/hooks/useAppColors';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { EmptyState } from '@/components/EmptyState';
import type { Subscription } from '@/repositories/subscriptionRepository';
import { formatGroupedAmountMinor } from '@/utils/money';

export default function SubscriptionsScreen() {
  const colors = useAppColors();
  const router = useRouter();
  const { subscriptions, loading, refetch } = useSubscriptions(true);
  const { currencies } = useCurrencies();
  const decimalDigitsByCode = new Map(currencies.map((c) => [c.code, c.decimalDigits]));

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={[styles.header, { color: colors.text }]}>Subscriptions</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add subscription"
          onPress={() => router.push('/add-subscription')}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </Pressable>
      </View>

      <FlatList
        data={subscriptions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={subscriptions.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              title="No subscriptions tracked"
              message="Add a subscription to get renewal reminders before you're charged again."
              actionLabel="Add Subscription"
              onAction={() => router.push('/add-subscription')}
            />
          )
        }
        renderItem={({ item }) => (
          <SubscriptionRow
            subscription={item}
            decimalDigits={decimalDigitsByCode.get(item.currencyCode) ?? 2}
            onPress={() => router.push(`/subscription/${item.id}`)}
          />
        )}
      />
    </SafeAreaView>
  );
}

function SubscriptionRow({
  subscription,
  decimalDigits,
  onPress,
}: {
  subscription: Subscription;
  decimalDigits: number;
  onPress: () => void;
}) {
  const colors = useAppColors();
  const amount = formatGroupedAmountMinor(subscription.amountMinor, {
    symbol: '',
    decimalDigits,
    currencyCode: subscription.currencyCode,
  });

  return (
    <Pressable onPress={onPress} style={[styles.row, { borderColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{subscription.name}</Text>
        <Text style={[styles.rowSub, { color: colors.textMuted }]}>
          Renews {subscription.nextRenewalDate.slice(0, 10)} · {subscription.billingCycle}
        </Text>
      </View>
      <Text style={[styles.amount, { color: colors.text }]}>
        {subscription.currencyCode} {amount}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  header: { fontSize: 24, fontWeight: '700' },
  addButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 120 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
