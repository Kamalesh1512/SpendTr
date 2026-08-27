// FX conversion + caching (docs/API_DESIGN.md §2, docs/ARCHITECTURE.md §6).
// Vendor (Frankfurter) is isolated behind this module so it can be swapped
// without touching callers. Throttled to at most once/day per base
// currency; never blocks transaction entry on network success.
import { eq } from 'drizzle-orm';
import type { Database } from '../db/client';
import { currencies, exchangeRatesCache } from '../db/schema';
import { convertAmountMinor } from '../utils/money';
import { BUNDLED_FALLBACK_RATES, BUNDLED_RATES_GENERATED_AT } from './bundledRates';

const FX_API_BASE_URL = process.env.EXPO_PUBLIC_FX_API_BASE_URL ?? 'https://api.frankfurter.dev/v1';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface FxApiResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

export interface RateLookup {
  rate: number;
  /** 'live' = just fetched, 'cached' = from exchange_rates_cache, 'bundled' = static fallback table */
  source: 'live' | 'cached' | 'bundled';
  fetchedAt: string;
}

async function fetchLatestRates(baseCode: string): Promise<FxApiResponse | null> {
  try {
    const res = await fetch(`${FX_API_BASE_URL}/latest?base=${encodeURIComponent(baseCode)}`);
    if (!res.ok) return null;
    return (await res.json()) as FxApiResponse;
  } catch {
    return null;
  }
}

async function getCachedRate(
  db: Database,
  baseCode: string,
  targetCode: string,
): Promise<{ rate: number; fetchedAt: string } | null> {
  const rows = await db
    .select()
    .from(exchangeRatesCache)
    .where(eq(exchangeRatesCache.baseCurrencyCode, baseCode));
  const row = rows.find((r) => r.targetCurrencyCode === targetCode);
  return row ? { rate: row.rate, fetchedAt: row.fetchedAt } : null;
}

async function upsertRates(db: Database, baseCode: string, rates: Record<string, number>, fetchedAt: string): Promise<void> {
  for (const [targetCode, rate] of Object.entries(rates)) {
    await db
      .insert(exchangeRatesCache)
      .values({ baseCurrencyCode: baseCode, targetCurrencyCode: targetCode, rate, fetchedAt })
      .onConflictDoUpdate({
        target: [exchangeRatesCache.baseCurrencyCode, exchangeRatesCache.targetCurrencyCode],
        set: { rate, fetchedAt },
      });
  }
}

/**
 * Refreshes cached rates for `baseCode` if the cache is stale (>1 day old)
 * or absent. Silent no-op on any network failure — callers never need to
 * handle a rejected promise here (docs/API_DESIGN.md §2).
 */
export async function refreshRatesIfStale(db: Database, baseCode: string, now: Date = new Date()): Promise<void> {
  const anyCached = await db
    .select()
    .from(exchangeRatesCache)
    .where(eq(exchangeRatesCache.baseCurrencyCode, baseCode))
    .limit(1);

  if (anyCached.length > 0) {
    const fetchedAt = new Date(anyCached[0]!.fetchedAt).getTime();
    if (now.getTime() - fetchedAt < ONE_DAY_MS) return;
  }

  const response = await fetchLatestRates(baseCode);
  if (!response) return;
  await upsertRates(db, baseCode, response.rates, now.toISOString());
}

/**
 * Resolves the rate for 1 unit of `fromCode` -> `toCode`, trying cache in
 * both directions before falling back to the bundled static table
 * (docs/PRD.md §15 edge case: no cached rate -> mark as approximate).
 * Returns null only if `fromCode === toCode` is false and no rate can be
 * found anywhere, which callers must treat as "not converted"
 * (docs/DATABASE_SCHEMA.md `transactions.base_amount_minor` NULLABLE note).
 */
export async function getRate(db: Database, fromCode: string, toCode: string): Promise<RateLookup | null> {
  if (fromCode === toCode) {
    return { rate: 1, source: 'live', fetchedAt: new Date().toISOString() };
  }

  const direct = await getCachedRate(db, fromCode, toCode);
  if (direct) return { rate: direct.rate, source: 'cached', fetchedAt: direct.fetchedAt };

  const inverse = await getCachedRate(db, toCode, fromCode);
  if (inverse && inverse.rate !== 0) {
    return { rate: 1 / inverse.rate, source: 'cached', fetchedAt: inverse.fetchedAt };
  }

  const bundled = BUNDLED_FALLBACK_RATES[fromCode]?.[toCode];
  if (bundled) {
    return { rate: bundled, source: 'bundled', fetchedAt: BUNDLED_RATES_GENERATED_AT };
  }
  const bundledInverse = BUNDLED_FALLBACK_RATES[toCode]?.[fromCode];
  if (bundledInverse && bundledInverse !== 0) {
    return { rate: 1 / bundledInverse, source: 'bundled', fetchedAt: BUNDLED_RATES_GENERATED_AT };
  }

  return null;
}

export interface ConversionResult {
  baseAmountMinor: number | null;
  baseCurrencyCode: string;
  approximate: boolean;
}

/** Converts an amount into `baseCode`, snapshotting the result at call time (never live-recomputed later). */
export async function convertToBase(
  db: Database,
  amountMinor: number,
  fromCode: string,
  baseCode: string,
): Promise<ConversionResult> {
  const [fromCurrency, baseCurrency] = await Promise.all([
    db.select().from(currencies).where(eq(currencies.code, fromCode)).limit(1),
    db.select().from(currencies).where(eq(currencies.code, baseCode)).limit(1),
  ]);
  const fromDecimals = fromCurrency[0]?.decimalDigits ?? 2;
  const baseDecimals = baseCurrency[0]?.decimalDigits ?? 2;

  const lookup = await getRate(db, fromCode, baseCode);
  if (!lookup) {
    return { baseAmountMinor: null, baseCurrencyCode: baseCode, approximate: true };
  }
  const baseAmountMinor = convertAmountMinor(amountMinor, lookup.rate, fromDecimals, baseDecimals);
  return { baseAmountMinor, baseCurrencyCode: baseCode, approximate: lookup.source !== 'live' };
}
