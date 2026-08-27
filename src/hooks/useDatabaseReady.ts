// Runs pending Drizzle migrations then the first-launch seed
// (docs/DATABASE_SCHEMA.md, src/db/seed.ts). Mounted once at the app root
// (app/_layout.tsx) — no screen renders until this resolves.
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect, useState } from 'react';
import { getDb, getExpoDbForMigrations } from '../db/client';
import { runSeed } from '../db/seed';
import migrations from '../db/migrations/migrations';

export function useDatabaseReady(): { ready: boolean; error: Error | null } {
  const { success, error: migrationError } = useMigrations(getExpoDbForMigrations(), migrations);
  const [seeded, setSeeded] = useState(false);
  const [seedError, setSeedError] = useState<Error | null>(null);

  useEffect(() => {
    if (!success) return;
    runSeed(getDb())
      .then(() => setSeeded(true))
      .catch((err: Error) => setSeedError(err));
  }, [success]);

  return {
    ready: success && seeded,
    error: migrationError ?? seedError,
  };
}
