// One category's share of the month, as a horizontal bar
// (docs/design_system/components/lists/CategoryBar.d.ts).
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Amount } from './Amount';
import { Track } from './Track';

interface CategoryBarProps {
  label: string;
  /** The category's own hue token. */
  color: string;
  /** 0-100, relative to the largest category that month (not to the total). */
  percent: number;
  amountMinor: number;
  currencyCode?: string;
  decimalDigits?: number;
}

export function CategoryBar({ label, color, percent, amountMinor, currencyCode = 'USD', decimalDigits = 2 }: CategoryBarProps) {
  const { colors, font, space } = useTheme();
  return (
    <View style={{ marginBottom: space[12] }}>
      <View style={[styles.topRow, { marginBottom: space[6] }]}>
        <Text style={{ color: colors.text, fontSize: font.size.body }} numberOfLines={1}>
          {label}
        </Text>
        <Amount amountMinor={amountMinor} currencyCode={currencyCode} decimalDigits={decimalDigits} size="sm" showCode={false} />
      </View>
      <Track percent={percent} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
});
