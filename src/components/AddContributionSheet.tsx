// Keypad-first contribution entry for a goal
// (docs/design_system/templates/spendtr-app/goals.jsx `AddContributionScreen`).
// Going over target is allowed — it warns in amber rather than blocking,
// since a goal is just bookkeeping and there is nothing to actually cap.
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Chip, Keypad, Note, Sheet, Track } from './ds';
import { formatGroupedAmountMinor, majorToMinor } from '../utils/money';

interface AddContributionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (amountMinor: number) => void;
  goalName: string;
  savedMinor: number;
  targetMinor: number;
  currencyCode: string;
  decimalDigits: number;
  symbol: string;
  color: string;
}

export function AddContributionSheet({
  visible,
  onClose,
  onSave,
  goalName,
  savedMinor,
  targetMinor,
  currencyCode,
  decimalDigits,
  symbol,
  color,
}: AddContributionSheetProps) {
  const { colors, space, font } = useTheme();
  const [text, setText] = useState('');

  const left = Math.max(0, targetMinor - savedMinor);
  const entered = majorToMinor(parseFloat(text) || 0, decimalDigits);
  const exceeds = entered > left;

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
    if (entered <= 0) return;
    onSave(entered);
    setText('');
  }

  return (
    <Sheet
      visible={visible}
      nested
      title={`Add to ${goalName}`}
      subtitle={`${money(left)} left of ${money(targetMinor)}`}
      onClose={onClose}
      height={0.84}
    >
      <View style={{ padding: space[20], paddingBottom: space[10], alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.textMuted }}>{symbol}</Text>
          <Text style={{ fontSize: 44, fontWeight: '700', fontVariant: ['tabular-nums'], color: exceeds ? colors.warning : colors.text }}>
            {text === '' ? (0).toFixed(decimalDigits) : text}
          </Text>
        </View>
        <View style={{ marginTop: space[14], width: '100%' }}>
          <Track percent={targetMinor > 0 ? Math.min(100, ((savedMinor + entered) / targetMinor) * 100) : 0} color={exceeds ? colors.warning : color} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space[6] }}>
            <Text style={{ fontSize: 10, color: colors.textMuted, fontVariant: ['tabular-nums'] }}>after this: {money(savedMinor + entered)}</Text>
            <Text style={{ fontSize: 10, color: colors.textMuted, fontVariant: ['tabular-nums'] }}>target {money(targetMinor)}</Text>
          </View>
        </View>
      </View>

      {exceeds ? (
        <View style={{ paddingHorizontal: space[20], paddingBottom: space[10] }}>
          <Note tone="warn">
            That is {money(entered - left)} more than the target. Saving it is fine — the goal will simply show as complete.
          </Note>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: space[8], paddingHorizontal: space[20], paddingBottom: space[8], flexWrap: 'wrap' }}>
        <Chip label={`Fill it: ${money(left)}`} onPress={() => setText(String(left / 10 ** decimalDigits))} />
        <Chip label="Today" selected icon="calendar-outline" />
      </View>

      <Keypad onDigit={digit} onDot={dot} onBack={back} onSave={save} saveLabel="Add" saveDisabled={entered === 0} decimals={decimalDigits} />
    </Sheet>
  );
}
