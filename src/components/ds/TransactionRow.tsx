// One logged expense or income in the Home list
// (docs/design_system/components/lists/TransactionRow.d.ts). Folds in the
// select-mode checkbox and "split n" badge the design's prototype-local
// `TxnRow` (kit.jsx) adds on top of the shipped component, so the app only
// needs one row component rather than two.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { Amount } from './Amount';
import { CategoryIcon } from './CategoryIcon';

export interface TransactionRowProps {
  categoryName?: string;
  categoryIcon?: string;
  categoryIconType?: 'vector' | 'emoji';
  categoryColor?: string;
  /** Free-text note, 280 chars max in the app. */
  note?: string | null;
  type: 'expense' | 'income' | 'transfer';
  amountMinor: number;
  currencyCode?: string;
  decimalDigits?: number;
  /** Converted value in the user's base currency; renders as an "≈" echo when the codes differ. */
  baseAmountMinor?: number | null;
  baseCurrencyCode?: string | null;
  baseDecimalDigits?: number;
  splitCount?: number;
  onPress?: () => void;
  selectMode?: boolean;
  selected?: boolean;
}

export function TransactionRow({
  categoryName,
  categoryIcon,
  categoryIconType,
  categoryColor,
  note,
  type,
  amountMinor,
  currencyCode = 'USD',
  decimalDigits = 2,
  baseAmountMinor,
  baseCurrencyCode,
  baseDecimalDigits = 2,
  splitCount,
  onPress,
  selectMode,
  selected,
}: TransactionRowProps) {
  const { colors, space, font, radius } = useTheme();
  const showBase = baseAmountMinor != null && baseCurrencyCode != null && baseCurrencyCode !== currencyCode;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        {
          gap: space[12],
          paddingVertical: space[10],
          paddingHorizontal: space[20],
          backgroundColor: selected ? colors.surfaceSelected : 'transparent',
        },
      ]}
    >
      {selectMode ? (
        <View
          style={[
            styles.checkbox,
            {
              borderColor: selected ? 'transparent' : colors.borderStrong,
              backgroundColor: selected ? colors.accent : 'transparent',
            },
          ]}
        >
          {selected ? <Ionicons name="checkmark" size={14} color={colors.accentContrast} /> : null}
        </View>
      ) : null}

      <CategoryIcon
        icon={categoryIcon ?? 'ellipsis-horizontal'}
        iconType={categoryIconType}
        color={categoryColor ?? colors.textMuted}
        size={34}
      />

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: font.size.body, fontWeight: '600', color: colors.text }} numberOfLines={1}>
          {type === 'transfer' ? 'Transfer' : (categoryName ?? 'Uncategorized')}
        </Text>
        <View style={[styles.subRow, { gap: space[6], marginTop: 1 }]}>
          {note ? (
            <Text style={{ fontSize: font.size.xs, color: colors.textMuted }} numberOfLines={1}>
              {note}
            </Text>
          ) : null}
          {splitCount ? (
            <View
              style={{
                backgroundColor: colors.accentQuiet,
                borderRadius: radius.sm - 4,
                paddingHorizontal: 4,
                paddingVertical: 1,
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', color: colors.accent }}>
                split {splitCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.amountBlock}>
        <Amount
          amountMinor={amountMinor}
          currencyCode={currencyCode}
          decimalDigits={decimalDigits}
          showCode={false}
          sign={type === 'income' ? 'plus' : type === 'expense' ? 'minus' : 'none'}
          tone={type === 'income' ? 'income' : 'default'}
        />
        {showBase ? (
          <View style={{ marginTop: 1 }}>
            <Amount
              amountMinor={baseAmountMinor!}
              currencyCode={baseCurrencyCode!}
              decimalDigits={baseDecimalDigits}
              showCode={false}
              approx
              size="xs"
              tone="muted"
            />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  subRow: { flexDirection: 'row', alignItems: 'center' },
  amountBlock: { alignItems: 'flex-end' },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
