// Home — the root tab and the app's ledger (docs/design_system/templates/
// spendtr-app/home.jsx): day-grouped list with sticky day headers and a
// per-day net total, hub row for Accounts/Budgets/Goals/Debts, quick-add
// reachable from the persistent tab-bar FAB. FlashList, not FlatList, per
// docs/TESTING_STRATEGY.md §5a NFR7 (60fps at 5,000+ transactions).
// Goals is a Pro-only feature (docs/MONETIZATION.md) — the tile is always
// shown, same as any other free-tier entry point, and GoalRepository.create
// is what actually throws PaywallRequiredError for a free user.
import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useTheme } from '@/theme/ThemeProvider';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useSettings } from '@/hooks/useSettings';
import { useTransactions } from '@/hooks/useTransactions';
import { Amount, DayHeader, EmptyState, Icon, SectionLabel, SkeletonRows, TransactionRow } from '@/components/ds';
import { AccountSwitcher, type AccountSwitcherSelection } from '@/components/AccountSwitcher';
import { SearchFilterPanel } from '@/components/SearchFilterPanel';
import * as accountRepository from '@/repositories/accountRepository';
import * as budgetRepository from '@/repositories/budgetRepository';
import * as debtRepository from '@/repositories/debtRepository';
import * as goalRepository from '@/repositories/goalRepository';
import * as transactionRepository from '@/repositories/transactionRepository';
import type { Transaction } from '@/repositories/transactionRepository';
import { groupByDay } from '@/utils/groupByDay';
import { dateRangeForPreset, defaultSearchFilterState, isSearchFilterActive, withinAmountRange, type SearchFilterState } from '@/utils/transactionFilters';
import { formatGroupedAmountMinor } from '@/utils/money';
import { todayIsoDate } from '@/utils/date';

const HUB = [
  { icon: 'pie-chart' as const, label: 'Budgets', route: '/budgets' as const },
  { icon: 'flag' as const, label: 'Goals', route: '/goals' as const },
  { icon: 'swap-horizontal' as const, label: 'Debts', route: '/debts' as const },
];

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

