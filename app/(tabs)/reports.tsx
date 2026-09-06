// docs/USER_FLOWS.md Flow 6. Historical (non-current) months are Pro-only
// (docs/MONETIZATION.md) — enforced here in the UI since
// TransactionRepository.getMonthlySummary's contract (docs/API_DESIGN.md)
// has no month-gating parameter of its own.
// Redrawn from docs/design_system/templates/spendtr-app/planning.jsx —
// income is deliberately excluded from Reports (it's a spend-analysis
// view, not a P&L), and a By category / Over time toggle switches between
// the ranked category breakdown and a 6-month column chart.
import { useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useCategories } from '@/hooks/useCategories';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useMonthlySummary } from '@/hooks/useTransactions';
import { useSettings } from '@/hooks/useSettings';
import { Amount, CategoryBar, ColumnChart, EmptyState, Icon, ScreenHeader, SectionLabel } from '@/components/ds';
import { PaywallModal } from '@/components/PaywallModal';
import * as transactionRepository from '@/repositories/transactionRepository';
import { trailingMonthKeys } from '@/utils/date';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y!, m! - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

function monthLabel(monthKey: string): string {
  const [, m] = monthKey.split('-').map(Number);
  return MONTH_NAMES[m! - 1]!;
}

export default function ReportsScreen() {
  const { colors, space, font, radius, borderWidth } = useTheme();
  const [month, setMonth] = useState(currentMonth());
  const [view, setView] = useState<'category' | 'time'>('category');
  const [showPaywall, setShowPaywall] = useState(false);
  const { settings, refetch: refetchSettings } = useSettings();
  const { categories } = useCategories('expense');
  const { currencies } = useCurrencies();
  const { summary, loading, refetch } = useMonthlySummary(month);
  const baseCurrencyCode = settings?.baseCurrencyCode ?? 'USD';
  const baseDecimalDigits = currencies.find((c) => c.code === baseCurrencyCode)?.decimalDigits ?? 2;

  const [trailing, setTrailing] = useState<{ month: string; totalMinor: number }[]>([]);
  const [trailingLoading, setTrailingLoading] = useState(false);
  const [activeTrailingIndex, setActiveTrailingIndex] = useState(5);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  useEffect(() => {
    if (view !== 'time') return;
    let cancelled = false;
    setTrailingLoading(true);
    const months = trailingMonthKeys(6, month);
    Promise.all(months.map((m) => transactionRepository.getMonthlySummary(m)))
      .then((summaries) => {
        if (cancelled) return;
        setTrailing(summaries.map((s, i) => ({ month: months[i]!, totalMinor: s.totalExpenseBaseMinor })));
        setActiveTrailingIndex(months.length - 1);
      })
      .finally(() => {
        if (!cancelled) setTrailingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view, month]);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const isCurrentMonth = month === currentMonth();
  const maxCategoryTotal = summary ? Math.max(1, ...summary.byCategory.map((c) => c.totalBaseMinor)) : 1;
  const sortedByCategory = summary
    ? [...summary.byCategory].sort((a, b) => b.totalBaseMinor - a.totalBaseMinor)
    : [];

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScreenHeader title="Reports" />

      <View style={[styles.monthRow, { gap: space[24], paddingVertical: space[8] }]}>
        <Pressable accessibilityLabel="Previous month" onPress={() => goToMonth(-1)} style={styles.monthButton}>
          <Icon name="chevron-back" size={20} color={colors.accent} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: font.size.lg, fontWeight: '700' }}>{month}</Text>
        <Pressable
          accessibilityLabel="Next month"
          onPress={() => goToMonth(1)}
          disabled={isCurrentMonth}
          style={styles.monthButton}
        >
          <Icon name="chevron-forward" size={20} color={isCurrentMonth ? colors.border : colors.accent} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceRaised, borderRadius: radius.full, padding: 3, marginHorizontal: space[20], marginBottom: space[12] }}>
        {([
          { id: 'category', label: 'By category' },
          { id: 'time', label: 'Over time' },
        ] as const).map((t) => (
          <Pressable
            key={t.id}
            accessibilityRole="button"
            accessibilityState={{ selected: view === t.id }}
            onPress={() => setView(t.id)}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: radius.full, backgroundColor: view === t.id ? colors.accent : 'transparent' }}
          >
            <Text style={{ fontSize: font.size.sm, fontWeight: '700', color: view === t.id ? colors.accentContrast : colors.textMuted }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading || !summary ? null : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: space[20], paddingBottom: space[40] }}>
          <View style={[styles.totalsWrap, { paddingVertical: space[16], borderBottomColor: colors.border, marginBottom: space[20] }]}>
            <SectionLabel size="sm">Total spent</SectionLabel>
            <Amount amountMinor={summary.totalExpenseBaseMinor} currencyCode={baseCurrencyCode} decimalDigits={baseDecimalDigits} size="xl" sign="minus" />
            <Text style={{ fontSize: font.size.xs, color: colors.textMuted, marginTop: space[4] }}>
              Converted to {baseCurrencyCode}, across {sortedByCategory.length} {sortedByCategory.length === 1 ? 'category' : 'categories'} · income excluded
            </Text>
          </View>

          {view === 'category' ? (
            <>
              <View style={{ marginBottom: space[12] }}>
                <SectionLabel size="md">By category</SectionLabel>
              </View>

              {sortedByCategory.length === 0 ? (
                <EmptyState
                  icon="pie-chart-outline"
                  title="Nothing categorized yet"
                  message="Expenses with a category will show up here, ranked by how much you spent."
                />
              ) : (
                sortedByCategory.map((c) => {
                  const category = categoryById.get(c.categoryId);
                  return (
                    <CategoryBar
                      key={c.categoryId}
                      label={category?.name ?? 'Unknown'}
                      color={category?.color ?? colors.accent}
                      percent={(c.totalBaseMinor / maxCategoryTotal) * 100}
                      amountMinor={c.totalBaseMinor}
                      currencyCode={baseCurrencyCode}
                      decimalDigits={baseDecimalDigits}
                    />
                  );
                })
              )}
            </>
          ) : trailingLoading || trailing.length === 0 ? null : (
            <>
              <View style={{ marginBottom: space[12] }}>
                <SectionLabel size="md">Last 6 months</SectionLabel>
              </View>
              <ColumnChart
                points={trailing.map((t) => ({ month: monthLabel(t.month), totalMinor: t.totalMinor }))}
                activeIndex={activeTrailingIndex}
                onPick={setActiveTrailingIndex}
              />
              <View style={{ marginTop: space[20] }}>
                {trailing
                  .slice()
                  .reverse()
                  .map((t, i) => {
                    const idx = trailing.length - 1 - i;
                    const prev = trailing[idx - 1];
                    const delta = prev ? t.totalMinor - prev.totalMinor : null;
                    return (
                      <View
                        key={t.month}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: space[10],
                          borderBottomWidth: borderWidth.hairline,
                          borderBottomColor: colors.border,
                        }}
                      >
                        <Text style={{ fontSize: font.size.bodySm, fontWeight: idx === activeTrailingIndex ? '700' : '500', color: colors.text }}>
                          {t.month}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space[8] }}>
                          {delta != null ? (
                            <Text style={{ fontSize: font.size.xs, color: delta > 0 ? colors.warning : colors.success }}>
                              {delta > 0 ? '+' : ''}
                              {Math.round((delta / Math.max(1, prev!.totalMinor)) * 100)}%
                            </Text>
                          ) : null}
                          <Amount amountMinor={t.totalMinor} currencyCode={baseCurrencyCode} decimalDigits={baseDecimalDigits} size="sm" />
                        </View>
                      </View>
                    );
                  })}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  monthButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  totalsWrap: { borderBottomWidth: StyleSheet.hairlineWidth },
});
