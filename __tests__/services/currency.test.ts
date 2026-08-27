import { convertToBase, getRate } from '@/services/currency';
import { exchangeRatesCache } from '@/db/schema';
import { createTestDb, teardownTestDb } from '../helpers/testDb';
import { runSeed } from '@/db/seed';
import type { Database } from '@/db/client';

describe('currency service', () => {
  let db: Database;

  beforeEach(async () => {
    db = createTestDb();
    await runSeed(db);
  });
  afterEach(() => teardownTestDb());

  test('getRate returns 1 for same-currency conversion', async () => {
    const rate = await getRate(db, 'USD', 'USD');
    expect(rate?.rate).toBe(1);
  });

  test('getRate uses a cached direct rate when present', async () => {
    await db.insert(exchangeRatesCache).values({
      baseCurrencyCode: 'USD',
      targetCurrencyCode: 'EUR',
      rate: 0.9,
      fetchedAt: new Date().toISOString(),
    });
    const rate = await getRate(db, 'USD', 'EUR');
    expect(rate).toEqual(expect.objectContaining({ rate: 0.9, source: 'cached' }));
  });

  test('getRate derives the inverse from a cached opposite-direction rate', async () => {
    await db.insert(exchangeRatesCache).values({
      baseCurrencyCode: 'USD',
      targetCurrencyCode: 'EUR',
      rate: 0.5,
      fetchedAt: new Date().toISOString(),
    });
    const rate = await getRate(db, 'EUR', 'USD');
    expect(rate?.rate).toBeCloseTo(2);
    expect(rate?.source).toBe('cached');
  });

  test('getRate falls back to the bundled static table when nothing is cached', async () => {
    const rate = await getRate(db, 'USD', 'EUR');
    expect(rate?.source).toBe('bundled');
    expect(rate?.rate).toBeGreaterThan(0);
  });

  test('convertToBase marks the result approximate when not using a live rate', async () => {
    const result = await convertToBase(db, 1000, 'USD', 'EUR');
    expect(result.baseAmountMinor).not.toBeNull();
    expect(result.approximate).toBe(true);
  });

  test('convertToBase returns null baseAmountMinor when no rate can be found at all', async () => {
    // XXX isn't in the seed set or the bundled fallback table.
    const result = await convertToBase(db, 1000, 'XXX', 'USD');
    expect(result.baseAmountMinor).toBeNull();
    expect(result.approximate).toBe(true);
  });
});
