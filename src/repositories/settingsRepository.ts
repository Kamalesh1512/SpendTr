// SettingsRepository (docs/API_DESIGN.md §1). Single-row table
// (docs/DATABASE_SCHEMA.md `user_settings`); get() creates the row with
// defaults on first call if absent.
import { eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import { userSettings } from '../db/schema';
import { ValidationError } from '../types/errors';

export type UserSettings = typeof userSettings.$inferSelect;
export type UserSettingsUpdateInput = Partial<
  Pick<
    UserSettings,
    | 'baseCurrencyCode'
    | 'biometricLockEnabled'
    | 'theme'
    | 'accentColor'
    | 'notificationsEnabled'
    | 'onboardingComplete'
    | 'isPro'
    | 'proRestoreLinked'
    | 'hideAmountsInSwitcher'
  >
>;

const SETTINGS_ROW_ID = 1;

async function createDefaultSettings(defaultBaseCurrencyCode: string): Promise<UserSettings> {
  const db = getDb();
  const now = new Date().toISOString();
  // onConflictDoNothing + re-select, not a plain insert: get() is called
  // from every useSettings() mount across the app, so on first launch
  // (empty user_settings table) multiple callers can each see "no row"
  // and race to insert id=1 — a plain insert makes the loser crash with a
  // UNIQUE constraint violation instead of just reading what the winner
  // wrote.
  const [row] = await db
    .insert(userSettings)
    .values({
      id: SETTINGS_ROW_ID,
      baseCurrencyCode: defaultBaseCurrencyCode,
      biometricLockEnabled: false,
      theme: 'system',
      accentColor: 'default',
      notificationsEnabled: true,
      onboardingComplete: false,
      isPro: false,
      proRestoreLinked: false,
      hideAmountsInSwitcher: false,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .returning();
  if (row) return row;

  const [existing] = await db.select().from(userSettings).where(eq(userSettings.id, SETTINGS_ROW_ID)).limit(1);
  if (!existing) throw new ValidationError('Failed to create default user_settings row');
  return existing;
}

export async function get(defaultBaseCurrencyCode = 'USD'): Promise<UserSettings> {
  const db = getDb();
  const rows = await db.select().from(userSettings).where(eq(userSettings.id, SETTINGS_ROW_ID)).limit(1);
  if (rows[0]) return rows[0];
  return createDefaultSettings(defaultBaseCurrencyCode);
}

export async function update(input: UserSettingsUpdateInput): Promise<UserSettings> {
  const db = getDb();
  await get(); // ensure the row exists first
  const [row] = await db
    .update(userSettings)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(eq(userSettings.id, SETTINGS_ROW_ID))
    .returning();
  if (!row) throw new ValidationError('Failed to update user_settings row');
  return row;
}
