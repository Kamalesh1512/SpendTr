// First-launch seed: currencies + default categories. Idempotent — safe to
// call on every app start (see app/_layout.tsx). Does not create
// user_settings; SettingsRepository.get() creates that row on first call
// (docs/API_DESIGN.md SettingsRepository).
import { eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import type { Database } from './client';
import { categories, currencies } from './schema';
import { CATEGORY_SEED } from './seedData/categories';
import { CURRENCY_SEED } from './seedData/currencies';

export async function runSeed(db: Database): Promise<void> {
  const existingCurrencies = await db.select({ code: currencies.code }).from(currencies).limit(1);
  if (existingCurrencies.length === 0) {
    await db.insert(currencies).values(CURRENCY_SEED);
  }

  const now = new Date().toISOString();
  const existingDefaultNames = new Set(
    (await db.select({ name: categories.name }).from(categories).where(eq(categories.isDefault, true))).map(
      (c) => c.name,
    ),
  );
  // Runs on every launch (not just first-ever seed) so a default category
  // added in a later app update reaches installs that already seeded their
  // database — matched by name, so a user's own edits/renames aren't
  // touched and nothing is inserted twice.
  const missing = CATEGORY_SEED.filter((c) => !existingDefaultNames.has(c.name));
  if (missing.length > 0) {
    await db.insert(categories).values(
      missing.map((c) => ({
        id: randomUUID(),
        name: c.name,
        icon: c.icon,
        iconType: c.iconType,
        color: c.color,
        type: c.type,
        isDefault: true,
        sortOrder: c.sortOrder,
        createdAt: now,
      })),
    );
  }
}
