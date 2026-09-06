// AccountDetail — the direct implementation of Gap #1 (docs/PRD.md §2):
// "Users have reported not being able to see what an account's balance
// was at the end of a prior period." Ships free for every user, on every
// account (docs/MONETIZATION.md: "Account running-balance view ... ships
// free — it's a core differentiator, not a premium upsell").
// docs/USER_FLOWS.md Flow 9: month-by-month balance chart, tap a month to
// drill into that month's transactions for the account. Layout follows
// docs/design_system/templates/spendtr-app/accounts.jsx `AccountDetailScreen`.
import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useTransactions } from '@/hooks/useTransactions';
import { Amount, BalanceChart, CategoryIcon, EmptyState, Group, Icon, PrivacyLine, SectionLabel, SkeletonRows, TransactionRow } from '@/components/ds';
import * as accountRepository from '@/repositories/accountRepository';

const MONTHS_SHOWN = 12;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthLabel(monthKey: string): string {
  const [, m] = monthKey.split('-').map(Number);
  return MONTH_LABELS[(m ?? 1) - 1] ?? monthKey;
}

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, space, font, borderWidth } = useTheme();
  const { accounts, loading: accountsLoading } = useAccounts();
  const { currencies } = useCurrencies();
  const { categories } = useCategories();
  const { transactions } = useTransactions();
  const [history, setHistory] = useState<{ month: string; balanceMinor: number }[] | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showMonthList, setShowMonthList] = useState(false);

  const account = useMemo(() => accounts.find((a) => a.id === id), [accounts, id]);
  const decimalDigits = currencies.find((c) => c.code === account?.currencyCode)?.decimalDigits ?? 2;
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  useMemo(() => {
    if (!id) return;
    accountRepository.getRunningBalance(id, MONTHS_SHOWN).then((rows) => {
      setHistory(rows);
      setSelectedIdx((prev) => prev ?? rows.length - 1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, accounts.length]);

  const selectedMonth = selectedIdx != null ? history?.[selectedIdx]?.month ?? null : null;

  const monthTransactions = useMemo(() => {
    if (!selectedMonth || !account) return [];
    return transactions.filter(
      (t) =>
        t.occurredAt.slice(0, 7) === selectedMonth &&
        (t.accountId === account.id || t.transferAccountId === account.id),
    );
  }, [transactions, selectedMonth, account]);

  const flow = useMemo(() => {
    let inMinor = 0;
    let outMinor = 0;
    for (const t of monthTransactions) {
      if (!account) continue;
      if (t.type === 'transfer') {
        if (t.accountId === account.id) outMinor += t.amountMinor;
        else inMinor += t.amountMinor;
      } else if (t.type === 'income') {
        inMinor += t.amountMinor;
      } else {
        outMinor += t.amountMinor;
      }
    }
    return { inMinor, outMinor };
  }, [monthTransactions, account]);

  function confirmDelete() {
    if (!account) return;
    Alert.alert('Delete this account?', 'Its transaction history stays for reports, but the account itself is removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await accountRepository.delete(account.id);
            router.back();
          } catch (e) {
            Alert.alert('Could not delete', e instanceof Error ? e.message : 'Unknown error');
          }
        },
      },
    ]);
  }

  function openOptions() {
    Alert.alert('Account options', undefined, [
      { text: 'Edit account', onPress: () => router.push({ pathname: '/add-account', params: { id: account!.id } }) },
      { text: 'Delete account', style: 'destructive', onPress: confirmDelete },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  if (!account && accountsLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <SkeletonRows />
      </SafeAreaView>
    );
  }

  if (!account) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <EmptyState icon="wallet-outline" title="Account not found" message="It may have been deleted." />
      </SafeAreaView>
    );
  }

  const currentBalance = history?.[history.length - 1]?.balanceMinor ?? account.initialBalanceMinor;
  const monthDelta =
    selectedIdx != null && selectedIdx > 0 && history
      ? history[selectedIdx]!.balanceMinor - history[selectedIdx - 1]!.balanceMinor
      : null;

  const chartPoints = history?.map((h) => ({ month: monthLabel(h.month), closeMinor: h.balanceMinor })) ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[10], paddingHorizontal: space[12], paddingTop: space[8], paddingBottom: space[8] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <CategoryIcon icon={account.icon} color={account.color} size={28} />
        <View style={{ flexShrink: 1 }}>
          <Text style={{ fontSize: font.size.lg, fontWeight: '700', color: colors.text }} numberOfLines={1}>
            {account.name}
          </Text>
          <Text style={{ fontSize: font.size['2xs'], color: colors.textMuted }}>{account.currencyCode}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Account options"
          onPress={openOptions}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="ellipsis-vertical" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: space[60] }}>
        <View style={{ paddingHorizontal: space[20] }}>
          <SectionLabel size="xs">Balance today</SectionLabel>
          <Text style={{ fontSize: font.size.amountXl, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'], marginTop: space[4] }}>
            {account.currencyCode}{' '}
            {(currentBalance / 10 ** decimalDigits).toLocaleString(undefined, {
              minimumFractionDigits: decimalDigits,
              maximumFractionDigits: decimalDigits,
            })}
          </Text>
        </View>

        {chartPoints.length >= 2 ? (
          <View style={{ paddingHorizontal: space[20], paddingTop: space[20], paddingBottom: space[6] }}>
            <BalanceChart points={chartPoints} activeIndex={selectedIdx ?? chartPoints.length - 1} onPick={setSelectedIdx} />
          </View>
        ) : (
          <View style={{ paddingHorizontal: space[20], paddingTop: space[20] }}>
            <EmptyState
              icon="stats-chart-outline"
              title="No balance history yet"
              message="The chart draws itself once this account has entries in two different months."
              actionLabel="Log an entry here"
              onAction={() => router.push('/add-transaction')}
            />
          </View>
        )}

        {selectedMonth ? (
          <View style={{ paddingHorizontal: space[20], paddingTop: space[10] }}>
            <Group>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: space[16],
                  paddingTop: space[12],
                  paddingBottom: space[10],
                  borderBottomWidth: borderWidth.hairline,
                  borderBottomColor: colors.border,
                }}
              >
                <Text style={{ fontSize: font.size.body, fontWeight: '600', color: colors.text }}>{selectedMonth}</Text>
                {monthDelta != null ? (
                  <Amount amountMinor={Math.abs(monthDelta)} currencyCode={account.currencyCode} decimalDigits={decimalDigits} showCode={false} size="xs" sign={monthDelta >= 0 ? 'plus' : 'minus'} tone={monthDelta >= 0 ? 'income' : 'muted'} />
                ) : null}
              </View>
              {[
                { label: 'Money in', value: flow.inMinor, tone: 'income' as const },
                { label: 'Money out', value: flow.outMinor, tone: 'default' as const },
                { label: 'Closing balance', value: history?.[selectedIdx ?? 0]?.balanceMinor ?? 0, tone: 'default' as const },
              ].map((r, i) => (
                <View
                  key={r.label}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: space[16],
                    paddingVertical: space[10],
                    borderBottomWidth: i === 2 ? 0 : borderWidth.hairline,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: font.size.bodySm, color: colors.textMuted }}>{r.label}</Text>
                  <Amount amountMinor={r.value} currencyCode={account.currencyCode} decimalDigits={decimalDigits} showCode={false} tone={r.tone} size={i === 2 ? 'md' : 'sm'} />
                </View>
              ))}
            </Group>
          </View>
        ) : null}

        {selectedMonth ? (
          <View style={{ paddingHorizontal: space[20], paddingTop: space[16] }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowMonthList((v) => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space[6] }}
            >
              <Text style={{ fontSize: font.size.bodySm, color: colors.accent, fontWeight: '600' }}>
                {showMonthList ? 'Hide' : 'View'} the {monthTransactions.length} {monthTransactions.length === 1 ? 'entry' : 'entries'} in {selectedMonth}
              </Text>
              <Icon name={showMonthList ? 'chevron-up' : 'chevron-forward'} size={16} color={colors.accent} />
            </Pressable>
          </View>
        ) : null}

        {showMonthList ? (
          monthTransactions.length === 0 ? (
            <EmptyState icon="receipt-outline" title="Nothing this month" message="No transactions were logged against this account in this month." />
          ) : (
            monthTransactions.map((t) => {
              const category = t.categoryId ? categoryById.get(t.categoryId) : undefined;
              return (
                <TransactionRow
                  key={t.id}
                  categoryName={t.isSplit ? 'Split' : category?.name}
                  categoryIcon={t.isSplit ? 'pie-chart' : category?.icon}
                  categoryIconType={t.isSplit ? 'vector' : category?.iconType}
                  categoryColor={t.isSplit ? colors.accent : category?.color}
                  splitCount={t.splitCount}
                  note={t.note}
                  type={t.type}
                  amountMinor={t.amountMinor}
                  currencyCode={t.currencyCode}
                  onPress={() => router.push(`/transaction/${t.id}`)}
                />
              );
            })
          )
        ) : null}

        <View style={{ paddingHorizontal: space[20], paddingTop: space[20], paddingBottom: space[8] }}>
          <SectionLabel size="xs">Month by month</SectionLabel>
        </View>
        <View style={{ paddingHorizontal: space[20] }}>
          <Group>
            {history
              ?.slice()
              .reverse()
              .map((p, i, arr) => {
                const originalIdx = history.indexOf(p);
                const before = arr[i + 1];
                const delta = before ? p.balanceMinor - before.balanceMinor : null;
                return (
                  <Pressable
                    key={p.month}
                    accessibilityRole="button"
                    onPress={() => setSelectedIdx(originalIdx)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space[12],
                      paddingHorizontal: space[16],
                      paddingVertical: space[10],
                      backgroundColor: originalIdx === selectedIdx ? colors.surfaceSelected : 'transparent',
                      borderBottomWidth: i === arr.length - 1 ? 0 : borderWidth.hairline,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <Text style={{ flex: 1, fontSize: font.size.body, color: colors.text }}>{p.month}</Text>
                    {delta != null ? (
                      <Amount
                        amountMinor={Math.abs(delta)}
                        currencyCode={account.currencyCode}
                        decimalDigits={decimalDigits}
                        showCode={false}
                        size="xs"
                        sign={delta >= 0 ? 'plus' : 'minus'}
                        tone={delta >= 0 ? 'income' : 'muted'}
                      />
                    ) : null}
                    <Amount amountMinor={p.balanceMinor} currencyCode={account.currencyCode} decimalDigits={decimalDigits} showCode={false} size="sm" />
                    <Icon name="chevron-forward" size={15} color={colors.textMuted} />
                  </Pressable>
                );
              })}
          </Group>
        </View>

        <View style={{ paddingHorizontal: space[20], paddingTop: space[20] }}>
          <PrivacyLine>Balance history is computed on-device from your entries.</PrivacyLine>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
