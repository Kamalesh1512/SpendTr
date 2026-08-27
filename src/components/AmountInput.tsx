// Large, keypad-first amount input with a running formatted preview
// (docs/UI_UX_GUIDELINES.md "Amount input"). Value is tracked as a plain
// digit string and converted to minor units by the caller — this
// component never does currency math itself (docs/CODING_STANDARDS.md:
// all money math lives in src/utils/money.ts / src/services/currency.ts).
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppColors } from '../hooks/useAppColors';
import { minorToMajor } from '../utils/money';

interface AmountInputProps {
  digits: string; // raw digit string representing minor units, e.g. "1234" = 12.34
  onChangeDigits: (digits: string) => void;
  symbol: string;
  decimalDigits: number;
}

export function AmountInput({ digits, onChangeDigits, symbol, decimalDigits }: AmountInputProps) {
  const colors = useAppColors();
  const amountMinor = digits === '' ? 0 : parseInt(digits, 10);
  const preview = minorToMajor(amountMinor, decimalDigits).toFixed(decimalDigits);

  return (
    <View style={styles.container}>
      <Text
        pointerEvents="none"
        style={[styles.preview, { color: colors.text }]}
        accessibilityLabel={`Amount ${symbol}${preview}`}
      >
        {symbol}
        {preview}
      </Text>
      <TextInput
        style={styles.overlayInput}
        value={digits}
        onChangeText={(text) => onChangeDigits(text.replace(/[^0-9]/g, '').slice(0, 12))}
        keyboardType="number-pad"
        autoFocus
        caretHidden
        accessibilityLabel="Amount keypad input"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 24 },
  preview: { fontSize: 48, fontWeight: '700', fontVariant: ['tabular-nums'] },
  overlayInput: { ...StyleSheet.absoluteFill, opacity: 0 },
});
