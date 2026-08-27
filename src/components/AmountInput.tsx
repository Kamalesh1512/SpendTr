// Large amount input (docs/UI_UX_GUIDELINES.md "Amount input"). The value
// is the natural decimal text the user is typing (e.g. "18.4"), left-to-
// right, with a real visible cursor — a normal TextInput, not a hidden-
// caret overlay driving a separately-rendered preview Text. The previous
// version tracked raw minor-unit digits ("1840" = $18.40) behind a
// caretHidden, opacity:0 input with a fake preview drawn on top: typing
// grew digits from the decimal end leftward (calculator-style), which
// read as the cursor moving the wrong way and made editing a specific
// digit impossible. The caller converts this text to minor units via
// utils/money.ts (majorToMinor) at save time — this component never does
// currency math itself.
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppColors } from '../hooks/useAppColors';

interface AmountInputProps {
  value: string; // natural decimal text as typed, e.g. "18.4"
  onChangeValue: (value: string) => void;
  symbol: string;
  decimalDigits: number;
}

/** Restricts free text to a valid partial decimal with at most `decimalDigits` fraction digits. */
function sanitize(raw: string, decimalDigits: number): string {
  let text = raw.replace(/[^0-9.]/g, '');
  const firstDot = text.indexOf('.');
  if (firstDot !== -1) {
    text = text.slice(0, firstDot + 1) + text.slice(firstDot + 1).replace(/\./g, '');
  }
  if (decimalDigits === 0) {
    text = text.replace(/\./g, '');
  } else {
    const [intPart, decPart] = text.split('.');
    if (decPart !== undefined) text = `${intPart}.${decPart.slice(0, decimalDigits)}`;
  }
  const [intPart, decPart] = text.split('.');
  const clippedInt = (intPart ?? '').replace(/^0+(?=\d)/, '').slice(0, 12);
  return decPart !== undefined ? `${clippedInt}.${decPart}` : clippedInt;
}

export function AmountInput({ value, onChangeValue, symbol, decimalDigits }: AmountInputProps) {
  const colors = useAppColors();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.symbol, { color: colors.text }]}>{symbol}</Text>
        <TextInput
          value={value}
          onChangeText={(text) => onChangeValue(sanitize(text, decimalDigits))}
          placeholder={decimalDigits > 0 ? `0.${'0'.repeat(decimalDigits)}` : '0'}
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          autoFocus
          style={[styles.input, { color: colors.text }]}
          accessibilityLabel="Amount"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 24 },
  row: { flexDirection: 'row', alignItems: 'center' },
  symbol: { fontSize: 40, fontWeight: '700', marginRight: 2 },
  input: {
    fontSize: 48,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 120,
    maxWidth: 240,
    padding: 0,
  },
});
