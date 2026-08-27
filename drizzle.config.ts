import type { Config } from 'drizzle-kit';

// Generates SQL migrations from src/db/schema.ts into src/db/migrations/.
// `driver: 'expo'` additionally emits a migrations.js bundle that the app
// imports at runtime (see src/db/client.ts). Never hand-write ALTER TABLE
// in app code — see docs/DATABASE_SCHEMA.md.
export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  driver: 'expo',
} satisfies Config;
