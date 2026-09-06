// Shared per-test DB bootstrap: fresh in-memory DB + currency/category seed.
import { createTestDb, teardownTestDb } from '../helpers/testDb';
import { runSeed } from '@/db/seed';
import type { Database } from '@/db/client';
import * as accountRepository from '@/repositories/accountRepository';
import type { Account } from '@/repositories/accountRepository';

export async function setUpSeededDb(): Promise<Database> {
  const db = createTestDb();
  await runSeed(db);
  return db;
}

/**
 * Every transaction/recurring-transaction now requires an accountId
 * (docs/DATABASE_SCHEMA.md `transactions`, `recurring_transactions`), but
 * accounts are created during onboarding, not by runSeed(). Tests that
 * exercise those repositories call this after setUpSeededDb().
 */
export async function seedTestAccount(currencyCode = 'USD'): Promise<Account> {
  return accountRepository.create({
    name: 'Cash',
    currencyCode,
    icon: 'cash',
    color: '#22C55E',
  });
}

export function tearDown(): void {
  teardownTestDb();
}
