// RecurringList (docs/design_system/templates/spendtr-app/recurring.jsx
// `RecurringListScreen`). One timeline sorted by next date, split into
// Next 7 days / Later this month / Beyond. Subscription, bill and income
// are told apart by a stripe + tinted glyph + label; income is the only
// kind that gets a plus sign and green (the same money-color rule Home
// already follows). The header states the real monthly commitment, with
// yearly plans averaged.
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, SectionList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions';
import { useSettings } from '@/hooks/useSettings';
import { Amount, EmptyState, Group, Icon, PrivacyLine, ScreenHeader, SectionLabel } from '@/components/ds';
import type { RecurringTransaction } from '@/repositories/recurringTransactionRepository';
import { daysBetween, todayIsoDate } from '@/utils/date';
import { formatGroupedAmountMinor } from '@/utils/money';

const KIND_LABEL: Record<RecurringTransaction['kind'], string> = {
  subscription: 'Subscription',
  bill: 'Bill',
  income: 'Income',
};

const KIND_ICON: Record<RecurringTransaction['kind'], Parameters<typeof Icon>[0]['name']> = {
  subscription: 'repeat',
  bill: 'receipt',
  income: 'trending-up',
};

const FILTERS: Array<{ id: 'all' | RecurringTransaction['kind']; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'subscription', label: 'Subs' },
  { id: 'bill', label: 'Bills' },
  { id: 'income', label: 'Income' },
];

