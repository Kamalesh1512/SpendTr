// DebtDetail (docs/design_system/templates/spendtr-app/debts.jsx
// `DebtDetailScreen`). The running-remaining-balance view: outstanding
// figure at the top, then every payment with the balance it left behind,
// ending at the original record.
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useAccounts } from '@/hooks/useAccounts';
import { useCurrencies } from '@/hooks/useCurrencies';
import { AddEditDebtSheet, type DebtFormValues } from '@/components/AddEditDebtSheet';
import { LogPaymentSheet } from '@/components/LogPaymentSheet';
import { Button, Icon, Note, SectionLabel, Track } from '@/components/ds';
import * as debtRepository from '@/repositories/debtRepository';
import type { Debt, DebtPayment } from '@/repositories/debtRepository';
import { todayIsoDate } from '@/utils/date';
import { minorToMajor } from '@/utils/money';

const SIDE_META = {
  lent: { label: 'Owed to you', color: 'success' as const, icon: 'arrow-down' as const, verb: 'lent' },
  borrowed: { label: 'You owe', color: 'warning' as const, icon: 'arrow-up' as const, verb: 'borrowed' },
};

export default function DebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, space, font } = useTheme();
  const router = useRouter();
  const { accounts } = useAccounts();
  const { currencies } = useCurrencies();
  const [debt, setDebt] = useState<Debt | null | undefined>(undefined);
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [remaining, setRemaining] = useState(0);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const currency = currencies.find((c) => c.code === debt?.currencyCode);
  const decimalDigits = currency?.decimalDigits ?? 2;

  const refetch = useCallback(async () => {
    const all = await debtRepository.list(true);
    const found = all.find((d) => d.id === id) ?? null;
    setDebt(found);
    if (found) {
      const [bal, rows] = await Promise.all([debtRepository.getRemainingBalance(found.id), debtRepository.getPayments(found.id)]);
      setRemaining(bal);
      setPayments(rows);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const meta = debt ? SIDE_META[debt.direction] : SIDE_META.lent;
  const paid = debt ? debt.principalAmountMinor - remaining : 0;
  const percent = debt && debt.principalAmountMinor > 0 ? (paid / debt.principalAmountMinor) * 100 : 0;
  const settled = debt?.isSettled ?? false;

  const runningBalances = useMemo(() => {
    let seen = 0;
    return payments.map((p) => {
      seen += p.amountMinor;
      return { payment: p, leftAfter: Math.max(0, (debt?.principalAmountMinor ?? 0) - seen) };
    });
  }, [payments, debt]);

  if (debt === undefined) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} />;
  }
  if (debt === null) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <Text style={{ color: colors.textMuted, padding: space[20] }}>Debt not found.</Text>
      </SafeAreaView>
    );
  }

  async function logPayment(amountMinor: number) {
    setBusy(true);
    try {
      await debtRepository.addPayment(debt!.id, { amountMinor, occurredAt: todayIsoDate() });
      setPaymentSheetOpen(false);
      await refetch();
    } catch (e) {
      Alert.alert('Could not log payment', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  async function toggleSettled() {
    setBusy(true);
    try {
      if (settled) await debtRepository.reopen(debt!.id);
      else await debtRepository.markSettled(debt!.id);
      await refetch();
    } catch (e) {
      Alert.alert('Could not update', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(values: DebtFormValues) {
    setBusy(true);
    try {
      await debtRepository.update(debt!.id, {
        counterpartyName: values.counterpartyName,
        direction: values.direction,
        principalAmountMinor: values.principalAmountMinor,
        accountId: values.accountId,
        notes: values.notes || undefined,
      });
      setEditorOpen(false);
      await refetch();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete this debt?', 'This removes it and its payment history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await debtRepository.delete(debt!.id);
            router.back();
          } catch (e) {
            Alert.alert('Could not delete', e instanceof Error ? e.message : 'Unknown error');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[12], paddingTop: space[8], paddingBottom: space[8] }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: font.size.lg, fontWeight: '700', color: colors.text }} numberOfLines={1}>
          {debt.counterpartyName}
        </Text>
        <View style={{ flexDirection: 'row' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Edit debt" onPress={() => setEditorOpen(true)} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="create-outline" size={20} color={colors.text} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Delete debt" onPress={confirmDelete} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="trash-outline" size={20} color={colors.danger} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: space[60] }}>
        <View style={{ paddingHorizontal: space[20], alignItems: 'center' }}>
          <SectionLabel size="xs">{settled ? 'Settled in full' : 'Still outstanding'}</SectionLabel>
          <Text style={{ fontSize: 40, fontWeight: '700', fontVariant: ['tabular-nums'], color: settled ? colors.success : colors.text, marginTop: 3 }}>
            {minorToMajor(remaining, decimalDigits).toFixed(decimalDigits)}
          </Text>
          <Text style={{ fontSize: font.size.bodySm, color: colors.textMuted, marginTop: 4, fontVariant: ['tabular-nums'] }}>
            of {minorToMajor(debt.principalAmountMinor, decimalDigits).toFixed(decimalDigits)} {meta.verb}
            {debt.notes ? ` · ${debt.notes}` : ''}
          </Text>
          <View style={{ width: '100%', marginTop: space[16] }}>
            <Track percent={percent} color={settled ? colors.success : colors[meta.color]} height={8} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space[8] }}>
              <Text style={{ fontSize: 10, color: colors.textMuted, fontVariant: ['tabular-nums'] }}>
                {minorToMajor(paid, decimalDigits).toFixed(decimalDigits)} repaid
              </Text>
              <Text style={{ fontSize: 10, color: colors.textMuted }}>{Math.round(percent)}%</Text>
            </View>
          </View>
        </View>

        {settled ? (
          <View style={{ padding: space[20] }}>
            <Note tone="ok">Fully repaid. The record stays in your history unless you delete it.</Note>
          </View>
        ) : null}

        <View style={{ padding: space[20], paddingBottom: space[6] }}>
          <SectionLabel size="xs">Running balance</SectionLabel>
        </View>
        {runningBalances.map(({ payment, leftAfter }) => (
          <View
            key={payment.id}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space[12], paddingHorizontal: space[20], paddingVertical: space[10], borderBottomWidth: 1, borderBottomColor: colors.border }}
          >
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={meta.icon} size={14} color={colors[meta.color]} />
            </View>
            <Text style={{ flex: 1, fontSize: font.size.bodySm, color: colors.text }}>{payment.occurredAt}</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: font.size.sm, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] }}>
                {minorToMajor(payment.amountMinor, decimalDigits).toFixed(decimalDigits)}
              </Text>
              <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 1, fontVariant: ['tabular-nums'] }}>
                left {minorToMajor(leftAfter, decimalDigits).toFixed(decimalDigits)}
              </Text>
            </View>
          </View>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[12], paddingHorizontal: space[20], paddingVertical: space[10], opacity: 0.75 }}>
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="hand-left" size={14} color={colors.textMuted} />
          </View>
          <Text style={{ flex: 1, fontSize: font.size.bodySm, color: colors.text }}>Debt recorded</Text>
          <Text style={{ fontSize: font.size.sm, color: colors.textMuted, fontVariant: ['tabular-nums'] }}>
            {minorToMajor(debt.principalAmountMinor, decimalDigits).toFixed(decimalDigits)}
          </Text>
        </View>
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: space[10], padding: space[20], borderTopWidth: 1, borderTopColor: colors.border }}>
        {settled ? (
          <Button variant="secondary" fullWidth disabled={busy} onPress={toggleSettled}>
            Reopen this debt
          </Button>
        ) : (
          <>
            <Button variant="primary" fullWidth disabled={busy} onPress={() => setPaymentSheetOpen(true)}>
              Log a payment
            </Button>
            <Button variant="secondary" disabled={busy} onPress={toggleSettled}>
              Settle
            </Button>
          </>
        )}
      </View>

      <LogPaymentSheet
        visible={paymentSheetOpen}
        onClose={() => setPaymentSheetOpen(false)}
        onSave={logPayment}
        counterpartyName={debt.counterpartyName}
        remainingMinor={remaining}
        currencyCode={debt.currencyCode}
        decimalDigits={decimalDigits}
        symbol={currency?.symbol ?? '$'}
      />

      <AddEditDebtSheet
        visible={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={saveEdit}
        saving={busy}
        accounts={accounts}
        currencies={currencies}
        decimalDigits={decimalDigits}
        initial={{
          counterpartyName: debt.counterpartyName,
          direction: debt.direction,
          principalAmountMajor: String(minorToMajor(debt.principalAmountMinor, decimalDigits)),
          accountId: debt.accountId,
          notes: debt.notes ?? '',
        }}
      />
    </SafeAreaView>
  );
}
