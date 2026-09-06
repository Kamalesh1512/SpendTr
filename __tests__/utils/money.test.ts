import {
  convertAmountMinor,
  formatAmountMinor,
  formatGroupedAmountMinor,
  isPositiveIntegerAmount,
  majorToMinor,
  minorToMajor,
} from '@/utils/money';

describe('money utils', () => {
  test('minorToMajor / majorToMinor round-trip for 2-decimal currency', () => {
    expect(minorToMajor(1234, 2)).toBeCloseTo(12.34);
    expect(majorToMinor(12.34, 2)).toBe(1234);
  });

  test('handles 0-decimal currencies (e.g. JPY)', () => {
    expect(minorToMajor(1500, 0)).toBe(1500);
    expect(majorToMinor(1500, 0)).toBe(1500);
  });

  test('isPositiveIntegerAmount rejects non-integers, zero, negatives', () => {
    expect(isPositiveIntegerAmount(100)).toBe(true);
    expect(isPositiveIntegerAmount(0)).toBe(false);
    expect(isPositiveIntegerAmount(-5)).toBe(false);
    expect(isPositiveIntegerAmount(1.5)).toBe(false);
  });

  test('formatAmountMinor renders symbol + fixed decimals', () => {
    expect(formatAmountMinor(1234, { symbol: '$', decimalDigits: 2 })).toBe('$12.34');
    expect(formatAmountMinor(1500, { symbol: '¥', decimalDigits: 0 })).toBe('¥1500');
  });

  test('convertAmountMinor converts and rounds once in the target currency', () => {
    // $12.34 at rate 0.92 (USD->EUR) => 11.3528 => rounds to 1135 minor units
    expect(convertAmountMinor(1234, 0.92, 2, 2)).toBe(1135);
  });

  test('convertAmountMinor handles a 2-decimal -> 0-decimal conversion (e.g. USD -> JPY)', () => {
    // $10.00 at rate 149.5 => 1495 JPY (0 decimals)
    expect(convertAmountMinor(1000, 149.5, 2, 0)).toBe(1495);
  });

  test('formatGroupedAmountMinor groups INR as 2-2-3 (lakh/crore), not 3-3-3', () => {
    expect(
      formatGroupedAmountMinor(1000000000, { symbol: '₹', decimalDigits: 2, currencyCode: 'INR' }),
    ).toBe('₹1,00,00,000.00');
  });

  test('formatGroupedAmountMinor groups USD as 3-3-3', () => {
    expect(
      formatGroupedAmountMinor(100000000, { symbol: '$', decimalDigits: 2, currencyCode: 'USD' }),
    ).toBe('$1,000,000.00');
  });

  test('formatGroupedAmountMinor trails the symbol for post-symbol currencies (e.g. SEK)', () => {
    expect(formatGroupedAmountMinor(12000, { symbol: 'kr', decimalDigits: 2, currencyCode: 'SEK' })).toBe('120.00 kr');
  });

  test('formatAmountMinor supports a trailing symbolPosition without changing the default', () => {
    expect(formatAmountMinor(1234, { symbol: '$', decimalDigits: 2 })).toBe('$12.34');
    expect(formatAmountMinor(1234, { symbol: 'kr', decimalDigits: 2, symbolPosition: 'post' })).toBe('12.34 kr');
  });
});
