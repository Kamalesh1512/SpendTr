// The month's two headline figures at the top of Reports
// (docs/design_system/components/lists/TotalsRow.d.ts).
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Amount } from './Amount';
import { SectionLabel } from './SectionLabel';

interface TotalsRowProps {
  /** Both totals are already converted into the user's base currency. */
  expenseMinor: number;
  incomeMinor: number;
  currencyCode?: string;
  decimalDigits?: number;
}

export function TotalsRow({ expenseMinor, incomeMinor, currencyCode = 'USD', decimalDigits = 2 }: TotalsRowProps) {
  const { space } = useTheme();
  return (
    <View style={[styles.row, { gap: space[24] }]}>
      <View>
        <SectionLabel size="sm">Spent</SectionLabel>
        <Amount amountMinor={expenseMinor} currencyCode={currencyCode} decimalDigits={decimalDigits} size="xl" sign="minus" />
      </View>
      <View>
        <SectionLabel size="sm">Income</SectionLabel>
        <Amount
          amountMinor={incomeMinor}
          currencyCode={currencyCode}
          decimalDigits={decimalDigits}
          size="xl"
          tone="income"
          sign="plus"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
});
