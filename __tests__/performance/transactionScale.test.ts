// Data-layer scale smoke test for docs/TESTING_STRATEGY.md §5a NFR7
// ("Transaction list scroll: 60fps sustained with at least 5,000 seeded
// transactions"). This does NOT measure frame rate — that requires a real
// device/profiler, which this environment doesn't have — but it does prove
// the query layer underneath the FlashList-virtualized Home ledger
// (app/(tabs)/index.tsx) doesn't itself become the bottleneck at the
// target scale. If this were slow, no amount of list virtualization on
// the UI side would save it.
//
// Seeds via a single bulk `insert` straight against the schema, not 5,000
// sequential transactionRepository.create() calls: the point of this suite
// is to measure the *read* path (list/getMonthlySummary/getRunningBalance)
// at scale, and the repository's own per-row validation/conversion
// overhead on the *write* path (already covered by
// __tests__/repositories/transactionRepository.test.ts) was making this
// file itself the slowest thing in the suite (~130s) for no benefit to
// what it's actually asserting. One seed, shared read-only across all
// three tests via beforeAll, not re-seeded per test.
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { transactions } from '@/db/schema';
import * as accountRepository from '@/repositories/accountRepository';
import * as transactionRepository from '@/repositories/transactionRepository';
import * as settingsRepository from '@/repositories/settingsRepository';
import { setUpSeededDb, tearDown } from '../repositories/testSetup';

const SEED_COUNT = 5000;

describe('transaction scale (NFR7 data-layer smoke test)', () => {
  let accountId: string;

  beforeAll(async () => {
    await setUpSeededDb();
    await settingsRepository.get('USD');
    const account = await accountRepository.create({ name: 'Cash', currencyCode: 'USD', icon: 'cash', color: '#22C55E' });
    accountId = account.id;

    const now = new Date().toISOString();
    const start = new Date('2020-01-01T00:00:00.000Z').getTime();
    const rows = Array.from({ length: SEED_COUNT }, (_, i) => {
      const type = i % 5 === 0 ? ('income' as const) : ('expense' as const);
      const amountMinor = 100 + (i % 9000);
      return {
        id: randomUUID(),
        accountId,
        type,
        transferAccountId: null,
        amountMinor,
        currencyCode: 'USD',
        baseAmountMinor: amountMinor, // USD is the base currency here, so it's a 1:1 snapshot
        baseCurrencyCode: 'USD',
        categoryId: null,
        isSplit: false,
        note: i % 3 === 0 ? `note ${i}` : null,
        occurredAt: new Date(start + i * 3600 * 1000).toISOString().slice(0, 10),
        recurringTransactionId: null,
        createdAt: now,
        updatedAt: now,
      };
    });

    const db = getDb();
    const BATCH = 500; // SQLite's default bound-parameter ceiling makes one giant insert riskier than a handful of batches
    // One transaction around all batches, not one commit (fsync) per batch —
    // better-sqlite3 is fast at bulk writes specifically when they share a
    // transaction; without this the 10 batches took ~55s, all in commit
    // overhead, not the inserts themselves. better-sqlite3 is a synchronous
    // driver, so its transaction callback must be synchronous too (drizzle
    // throws "Transaction function cannot return a promise" otherwise).
    db.transaction((tx) => {
      for (let i = 0; i < rows.length; i += BATCH) {
        tx.insert(transactions).values(rows.slice(i, i + BATCH)).run();
      }
    });
  }, 30000);

  afterAll(tearDown);

  test(`seeded exactly ${SEED_COUNT} rows for this account`, async () => {
    const db = getDb();
    const count = await db.select({ id: transactions.id }).from(transactions).where(eq(transactions.accountId, accountId));
    expect(count).toHaveLength(SEED_COUNT);
  });

  test(`list() returns all ${SEED_COUNT} rows in well under a second`, async () => {
    const start = performance.now();
    const rows = await transactionRepository.list();
    const elapsedMs = performance.now() - start;
    expect(rows).toHaveLength(SEED_COUNT);
    expect(elapsedMs).toBeLessThan(1000);
  });

  test('getMonthlySummary() stays fast against the full 5,000-row table', async () => {
    const start = performance.now();
    const summary = await transactionRepository.getMonthlySummary('2020-01');
    const elapsedMs = performance.now() - start;
    expect(summary.totalExpenseBaseMinor).toBeGreaterThan(0);
    expect(elapsedMs).toBeLessThan(500);
  });

  test('getRunningBalance() over 12 months stays fast against the full 5,000-row table', async () => {
    const start = performance.now();
    const history = await accountRepository.getRunningBalance(accountId, 12);
    const elapsedMs = performance.now() - start;
    expect(history).toHaveLength(12);
    expect(elapsedMs).toBeLessThan(2000);
  });
});
