// AddEditDebt (docs/design_system/templates/spendtr-app/debts.jsx
// `AddDebtScreen`). Direction is the first field, as two labelled cards,
// because it changes how every later label reads. Due date is dropped
// (implementation plan §8 "Debt due date") — the schema has no column for
// it, so it never reaches this form.
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { AccountPickerSheet } from './AccountPickerSheet';
import { Button, Field, Icon, Input, Note, PickerRow, SectionLabel, Sheet } from './ds';
import type { Account } from '../repositories/accountRepository';
import type { Currency } from '../hooks/useCurrencies';

export interface DebtFormValues {
  counterpartyName: string;
  direction: 'lent' | 'borrowed';
  principalAmountMinor: number;
  accountId: string;
  notes: string;
}

interface AddEditDebtSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (values: DebtFormValues) => void;
  saving?: boolean;
  accounts: Account[];
  currencies: Currency[];
  decimalDigits: number;
  initial?: {
    counterpartyName: string;
    direction: 'lent' | 'borrowed';
    principalAmountMajor: string;
    accountId: string;
    notes: string;
  };
}

const SIDE_META = {
  lent: { label: 'Owed to you', verb: 'I lent it out' },
  borrowed: { label: 'You owe', verb: 'I borrowed it' },
} as const;

export function AddEditDebtSheet({ visible, onClose, onSave, saving, accounts, currencies, decimalDigits, initial }: AddEditDebtSheetProps) {
  const { colors, space, radius, font, borderWidth } = useTheme();
  const [counterpartyName, setCounterpartyName] = useState('');
  const [direction, setDirection] = useState<'lent' | 'borrowed'>('lent');
  const [amountText, setAmountText] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setCounterpartyName(initial?.counterpartyName ?? '');
    setDirection(initial?.direction ?? 'lent');
    setAmountText(initial?.principalAmountMajor ?? '');
    setAccountId(initial?.accountId ?? accounts.find((a) => a.isDefault)?.id ?? accounts[0]?.id ?? null);
    setNotes(initial?.notes ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initial]);

  const account = accounts.find((a) => a.id === accountId);
  const symbol = currencies.find((c) => c.code === account?.currencyCode)?.symbol ?? '$';
  const amountMinor = Math.round((parseFloat(amountText) || 0) * 10 ** decimalDigits);
  const valid = counterpartyName.trim().length > 0 && amountMinor > 0 && !!accountId;

  function save() {
    if (!valid || !accountId) return;
    onSave({ counterpartyName: counterpartyName.trim(), direction, principalAmountMinor: amountMinor, accountId, notes: notes.trim() });
  }

  return (
    <Sheet
      visible={visible}
      title={initial ? 'Edit debt' : 'Record a debt'}
      subtitle="Direction first, so the rest of the form reads correctly"
      onClose={onClose}
      height={0.86}
      footer={
        <Button variant="primary" fullWidth disabled={!valid} loading={saving} onPress={save}>
          Save debt
        </Button>
      }
    >
      <ScrollView contentContainerStyle={{ padding: space[20] }} keyboardShouldPersistTaps="handled">
        <View style={{ marginBottom: space[8] }}>
          <SectionLabel size="xs">Direction</SectionLabel>
        </View>
        <View style={{ flexDirection: 'row', gap: space[8], marginBottom: space[20] }}>
          {(['lent', 'borrowed'] as const).map((side) => {
            const on = direction === side;
            const color = side === 'lent' ? colors.success : colors.warning;
            return (
              <Pressable
                key={side}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setDirection(side)}
                style={{
                  flex: 1,
                  padding: space[14],
                  borderRadius: radius.md,
                  borderWidth: borderWidth.thin,
                  borderColor: on ? color : colors.border,
                  backgroundColor: on ? `${color}24` : colors.surfaceRaised,
                  gap: 6,
                }}
              >
                <Icon name={side === 'lent' ? 'arrow-down' : 'arrow-up'} size={19} color={on ? color : colors.textMuted} />
                <Text style={{ fontSize: font.size.bodySm, fontWeight: on ? '700' : '500', color: on ? colors.text : colors.textMuted }}>
                  {SIDE_META[side].verb}
                </Text>
                <Text style={{ fontSize: 10, color: colors.textMuted }}>{SIDE_META[side].label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Field label="Person">
          <Input value={counterpartyName} onChangeText={setCounterpartyName} placeholder="First name or nickname" maxLength={80} />
        </Field>

        <Field label="Amount">
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space[8],
              borderWidth: borderWidth.hairline,
              borderColor: colors.border,
              borderRadius: radius.md,
              backgroundColor: colors.surfaceRaised,
              paddingHorizontal: space[12],
            }}
          >
            <Text style={{ fontSize: font.size.lg, fontWeight: '700', color: colors.textMuted }}>{symbol}</Text>
            <Input
              value={amountText}
              onChangeText={setAmountText}
              keyboardType="decimal-pad"
              placeholder="0.00"
              style={{ flex: 1, borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 0, fontWeight: '700', fontVariant: ['tabular-nums'] }}
            />
          </View>
        </Field>

        <Field label="Account it came from">
          <PickerRow
            icon={(account?.icon as never) ?? 'wallet'}
            iconColor={account?.color}
            label="Account"
            value={account ? `${account.name} · ${account.currencyCode}` : 'Select account'}
            onPress={() => setShowAccountPicker(true)}
          />
        </Field>

        <Field label="What it was for">
          <Input value={notes} onChangeText={setNotes} placeholder="Short note" maxLength={280} />
        </Field>

        <View style={{ paddingBottom: space[16] }}>
          <Note tone="info">Debts sit outside your spending totals until a payment is logged against them.</Note>
        </View>
      </ScrollView>

      <AccountPickerSheet
        visible={showAccountPicker}
        accounts={accounts}
        selectedId={accountId}
        onSelect={(a) => {
          setAccountId(a.id);
          setShowAccountPicker(false);
        }}
        onClose={() => setShowAccountPicker(false)}
      />
    </Sheet>
  );
}
