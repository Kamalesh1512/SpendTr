// First-launch seed: currencies + default categories. Idempotent — safe to
// call on every app start (see app/_layout.tsx). Does not create
// user_settings; SettingsRepository.get() creates that row on first call
// (docs/API_DESIGN.md SettingsRepository).
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

  const existingCategories = await db.select({ id: categories.id }).from(categories).limit(1);
  if (existingCategories.length === 0) {
    const now = new Date().toISOString();
    await db.insert(categories).values(
      CATEGORY_SEED.map((c) => ({
        id: randomUUID(),
        name: c.name,
        icon: c.icon,
        color: c.color,
        type: c.type,
        isDefault: true,
        sortOrder: c.sortOrder,
        createdAt: now,
      })),
    );
  }
}
