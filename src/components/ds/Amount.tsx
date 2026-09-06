// Every monetary figure in the app renders through here (docs/design_system
// /components/money/Amount.d.ts): tabular figures, grouped integer part,
// currency code before the number by default (never a bare symbol in a
// list, so mixed-currency rows stay unambiguous). Expenses are NOT red —
// "danger" is reserved for genuine failures, not ordinary spend.
import { Text } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { formatGroupedAmountMinor } from '../../utils/money';

export interface AmountProps {
  /** Integer minor units, exactly as stored (1840 = 18.40). */
  amountMinor: number;
  /** ISO code, shown before the number by default. Also selects lakh/crore grouping for INR/NPR/PKR/BDT/LKR. */
  currencyCode?: string;
  decimalDigits?: number;
  /** Currency symbol, when the code is hidden. */
  symbol?: string;
  showCode?: boolean;
  /** Expense rows use "minus", income rows "plus", totals "none". */
  sign?: 'none' | 'minus' | 'plus';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'display';
  /** income = green, danger = red. Expenses are NOT red — they are default ink. */
  tone?: 'default' | 'muted' | 'income' | 'danger';
  /** Prefix with "≈" for a converted base-currency echo. */
  approx?: boolean;
}

export function Amount({
  amountMinor,
  currencyCode = 'USD',
  decimalDigits = 2,
  symbol,
  showCode = true,
  sign = 'none',
  size = 'md',
  tone = 'default',
  approx = false,
}: AmountProps) {
  const { colors, font } = useTheme();

  const SIZES: Record<NonNullable<AmountProps['size']>, { fontSize: number; fontWeight: '400' | '600' | '700' }> = {
    xs: { fontSize: font.size['2xs'], fontWeight: '400' },
    sm: { fontSize: font.size.sm, fontWeight: '600' },
    md: { fontSize: font.size.body, fontWeight: '700' },
    lg: { fontSize: font.size.lg, fontWeight: '600' },
    xl: { fontSize: font.size['2xl'], fontWeight: '700' },
    display: { fontSize: font.size.amountXl, fontWeight: '700' },
  };

  const TONES: Record<NonNullable<AmountProps['tone']>, string> = {
    default: colors.text,
    muted: colors.textMuted,
    income: colors.success,
    danger: colors.danger,
  };

  const body = formatGroupedAmountMinor(amountMinor, { symbol: symbol ?? '', decimalDigits, currencyCode });
  const prefix = sign === 'minus' ? '-' : sign === 'plus' ? '+' : '';

  return (
    <Text
      style={{
        fontVariant: ['tabular-nums'],
        color: TONES[tone],
        ...SIZES[size],
      }}
    >
      {approx ? '≈ ' : ''}
      {prefix}
      {showCode ? `${currencyCode} ` : ''}
      {body}
    </Text>
  );
}
