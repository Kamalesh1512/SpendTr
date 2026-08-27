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
  opts: { symbol: string; decimalDigits: number },
): string {
  const major = minorToMajor(amountMinor, opts.decimalDigits);
  return `${opts.symbol}${major.toFixed(opts.decimalDigits)}`;
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
