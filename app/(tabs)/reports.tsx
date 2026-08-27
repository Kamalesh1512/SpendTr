// docs/USER_FLOWS.md Flow 6. Historical (non-current) months are Pro-only
// (docs/MONETIZATION.md) — enforced here in the UI since
// TransactionRepository.getMonthlySummary's contract (docs/API_DESIGN.md)
// has no month-gating parameter of its own.
import { useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/hooks/useAppColors';
import { useCategories } from '@/hooks/useCategories';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useMonthlySummary } from '@/hooks/useTransactions';
import { useSettings } from '@/hooks/useSettings';
import { PaywallModal } from '@/components/PaywallModal';
import { formatGroupedAmountMinor } from '@/utils/money';

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y!, m! - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export default function ReportsScreen() {
  const colors = useAppColors();
  const [month, setMonth] = useState(currentMonth());
  const [showPaywall, setShowPaywall] = useState(false);
  const { settings, refetch: refetchSettings } = useSettings();
  const { categories } = useCategories('expense');
  const { currencies } = useCurrencies();
  const { summary, loading, refetch } = useMonthlySummary(month);
  const baseCurrencyCode = settings?.baseCurrencyCode ?? 'USD';
  const baseDecimalDigits = currencies.find((c) => c.code === baseCurrencyCode)?.decimalDigits ?? 2;

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const isCurrentMonth = month === currentMonth();
  const maxCategoryTotal = summary ? Math.max(1, ...summary.byCategory.map((c) => c.totalBaseMinor)) : 1;

  function goToMonth(delta: number) {
    const target = shiftMonth(month, delta);
    if (target !== currentMonth() && !settings?.isPro) {
      setShowPaywall(true);
      return;
    }
    setMonth(target);
  }

  if (showPaywall) {
    return (
      <PaywallModal
        reason="historical_reports"
        onPurchased={() => {
          setShowPaywall(false);
          refetchSettings();
        }}
        onClose={() => setShowPaywall(false)}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.monthRow}>
        <Pressable accessibilityLabel="Previous month" onPress={() => goToMonth(-1)} style={styles.monthButton}>
          <Text style={{ color: colors.primary, fontSize: 20 }}>‹</Text>
        </Pressable>
        <Text style={[styles.header, { color: colors.text }]}>{month}</Text>
        <Pressable
          accessibilityLabel="Next month"
          onPress={() => goToMonth(1)}
          disabled={isCurrentMonth}
          style={styles.monthButton}
        >
          <Text style={{ color: isCurrentMonth ? colors.border : colors.primary, fontSize: 20 }}>›</Text>
        </Pressable>
      </View>

      {loading || !summary ? null : (
        <View style={styles.content}>
          <View style={[styles.totalsRow, { borderColor: colors.border }]}>
            <View>
              <Text style={[styles.totalLabel, { color: colors.textMuted }]}>Expenses</Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>
                {formatGroupedAmountMinor(summary.totalExpenseBaseMinor, {
                  symbol: '',
                  decimalDigits: baseDecimalDigits,
                  currencyCode: baseCurrencyCode,
                })}
              </Text>
            </View>
            <View>
              <Text style={[styles.totalLabel, { color: colors.textMuted }]}>Income</Text>
              <Text style={[styles.totalValue, { color: colors.success }]}>
                {formatGroupedAmountMinor(summary.totalIncomeBaseMinor, {
                  symbol: '',
                  decimalDigits: baseDecimalDigits,
                  currencyCode: baseCurrencyCode,
                })}
              </Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>By Category</Text>
          {summary.byCategory.length === 0 ? (
            <Text style={{ color: colors.textMuted }}>No categorized expenses this month.</Text>
          ) : (
            summary.byCategory
              .sort((a, b) => b.totalBaseMinor - a.totalBaseMinor)
              .map((c) => {
                const category = categoryById.get(c.categoryId);
                return (
                  <View key={c.categoryId} style={styles.barRow}>
                    <Text style={[styles.barLabel, { color: colors.text }]} numberOfLines={1}>
                      {category?.name ?? 'Unknown'}
                    </Text>
                    <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${(c.totalBaseMinor / maxCategoryTotal) * 100}%`,
                            backgroundColor: category?.color ?? colors.primary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.barValue, { color: colors.textMuted }]}>
                      {formatGroupedAmountMinor(c.totalBaseMinor, {
                        symbol: '',
                        decimalDigits: baseDecimalDigits,
                        currencyCode: baseCurrencyCode,
                      })}
                    </Text>
                  </View>
                );
              })
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, paddingVertical: 12 },
  monthButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  header: { fontSize: 18, fontWeight: '700' },
  content: { paddingHorizontal: 20 },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 20,
  },
  totalLabel: { fontSize: 12, textAlign: 'center' },
  totalValue: { fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'], textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  barRow: { marginBottom: 12 },
  barLabel: { fontSize: 13, marginBottom: 4 },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barValue: { fontSize: 11, marginTop: 2, textAlign: 'right' },
});
