// Sticky day header with a right-aligned day total (docs/design_system/
// templates/spendtr-app/kit.jsx `DayHeader`; docs/design_system/readme.md
// "Layout rules": "Sticky day headers in the ledger, each with the day's
// net total right-aligned").
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Amount } from './Amount';

interface DayHeaderProps {
  label: string;
  totalMinor: number;
  currencyCode?: string;
  decimalDigits?: number;
}

export function DayHeader({ label, totalMinor, currencyCode = 'USD', decimalDigits = 2 }: DayHeaderProps) {
  const { colors, space, font } = useTheme();
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.bg, paddingHorizontal: space[20], paddingTop: space[14], paddingBottom: space[6] },
      ]}
    >
      <Text
        style={{
          fontSize: font.size['2xs'],
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: font.letterSpacing.label,
          color: colors.textMuted,
        }}
      >
        {label}
      </Text>
      <Amount
        amountMinor={totalMinor}
        currencyCode={currencyCode}
        decimalDigits={decimalDigits}
        size="xs"
        showCode={false}
        tone="muted"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
});
