// Keypad-first payment entry for a debt (docs/design_system/templates/
// spendtr-app/debts.jsx `LogPaymentScreen`). Overpayment is the one place a
// hard block is right — refused in red rather than warned in amber, since
// GoalRepository's contributions have nowhere to overflow but a debt's
// outstanding figure is a real ceiling (docs/CLAUDE.md §10, enforced again
// here — see DebtRepository.addPayment — not just in this sheet).
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Chip, Keypad, Note, Sheet } from './ds';
import { formatGroupedAmountMinor, majorToMinor } from '../utils/money';

interface LogPaymentSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (amountMinor: number) => void;
  counterpartyName: string;
  remainingMinor: number;
  currencyCode: string;
  decimalDigits: number;
  symbol: string;
}

export function LogPaymentSheet({
  visible,
  onClose,
  onSave,
  counterpartyName,
  remainingMinor,
  currencyCode,
  decimalDigits,
  symbol,
}: LogPaymentSheetProps) {
  const { colors, space } = useTheme();
  const [text, setText] = useState('');

  const entered = majorToMinor(parseFloat(text) || 0, decimalDigits);
  const exceeds = entered > remainingMinor;

  function money(amountMinor: number): string {
    return formatGroupedAmountMinor(amountMinor, { symbol, decimalDigits, currencyCode });
  }

  function digit(d: string) {
    setText((t) => (t + d).replace(/^0(?=\d)/, ''));
  }
  function dot() {
    setText((t) => (t.includes('.') ? t : t === '' ? '0.' : `${t}.`));
  }
  function back() {
    setText((t) => t.slice(0, -1));
  }
  function save() {
    if (entered <= 0 || exceeds) return;
    onSave(entered);
    setText('');
  }

  return (
    <Sheet
      visible={visible}
      nested
      title={`Payment from ${counterpartyName}`}
      subtitle={`${money(remainingMinor)} outstanding`}
      onClose={onClose}
      height={0.82}
    >
      <View style={{ padding: space[20], paddingBottom: space[10], alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.textMuted }}>{symbol}</Text>
          <Text style={{ fontSize: 44, fontWeight: '700', fontVariant: ['tabular-nums'], color: exceeds ? colors.danger : colors.text }}>
            {text === '' ? (0).toFixed(decimalDigits) : text}
          </Text>
        </View>
        <Text style={{ marginTop: space[8], fontSize: 12, color: exceeds ? colors.danger : colors.textMuted, fontVariant: ['tabular-nums'] }}>
          {exceeds ? `${money(entered - remainingMinor)} more than outstanding` : `leaves ${money(Math.max(0, remainingMinor - entered))} outstanding`}
        </Text>
      </View>

      {exceeds ? (
        <View style={{ paddingHorizontal: space[20], paddingBottom: space[10] }}>
          <Note tone="danger">
            A payment can&apos;t exceed what&apos;s outstanding. Reduce it to {money(remainingMinor)}, or edit the original amount if the debt was larger than recorded.
          </Note>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: space[8], paddingHorizontal: space[20], paddingBottom: space[8], flexWrap: 'wrap' }}>
        <Chip
          label={`Settle in full: ${money(remainingMinor)}`}
          selected={!exceeds && entered === remainingMinor}
          onPress={() => setText(String(remainingMinor / 10 ** decimalDigits))}
        />
        <Chip label="Today" selected icon="calendar-outline" />
      </View>

      <Keypad onDigit={digit} onDot={dot} onBack={back} onSave={save} saveLabel="Log" saveDisabled={entered === 0 || exceeds} decimals={decimalDigits} />
    </Sheet>
  );
}
