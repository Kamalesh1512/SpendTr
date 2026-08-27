// Shared per-test DB bootstrap: fresh in-memory DB + currency/category seed.
import { createTestDb, teardownTestDb } from '../helpers/testDb';
import { runSeed } from '@/db/seed';
import type { Database } from '@/db/client';

export async function setUpSeededDb(): Promise<Database> {
  const db = createTestDb();
  await runSeed(db);
  return db;
}

export function tearDown(): void {
  teardownTestDb();
}