const CYCLE_MONTHLY_FACTOR: Record<RecurringTransaction['billingCycle'], number> = {
  weekly: 52 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

function kindColor(kind: RecurringTransaction['kind'], colors: ReturnType<typeof useTheme>['colors']): string {
  if (kind === 'bill') return colors.warning;
  if (kind === 'income') return colors.success;
  return colors.accent;
}

export default function RecurringScreen() {
  const { colors, space, font, radius, borderWidth } = useTheme();
  const router = useRouter();
  const { recurringTransactions, loading, refetch } = useRecurringTransactions();
  const { currencies } = useCurrencies();
  const { settings } = useSettings();
  const [filter, setFilter] = useState<'all' | RecurringTransaction['kind']>('all');
  const decimalDigitsByCode = new Map(currencies.map((c) => [c.code, c.decimalDigits]));

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const active = useMemo(() => recurringTransactions.filter((r) => r.isActive), [recurringTransactions]);
  const filtered = useMemo(
    () => (filter === 'all' ? recurringTransactions : recurringTransactions.filter((r) => r.kind === filter)),
    [recurringTransactions, filter],
  );

  const baseCurrency = currencies.find((c) => c.code === (settings?.baseCurrencyCode ?? 'USD'));
  const monthlyCommitmentMinor = useMemo(() => {
    // Rough same-currency-only average — cross-currency conversion for a
    // header summary is intentionally out of scope here.
    return active
      .filter((r) => r.kind !== 'income' && r.currencyCode === (settings?.baseCurrencyCode ?? baseCurrency?.code))
      .reduce((sum, r) => sum + r.amountMinor * CYCLE_MONTHLY_FACTOR[r.billingCycle], 0);
  }, [active, settings?.baseCurrencyCode, baseCurrency?.code]);

  const today = todayIsoDate();
  const sections = useMemo(() => {
    const withDays = filtered
      .map((r) => ({ item: r, days: daysBetween(today, r.nextRenewalDate.slice(0, 10)) }))
      .sort((a, b) => a.days - b.days);
    const next7 = withDays.filter((x) => x.days >= 0 && x.days <= 7).map((x) => x.item);
    const laterThisMonth = withDays.filter((x) => x.days > 7 && x.days <= 31).map((x) => x.item);
    const beyond = withDays.filter((x) => x.days > 31 || x.days < 0).map((x) => x.item);
    return [
      { title: 'Next 7 days', data: next7 },
      { title: 'Later this month', data: laterThisMonth },
      { title: 'Beyond', data: beyond },
    ].filter((s) => s.data.length > 0);
  }, [filtered, today]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenHeader
        title="Recurring"
        actionIcon="add"
        actionLabel="Add recurring transaction"
        onAction={() => router.push('/add-recurring')}
        testID="add-recurring-button"
      />

      {active.length > 0 ? (
        <View style={{ paddingHorizontal: space[16], paddingBottom: space[12] }}>
          <Group>
            <View style={{ padding: space[14] }}>
              <SectionLabel size="xs">Committed each month</SectionLabel>
              <Text style={{ fontSize: font.size['2xl'], fontWeight: '700', color: colors.text, marginTop: 4, fontVariant: ['tabular-nums'] }}>
                {formatGroupedAmountMinor(Math.round(monthlyCommitmentMinor), {
                  symbol: baseCurrency?.symbol ?? '$',
                  decimalDigits: baseCurrency?.decimalDigits ?? 2,
                  currencyCode: baseCurrency?.code ?? 'USD',
                })}
              </Text>
              <Text style={{ fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 }}>
                Across {active.length} active {active.length === 1 ? 'item' : 'items'} · yearly plans averaged
              </Text>
            </View>
          </Group>
        </View>
      ) : null}

      {recurringTransactions.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: space[8], paddingHorizontal: space[16], paddingBottom: space[10] }}>
          {FILTERS.map((f) => {
            const on = filter === f.id;
            return (
              <Pressable
                key={f.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setFilter(f.id)}
                style={{
                  paddingHorizontal: space[12],
                  paddingVertical: 6,
                  borderRadius: radius.full,
                  backgroundColor: on ? colors.accent : colors.surfaceRaised,
                  borderWidth: borderWidth.hairline,
                  borderColor: on ? colors.accent : colors.border,
                }}
              >
                <Text style={{ fontSize: font.size.sm, fontWeight: '600', color: on ? colors.accentContrast : colors.text }}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          recurringTransactions.length === 0 ? { flexGrow: 1, justifyContent: 'center' } : { paddingHorizontal: space[16], paddingBottom: 120 }
        }
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="repeat-outline"
              title="Nothing recurring yet"
              message="Add a subscription, bill, or income source to get renewal reminders before you're charged again."
              actionLabel="Add Recurring"
              onAction={() => router.push('/add-recurring')}
            />
          )
        }
        renderSectionHeader={({ section }) => (
          <View style={{ paddingTop: space[14], paddingBottom: space[6] }}>
            <SectionLabel size="xs">{section.title}</SectionLabel>
          </View>
        )}
        renderItem={({ item }) => {
          const color = kindColor(item.kind, colors);
          const days = daysBetween(today, item.nextRenewalDate.slice(0, 10));
          const relative = !item.isActive ? 'Paused' : days === 0 ? 'today' : days === 1 ? 'in 1 day' : days > 1 ? `in ${days} days` : 'overdue';
          return (
            <Pressable
              onPress={() => router.push(`/recurring/${item.id}`)}
              style={{ flexDirection: 'row', alignItems: 'stretch', gap: space[12], paddingVertical: space[10], borderBottomWidth: borderWidth.hairline, borderBottomColor: colors.border, opacity: item.isActive ? 1 : 0.5 }}
            >
              <View style={{ width: 3, borderRadius: 2, backgroundColor: color }} />
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}>
                <Icon name={KIND_ICON[item.kind]} size={17} color={color} />
              </View>
              <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                <Text style={{ fontSize: font.size.body, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', color }}>
                    {KIND_LABEL[item.kind]}
                  </Text>
                  <Text style={{ fontSize: font.size.xs, color: colors.textMuted }}>
                    {item.billingCycle} · {relative}
                  </Text>
                </View>
              </View>
              <Amount
                amountMinor={item.amountMinor}
                currencyCode={item.currencyCode}
                decimalDigits={decimalDigitsByCode.get(item.currencyCode) ?? 2}
                tone={item.kind === 'income' ? 'income' : 'default'}
                sign={item.kind === 'income' ? 'plus' : 'none'}
              />
            </Pressable>
          );
        }}
        ListFooterComponent={
          recurringTransactions.length > 0 ? (
            <View style={{ paddingVertical: space[20] }}>
              <PrivacyLine>Reminders are scheduled locally, on this phone. No push server exists.</PrivacyLine>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
