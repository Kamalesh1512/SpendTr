// Creates an isolated in-memory SQLite database for repository/service
// tests and wires it into src/db/client.ts via setDbForTesting(), so
// repositories under test run real SQL without ever touching expo-sqlite.
import BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';
import type { Database } from '@/db/client';
import { setDbForTesting } from '@/db/client';
import * as schema from '@/db/schema';

export function createTestDb(): Database {
  const sqlite = new BetterSqlite3(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema }) as unknown as Database;
  migrate(db as unknown as Parameters<typeof migrate>[0], {
    migrationsFolder: path.join(__dirname, '../../src/db/migrations'),
  });
  setDbForTesting(db);
  return db;
}

export function teardownTestDb(): void {
  setDbForTesting(null);
}