function shiftMonthKey(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y!, m! - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

function HomeSummary({ router }: { router: ReturnType<typeof useRouter> }) {
  const { colors, space, font, radius, borderWidth } = useTheme();
  const { settings } = useSettings();
  const { currencies } = useCurrencies();
  const [spentMinor, setSpentMinor] = useState<number | null>(null);
  const [trendPercent, setTrendPercent] = useState<number | null>(null);
  const [balance, setBalance] = useState<{ totalBaseMinor: number; accountCount: number } | null>(null);
  const [hubCounts, setHubCounts] = useState<{ budgets: number; goals: number; debts: number }>({ budgets: 0, goals: 0, debts: 0 });

  const baseCurrencyCode = settings?.baseCurrencyCode ?? 'USD';
  const baseCurrency = currencies.find((c) => c.code === baseCurrencyCode);
  const baseDecimalDigits = baseCurrency?.decimalDigits ?? 2;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const month = currentMonthKey();
      const prevMonth = shiftMonthKey(month, -1);
      Promise.all([
        transactionRepository.getMonthlySummary(month),
        transactionRepository.getMonthlySummary(prevMonth),
        accountRepository.getAllAccountsBaseTotal(),
        accountRepository.list(),
        budgetRepository.getWithProgress(todayIsoDate()),
        goalRepository.list(),
        debtRepository.list(),
      ]).then(([current, previous, total, accounts, budgets, goals, debts]) => {
        if (cancelled) return;
        setSpentMinor(current.totalExpenseBaseMinor);
        setTrendPercent(
          previous.totalExpenseBaseMinor > 0
            ? ((current.totalExpenseBaseMinor - previous.totalExpenseBaseMinor) / previous.totalExpenseBaseMinor) * 100
            : null,
        );
        setBalance({ totalBaseMinor: total.totalBaseMinor, accountCount: accounts.length });
        setHubCounts({ budgets: budgets.length, goals: goals.length, debts: debts.length });
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (spentMinor === null) return null;

  const monthName = new Date().toLocaleDateString(undefined, { month: 'long' });
  const trendDown = trendPercent != null && trendPercent < 0;
  const hubMeta: Record<string, number> = { Budgets: hubCounts.budgets, Goals: hubCounts.goals, Debts: hubCounts.debts };

  return (
    <View style={{ paddingHorizontal: space[20], paddingTop: space[4], paddingBottom: space[14] }}>
      <SectionLabel size="xs">Spent in {monthName}</SectionLabel>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space[10], marginTop: 4 }}>
        <Amount amountMinor={spentMinor} currencyCode={baseCurrencyCode} decimalDigits={baseDecimalDigits} size="display" />
        {trendPercent != null ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Icon name={trendDown ? 'arrow-down' : 'arrow-up'} size={12} color={trendDown ? colors.success : colors.warning} />
            <Text style={{ fontSize: font.size.xs, fontWeight: '600', color: trendDown ? colors.success : colors.warning }}>
              {Math.abs(trendPercent).toFixed(1)}%
            </Text>
          </View>
        ) : null}
      </View>
      {balance ? (
        <Text style={{ fontSize: font.size.xs, color: colors.textMuted, marginTop: space[8] }}>
          Balance{' '}
          {formatGroupedAmountMinor(balance.totalBaseMinor, { symbol: baseCurrency?.symbol ?? '$', decimalDigits: baseDecimalDigits, currencyCode: baseCurrencyCode })}
          {' '}across {balance.accountCount} {balance.accountCount === 1 ? 'account' : 'accounts'}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: space[8], marginTop: space[14] }}>
        {HUB.map((tile) => (
          <Pressable
            key={tile.label}
            onPress={() => router.push(tile.route)}
            style={{
              flex: 1,
              alignItems: 'flex-start',
              gap: space[8],
              paddingVertical: space[10],
              paddingHorizontal: space[10],
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              borderWidth: borderWidth.hairline,
              borderColor: colors.border,
            }}
          >
            <Icon name={tile.icon} size={17} color={colors.accent} />
            <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '600' }}>
              {tile.label} · {hubMeta[tile.label] ?? 0}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

type LedgerItem =
  | { kind: 'header'; day: string; label: string; totalMinor: number }
  | { kind: 'row'; transaction: Transaction };

export default function HomeScreen() {
  const { colors, space, borderWidth, font } = useTheme();
  const router = useRouter();
  const { categories } = useCategories();
  const { accounts } = useAccounts();
  const { currencies } = useCurrencies();
  const { settings } = useSettings();
  const pillRef = useRef<View>(null);
  const [selection, setSelection] = useState<AccountSwitcherSelection>({ kind: 'all' });
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [anchor, setAnchor] = useState({ top: 0, left: 0 });

  const [filterState, setFilterState] = useState<SearchFilterState>(defaultSearchFilterState());
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const filterActive = isSearchFilterActive(filterState);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const accountFilter = selection.kind === 'account' ? { accountId: selection.accountId } : undefined;

  // Account-scoped but otherwise unfiltered — this is what SearchFilterPanel
  // computes its live "Show N results" preview count against, so adjusting
  // a chip doesn't need its own repository round trip.
  const { transactions: previewTransactions, loading: previewLoading, refetch: refetchPreview } = useTransactions(accountFilter);

  const dateRange = useMemo(() => dateRangeForPreset(filterState), [filterState]);
  const appliedFilters = useMemo(
    () => ({
      ...accountFilter,
      type: filterState.type === 'all' ? undefined : filterState.type,
      categoryId: filterState.categoryId ?? undefined,
      search: filterState.search.trim() || undefined,
      from: dateRange.from,
      to: dateRange.to,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selection, filterState, dateRange],
  );
  const { transactions: rawTransactions, loading, refetch } = useTransactions(appliedFilters);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const baseCurrencyCode = settings?.baseCurrencyCode ?? 'USD';
  const baseDecimalDigits = currencies.find((c) => c.code === baseCurrencyCode)?.decimalDigits ?? 2;
  const selectedAccount = selection.kind === 'account' ? accounts.find((a) => a.id === selection.accountId) : undefined;

  const transactions = useMemo(
    () => rawTransactions.filter((t) => withinAmountRange(t, filterState, baseDecimalDigits)),
    [rawTransactions, filterState, baseDecimalDigits],
  );

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchPreview();
      // A deleted account can no longer be "showing" — fall back to "All
      // accounts" rather than silently filtering everything out.
      if (selection.kind === 'account' && !accounts.some((a) => a.id === selection.accountId)) {
        setSelection({ kind: 'all' });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refetch, refetchPreview, accounts]),
  );

  function openSwitcher() {
    pillRef.current?.measureInWindow((x, y, _width, height) => {
      setAnchor({ top: y + height + 4, left: x });
      setSwitcherVisible(true);
    });
  }

  function toggleSelectMode() {
    setSelectMode((v) => !v);
    setSelectedIds(new Set());
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(transactions.map((t) => t.id)));
  }

  function confirmBulkDelete() {
    const count = selectedIds.size;
    Alert.alert(`Delete ${count} ${count === 1 ? 'entry' : 'entries'}?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBulkDeleting(true);
          try {
            await transactionRepository.bulkDelete(Array.from(selectedIds));
            setSelectMode(false);
            setSelectedIds(new Set());
            await Promise.all([refetch(), refetchPreview()]);
          } finally {
            setBulkDeleting(false);
          }
        },
      },
    ]);
  }

  // Transfers move money between the user's own accounts, never spend or
  // earn it — they're excluded from the day total, matching
  // getMonthlySummary's category-report exclusion (docs/DATABASE_SCHEMA.md).
  const sections = useMemo(
    () =>
      groupByDay(transactions, (t) => {
        if (t.type === 'transfer') return 0;
        const amount = t.baseAmountMinor ?? t.amountMinor;
        return t.type === 'income' ? amount : -amount;
      }),
    [transactions],
  );

  const items = useMemo<LedgerItem[]>(
    () =>
      sections.flatMap((s) => [
        { kind: 'header' as const, day: s.day, label: s.label, totalMinor: s.totalMinor },
        ...s.items.map((transaction) => ({ kind: 'row' as const, transaction })),
      ]),
    [sections],
  );

  const stickyHeaderIndices = useMemo(
    () => items.reduce<number[]>((acc, item, i) => (item.kind === 'header' ? [...acc, i] : acc), []),
    [items],
  );

  function renderItem({ item }: ListRenderItemInfo<LedgerItem>) {
    if (item.kind === 'header') {
      return <DayHeader label={item.label} totalMinor={item.totalMinor} currencyCode={baseCurrencyCode} />;
    }
    const t = item.transaction;
    const category = t.categoryId ? categoryById.get(t.categoryId) : undefined;
    return (
      <TransactionRow
        categoryName={t.isSplit ? 'Split' : category?.name}
        categoryIcon={t.isSplit ? 'pie-chart' : category?.icon}
        categoryIconType={t.isSplit ? 'vector' : category?.iconType}
        categoryColor={t.isSplit ? colors.accent : category?.color}
        splitCount={t.splitCount}
        note={t.note}
        type={t.type}
        amountMinor={t.amountMinor}
        currencyCode={t.currencyCode}
        baseAmountMinor={t.baseAmountMinor}
        baseCurrencyCode={t.baseCurrencyCode}
        selectMode={selectMode}
        selected={selectedIds.has(t.id)}
        onPress={() => (selectMode ? toggleSelected(t.id) : router.push(`/transaction/${t.id}`))}
      />
    );
  }

  const selectedTotalMinor = transactions
    .filter((t) => selectedIds.has(t.id))
    .reduce((sum, t) => sum + (t.baseAmountMinor ?? t.amountMinor) * (t.type === 'expense' ? -1 : t.type === 'income' ? 1 : 0), 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {selectMode ? (
        <View style={[styles.selectHeader, { paddingHorizontal: space[16], paddingTop: 2, paddingBottom: 8 }]}>
          <Pressable accessibilityRole="button" onPress={toggleSelectMode}>
            <Text style={{ color: colors.accent, fontSize: font.size.body, fontWeight: '600' }}>Cancel</Text>
          </Pressable>
          <Text style={{ fontSize: font.size.body, fontWeight: '600', color: colors.text }}>
            {selectedIds.size === 0 ? 'Select entries' : `${selectedIds.size} selected`}
          </Text>
          <Pressable accessibilityRole="button" onPress={selectAll}>
            <Text style={{ color: colors.accent, fontSize: font.size.body, fontWeight: '600' }}>All</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.homeHeader, { paddingHorizontal: space[20], paddingTop: 2, paddingBottom: 4 }]}>
          <Text style={{ fontSize: font.size['3xl'], fontWeight: '700', color: colors.text }}>SpendTr</Text>
          <View style={{ flexDirection: 'row', gap: space[8] }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search and filter"
              onPress={() => setFilterPanelOpen(true)}
              style={[styles.headerIconButton, filterActive ? { backgroundColor: colors.accentQuiet } : null]}
            >
              <Icon name="search" size={19} color={filterActive ? colors.accent : colors.text} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Select entries" onPress={toggleSelectMode} style={styles.headerIconButton}>
              <Icon name="checkmark-circle-outline" size={19} color={colors.text} />
            </Pressable>
          </View>
        </View>
      )}

      {accounts.length > 0 && !selectMode ? (
        <View style={[styles.accountRow, { gap: space[8], paddingHorizontal: space[20], paddingBottom: space[10] }]}>
          {accounts.length > 1 ? (
            <Pressable
              testID="account-pill"
              ref={pillRef}
              accessibilityRole="button"
              accessibilityLabel="Switch account"
              onPress={openSwitcher}
              style={[styles.accountChip, { gap: space[6], borderColor: colors.border }]}
            >
              {selectedAccount ? (
                <View style={[styles.accountDot, { backgroundColor: selectedAccount.color }]}>
                  <Icon name={selectedAccount.icon as never} size={12} color="#FFFFFF" />
                </View>
              ) : (
                <View style={styles.stackedDots}>
                  {accounts.slice(0, 3).map((a, i) => (
                    <View
                      key={a.id}
                      style={[styles.stackedDot, { backgroundColor: a.color, borderColor: colors.bg, marginLeft: i ? -6 : 0 }]}
                    />
                  ))}
                </View>
              )}
              <Text style={{ color: colors.text, fontSize: font.size.sm, fontWeight: '600' }}>
                {selectedAccount ? selectedAccount.name : 'All accounts'}
              </Text>
              <Icon name="chevron-down" size={13} color={colors.textMuted} />
            </Pressable>
          ) : (
            <Pressable
              testID="account-pill"
              accessibilityRole="button"
              accessibilityLabel={`${accounts[0]!.name} details`}
              onPress={() => router.push(`/account/${accounts[0]!.id}`)}
              style={[styles.accountChip, { gap: space[6], borderColor: colors.border }]}
            >
              <View style={[styles.accountDot, { backgroundColor: accounts[0]!.color }]}>
                <Icon name={accounts[0]!.icon as never} size={12} color="#FFFFFF" />
              </View>
              <Text style={{ color: colors.text, fontSize: font.size.sm, fontWeight: '600' }}>{accounts[0]!.name}</Text>
              <Icon name="chevron-forward" size={13} color={colors.textMuted} />
            </Pressable>
          )}

          {selectedAccount ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${selectedAccount.name} details`}
              onPress={() => router.push(`/account/${selectedAccount.id}`)}
              style={[styles.accountChip, { gap: space[6], borderColor: colors.border }]}
            >
              <Icon name="stats-chart-outline" size={13} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontSize: font.size.sm, fontWeight: '600' }}>Details</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => router.push('/add-account')}
            style={[styles.accountChip, { gap: space[6], borderColor: colors.border, borderStyle: 'dashed' }]}
          >
            <Icon name="add" size={14} color={colors.accent} />
            <Text style={{ color: colors.accent, fontSize: font.size.sm, fontWeight: '600' }}>Account</Text>
          </Pressable>
        </View>
      ) : null}

      <AccountSwitcher
        visible={switcherVisible}
        onClose={() => setSwitcherVisible(false)}
        accounts={accounts}
        selection={selection}
        onSelect={setSelection}
        onAddAccount={() => router.push('/add-account')}
        anchorTop={anchor.top}
        anchorLeft={anchor.left}
      />

      {!selectMode ? <HomeSummary router={router} /> : null}

      {loading && transactions.length === 0 ? (
        <SkeletonRows />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item, i) => (item.kind === 'header' ? `h-${item.day}` : item.transaction.id) + i}
          getItemType={(item) => item.kind}
          stickyHeaderIndices={stickyHeaderIndices}
          contentContainerStyle={{ paddingBottom: selectMode ? 100 : 120 }}
          renderItem={renderItem}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title={filterActive ? 'No matches' : 'No transactions yet'}
              message={
                filterActive
                  ? 'Nothing matches these filters. Try widening the date range or clearing a filter.'
                  : 'Log your first spend with the button below — it takes about three seconds.'
              }
            />
          }
        />
      )}

      {selectMode ? (
        <View
          style={[
            styles.bulkBar,
            { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: borderWidth.hairline, paddingBottom: space[12] },
          ]}
        >
          {selectedIds.size === 0 ? (
            <Text style={{ textAlign: 'center', fontSize: font.size.xs, color: colors.textMuted, paddingVertical: space[16] }}>
              Tap entries to select them. Actions appear here.
            </Text>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={confirmBulkDelete}
                disabled={bulkDeleting}
                style={{ alignItems: 'center', gap: 4, paddingVertical: space[8] }}
              >
                <Icon name="trash-outline" size={21} color={colors.danger} />
                <Text style={{ fontSize: 10, color: colors.danger }}>Delete</Text>
              </Pressable>
              <Text style={{ textAlign: 'center', fontSize: 10, color: colors.textMuted, paddingBottom: 4 }}>
                Total selected {(selectedTotalMinor / 10 ** baseDecimalDigits).toFixed(baseDecimalDigits)}
              </Text>
            </>
          )}
        </View>
      ) : null}

      <SearchFilterPanel
        visible={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        onApply={setFilterState}
        initial={filterState}
        categories={categories}
        previewTransactions={previewLoading ? [] : previewTransactions}
        decimalDigits={baseDecimalDigits}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  homeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerIconButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  bulkBar: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  accountRow: { flexDirection: 'row', flexWrap: 'wrap' },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  accountDot: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  stackedDots: { flexDirection: 'row', width: 24 },
  stackedDot: { width: 15, height: 15, borderRadius: 7.5, borderWidth: 2 },
  hubRow: { flexDirection: 'row' },
  hubTile: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
});
