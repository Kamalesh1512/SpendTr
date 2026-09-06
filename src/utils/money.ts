// Money math: everything is stored/passed around as integer minor units
// (see docs/DATABASE_SCHEMA.md "Conventions"). All conversion/rounding
// logic funnels through here so it's never duplicated inline (CODING_STANDARDS.md).

export function minorToMajor(amountMinor: number, decimalDigits: number): number {
  return amountMinor / 10 ** decimalDigits;
}

export function majorToMinor(amountMajor: number, decimalDigits: number): number {
  return Math.round(amountMajor * 10 ** decimalDigits);
}

export function isPositiveIntegerAmount(amountMinor: number): boolean {
  return Number.isInteger(amountMinor) && amountMinor > 0;
}

export function formatAmountMinor(
  amountMinor: number,
  opts: { symbol: string; decimalDigits: number; symbolPosition?: 'pre' | 'post' },
): string {
  const major = minorToMajor(amountMinor, opts.decimalDigits);
  const body = major.toFixed(opts.decimalDigits);
  return opts.symbolPosition === 'post' ? `${body} ${opts.symbol}` : `${opts.symbol}${body}`;
}

/**
 * Currencies whose everyday grouping is 2-2-3 from the right (lakh/crore —
 * e.g. 10,00,000) rather than the 3-3-3 grouping most currencies use
 * (e.g. 1,000,000). Decimal separator stays "." everywhere regardless of
 * currency, so amounts read consistently across a mixed-currency list.
 */
const INDIAN_GROUPING_CURRENCIES = new Set(['INR', 'NPR', 'PKR', 'BDT', 'LKR']);

/**
 * Currencies whose symbol conventionally trails the amount ("120 kr", not
 * "kr120") rather than leading it, per
 * docs/design_system/readme.md ("kr and zl trail"). Symbol position is a
 * display concern, not a DATABASE_SCHEMA.md column — this list is that
 * concern's single source of truth.
 */
const POST_SYMBOL_CURRENCIES = new Set(['SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF']);

function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

function groupWestern(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Same as formatAmountMinor, but with a locale-appropriate thousands
 * grouping applied to the integer part based on currencyCode
 * (docs/UI_UX_GUIDELINES.md amount formatting). Never changes the
 * underlying digits or decimal separator — display only.
 */
export function formatGroupedAmountMinor(
  amountMinor: number,
  opts: { symbol: string; decimalDigits: number; currencyCode: string },
): string {
  const major = minorToMajor(amountMinor, opts.decimalDigits);
  const fixed = major.toFixed(opts.decimalDigits);
  const negative = fixed.startsWith('-');
  const [intPart, decPart] = (negative ? fixed.slice(1) : fixed).split('.');
  const grouped = INDIAN_GROUPING_CURRENCIES.has(opts.currencyCode)
    ? groupIndian(intPart!)
    : groupWestern(intPart!);
  const body = `${grouped}${decPart ? `.${decPart}` : ''}`;
  const withSymbol = POST_SYMBOL_CURRENCIES.has(opts.currencyCode)
    ? `${body} ${opts.symbol}`
    : `${opts.symbol}${body}`;
  return `${negative ? '-' : ''}${withSymbol}`;
}

/**
 * Converts an amount in minor units of one currency to minor units of
 * another, given a rate expressed as "1 unit of from = rate units of to".
 * Rounds only once, at the end, in the target currency's minor units.
 */
export function convertAmountMinor(
  amountMinor: number,
  rate: number,
  fromDecimalDigits: number,
  toDecimalDigits: number,
): number {
  const fromMajor = minorToMajor(amountMinor, fromDecimalDigits);
  const toMajor = fromMajor * rate;
  return majorToMinor(toMajor, toDecimalDigits);
}
