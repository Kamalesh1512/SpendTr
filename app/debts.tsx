// Debts (docs/design_system/templates/spendtr-app/debts.jsx `DebtsScreen`).
// Two summary cards and two sections; direction is carried by an arrow
// glyph and a colour, never a plus/minus sign alone. Pro-only
// (docs/MONETIZATION.md) — DebtRepository.create is the enforcement point.
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useAccounts } from '@/hooks/useAccounts';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useDebts } from '@/hooks/useDebts';
import { useSettings } from '@/hooks/useSettings';
import { AddEditDebtSheet, type DebtFormValues } from '@/components/AddEditDebtSheet';
import { Amount, EmptyState, Icon, PrivacyLine, Track } from '@/components/ds';
import * as debtRepository from '@/repositories/debtRepository';
import { PaywallRequiredError } from '@/types/errors';
import { formatGroupedAmountMinor } from '@/utils/money';

const SIDE_META = {
  lent: { label: 'Owed to you', color: 'success' as const, icon: 'arrow-down' as const },
  borrowed: { label: 'You owe', color: 'warning' as const, icon: 'arrow-up' as const },
};

export default function DebtsScreen() {
  const { colors, space, font } = useTheme();
  const router = useRouter();
  const { debts, loading, refetch } = useDebts();
  const { accounts } = useAccounts();
  const { currencies } = useCurrencies();
  const { settings } = useSettings();
  const baseCurrencyCode = settings?.baseCurrencyCode ?? 'USD';
  const [remainingByDebtId, setRemainingByDebtId] = useState<Map<string, number>>(new Map());
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      debtRepository.list().then(async (rows) => {
        const entries = await Promise.all(
          rows.map(async (d) => [d.id, await debtRepository.getRemainingBalance(d.id)] as const),
        );
        setRemainingByDebtId(new Map(entries));
      });
    }, []),
  );

  const lent = useMemo(() => debts.filter((d) => d.direction === 'lent'), [debts]);
  const borrowed = useMemo(() => debts.filter((d) => d.direction === 'borrowed'), [debts]);
  // Summed only across debts held in the base currency — debts in other
  // currencies still show correctly in their own row, they just aren't
  // folded into this header total (no cross-currency conversion happens
  // silently here).
  const lentTotal = lent
    .filter((d) => d.currencyCode === baseCurrencyCode)
    .reduce((sum, d) => sum + (remainingByDebtId.get(d.id) ?? 0), 0);
  const borrowedTotal = borrowed
    .filter((d) => d.currencyCode === baseCurrencyCode)
    .reduce((sum, d) => sum + (remainingByDebtId.get(d.id) ?? 0), 0);

  async function save(values: DebtFormValues) {
    setSaving(true);
    try {
      const baseCurrency = accounts.find((a) => a.id === values.accountId)?.currencyCode ?? currencies[0]?.code ?? 'USD';
      await debtRepository.create({
        counterpartyName: values.counterpartyName,
        direction: values.direction,
        principalAmountMinor: values.principalAmountMinor,
        currencyCode: baseCurrency,
        accountId: values.accountId,
        notes: values.notes || undefined,
      });
      setEditorOpen(false);
      refetch();
    } catch (e) {
      if (e instanceof PaywallRequiredError) {
        setEditorOpen(false);
        router.push({ pathname: '/paywall', params: { reason: e.reason } });
      }
    } finally {
      setSaving(false);
    }
  }

  function currencyFor(code: string) {
    return currencies.find((c) => c.code === code);
  }

  function renderRow(d: (typeof debts)[number]) {
    const meta = SIDE_META[d.direction];
    const color = colors[meta.color];
    const remaining = remainingByDebtId.get(d.id) ?? d.principalAmountMinor;
    const decimalDigits = currencyFor(d.currencyCode)?.decimalDigits ?? 2;
    const percent = d.principalAmountMinor > 0 ? ((d.principalAmountMinor - remaining) / d.principalAmountMinor) * 100 : 0;
    return (
      <Pressable
        key={d.id}
        onPress={() => router.push(`/debt/${d.id}` as Href)}
        style={{ paddingHorizontal: space[20], paddingVertical: space[14], borderBottomWidth: 1, borderBottomColor: colors.border }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[12] }}>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={meta.icon} size={16} color={color} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: font.size.body, fontWeight: '600', color: colors.text }} numberOfLines={1}>
              {d.counterpartyName}
            </Text>
            {d.notes ? (
              <Text style={{ fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>
                {d.notes}
              </Text>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Amount amountMinor={remaining} currencyCode={d.currencyCode} decimalDigits={decimalDigits} showCode={false} tone={remaining === 0 ? 'muted' : 'default'} />
            {remaining !== d.principalAmountMinor ? (
              <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 1, fontVariant: ['tabular-nums'] }}>
                of{' '}
                {formatGroupedAmountMinor(d.principalAmountMinor, {
                  symbol: currencyFor(d.currencyCode)?.symbol ?? '$',
                  decimalDigits,
                  currencyCode: d.currencyCode,
                })}
              </Text>
            ) : null}
          </View>
        </View>
        {remaining !== d.principalAmountMinor ? (
          <View style={{ marginTop: space[8], paddingLeft: 46 }}>
            <Track percent={percent} color={color} height={4} />
          </View>
        ) : null}
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[12], paddingTop: space[8], paddingBottom: space[8] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={{ fontSize: font.size.lg, fontWeight: '700', color: colors.text }}>Debts</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Add a debt" onPress={() => setEditorOpen(true)} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="add" size={22} color={colors.accent} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: space[60] }}>
        {!loading && debts.length === 0 ? (
          <View style={{ paddingHorizontal: space[20] }}>
            <EmptyState
              icon="swap-horizontal"
              title="Nobody owes anybody"
              message="Track the taxi you covered or the deposit a friend lent you, and log payments as they happen."
              actionLabel="Record a debt"
              onAction={() => setEditorOpen(true)}
            />
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: space[10], paddingHorizontal: space[20], paddingBottom: space[14] }}>
              {[
                { key: 'lent' as const, total: lentTotal, count: lent.length },
                { key: 'borrowed' as const, total: borrowedTotal, count: borrowed.length },
              ].map((s) => {
                const meta = SIDE_META[s.key];
                return (
                  <View key={s.key} style={{ flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: space[12] }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Icon name={meta.icon} size={13} color={colors[meta.color]} />
                      <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: colors[meta.color] }}>{meta.label}</Text>
                    </View>
                    <View style={{ marginTop: space[6] }}>
                      <Amount
                        amountMinor={s.total}
                        currencyCode={baseCurrencyCode}
                        decimalDigits={currencies.find((c) => c.code === baseCurrencyCode)?.decimalDigits ?? 2}
                        showCode={false}
                        size="lg"
                      />
                    </View>
                    <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 3 }}>
                      {s.count} {s.count === 1 ? 'person' : 'people'}
                    </Text>
                  </View>
                );
              })}
            </View>

            {[
              { label: 'Owed to you', rows: lent },
              { label: 'You owe', rows: borrowed },
            ].map((section) =>
              section.rows.length > 0 ? (
                <View key={section.label}>
                  <View style={{ paddingHorizontal: space[20], paddingTop: space[6], paddingBottom: space[6] }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: colors.textMuted }}>{section.label}</Text>
                  </View>
                  {section.rows.map(renderRow)}
                </View>
              ) : null,
            )}

            <View style={{ padding: space[20] }}>
              <PrivacyLine>Names stay on this phone. Nobody is notified, ever.</PrivacyLine>
            </View>
          </>
        )}
      </ScrollView>

      <AddEditDebtSheet
        visible={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={save}
        saving={saving}
        accounts={accounts}
        currencies={currencies}
        decimalDigits={
          currencies.find((c) => c.code === (accounts.find((a) => a.isDefault)?.currencyCode ?? accounts[0]?.currencyCode))
            ?.decimalDigits ?? 2
        }
      />
    </SafeAreaView>
  );
}
