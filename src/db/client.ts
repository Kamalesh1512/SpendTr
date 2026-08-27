// DB connection/instance. The real app opens expo-sqlite lazily on first
// use; tests inject an in-memory better-sqlite3 instance via
// setDbForTesting() (see __tests__/helpers/testDb.ts) — expo-sqlite must
// never be opened under Jest (see jest.setup.js).
import { drizzle } from 'drizzle-orm/expo-sqlite';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

export const DB_NAME = 'spendtr.db';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = BaseSQLiteDatabase<'sync', any, typeof schema>;

let dbInstance: Database | null = null;
let testDb: Database | null = null;

export function getDb(): Database {
  if (testDb) return testDb;
  if (!dbInstance) {
    const expoDb = openDatabaseSync(DB_NAME);
    dbInstance = drizzle(expoDb, { schema }) as unknown as Database;
  }
  return dbInstance;
}

/** Test-only hook: inject (or clear, by passing null) a database instance. */
export function setDbForTesting(db: Database | null): void {
  testDb = db;
}

/**
 * Real expo-sqlite instance, typed for drizzle-orm's `useMigrations` hook
 * (see src/hooks/useDatabaseReady.ts). Only ever called from the app root,
 * never under Jest.
 */
export function getExpoDbForMigrations(): ExpoSQLiteDatabase<typeof schema> {
  return getDb() as unknown as ExpoSQLiteDatabase<typeof schema>;
}
