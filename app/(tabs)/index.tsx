import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/hooks/useAppColors';
import { useCategories } from '@/hooks/useCategories';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useTransactions } from '@/hooks/useTransactions';
import { EmptyState } from '@/components/EmptyState';
import type { Transaction } from '@/repositories/transactionRepository';
import { minorToMajor } from '@/utils/money';

export default function HomeScreen() {
  const colors = useAppColors();
  const { transactions, loading, refetch } = useTransactions();
  const { categories } = useCategories();
  const { currencies } = useCurrencies();
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const decimalDigitsByCode = new Map(currencies.map((c) => [c.code, c.decimalDigits]));

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Text style={[styles.header, { color: colors.text }]}>Transactions</Text>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={transactions.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              title="No transactions yet"
              message="Add your first transaction with the + button below."
            />
          )
        }
        renderItem={({ item }) => (
          <TransactionRow
            transaction={item}
            category={item.categoryId ? categoryById.get(item.categoryId) : undefined}
            decimalDigits={decimalDigitsByCode.get(item.currencyCode) ?? 2}
            baseDecimalDigits={item.baseCurrencyCode ? (decimalDigitsByCode.get(item.baseCurrencyCode) ?? 2) : 2}
          />
        )}
      />
    </SafeAreaView>
  );
}

function TransactionRow({
  transaction,
  category,
  decimalDigits,
  baseDecimalDigits,
}: {
  transaction: Transaction;
  category?: { name: string; icon: string; color: string };
  decimalDigits: number;
  baseDecimalDigits: number;
}) {
  const colors = useAppColors();
  const isExpense = transaction.type === 'expense';
  const sign = isExpense ? '-' : '+';
  const amount = minorToMajor(transaction.amountMinor, decimalDigits).toFixed(decimalDigits);
  const showBase =
    transaction.baseAmountMinor != null &&
    transaction.baseCurrencyCode &&
    transaction.baseCurrencyCode !== transaction.currencyCode;

  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      <View style={[styles.iconCircle, { backgroundColor: category?.color ?? colors.textMuted }]}>
        <Ionicons name={(category?.icon as never) ?? 'ellipsis-horizontal'} size={18} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{category?.name ?? 'Uncategorized'}</Text>
        {transaction.note ? <Text style={[styles.rowNote, { color: colors.textMuted }]}>{transaction.note}</Text> : null}
        <Text style={[styles.rowDate, { color: colors.textMuted }]}>{transaction.occurredAt.slice(0, 10)}</Text>
      </View>
      <View style={styles.amountBlock}>
        <Text style={[styles.amount, { color: isExpense ? colors.text : colors.success }]}>
          {sign}
          {transaction.currencyCode} {amount}
        </Text>
        {showBase ? (
          <Text style={[styles.baseAmount, { color: colors.textMuted }]}>
            ≈ {transaction.baseCurrencyCode} {minorToMajor(transaction.baseAmountMinor ?? 0, baseDecimalDigits).toFixed(baseDecimalDigits)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { fontSize: 24, fontWeight: '700', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 120 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowNote: { fontSize: 12, marginTop: 2 },
  rowDate: { fontSize: 11, marginTop: 2 },
  amountBlock: { alignItems: 'flex-end' },
  amount: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  baseAmount: { fontSize: 11, marginTop: 2, fontVariant: ['tabular-nums'] },
});
