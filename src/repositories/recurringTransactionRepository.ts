// RecurringTransactionRepository (docs/API_DESIGN.md §1). Renamed from
// subscriptionRepository.ts — recurring_transactions covers subscriptions,
// recurring bills, and recurring income under one mechanism
// (docs/DATABASE_SCHEMA.md). Renewal-date math lives here
// (src/utils/date.ts advanceByBillingCycle), not scattered in UI code.
import { and, eq, gte, lte } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { getDb } from '../db/client';
import { accounts, currencies, recurringTransactions } from '../db/schema';
import {
  recurringTransactionInputSchema,
  recurringTransactionUpdateSchema,
  type RecurringTransactionInput,
  type RecurringTransactionUpdateInput,
} from '../schemas/recurringTransaction';
import * as notifications from '../services/notifications';
import { NotFoundError, PaywallRequiredError, ValidationError } from '../types/errors';
import { advanceByBillingCycle, todayIsoDate } from '../utils/date';
import * as settingsRepository from './settingsRepository';

export type RecurringTransaction = typeof recurringTransactions.$inferSelect;

const FREE_TIER_ACTIVE_LIMIT = 5;

async function assertCurrencyExists(code: string): Promise<void> {
  const db = getDb();
  const [row] = await db.select().from(currencies).where(eq(currencies.code, code)).limit(1);
  if (!row) throw new ValidationError(`Unknown currency code: ${code}`);
}

async function assertAccountExists(accountId: string): Promise<void> {
  const db = getDb();
  const [row] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  if (!row) throw new NotFoundError('Account', accountId);
}

async function scheduleReminderFor(item: RecurringTransaction): Promise<void> {
  if (!item.isActive) {
    await notifications.cancelRenewalReminder(item.id);
    return;
  }
  await notifications.scheduleRenewalReminder({
    id: item.id,
    name: item.name,
    nextRenewalDate: item.nextRenewalDate,
    reminderDaysBefore: item.reminderDaysBefore,
  });
}

export async function create(input: RecurringTransactionInput): Promise<RecurringTransaction> {
  const parsed = recurringTransactionInputSchema.parse(input);
  await assertCurrencyExists(parsed.currencyCode);
  await assertAccountExists(parsed.accountId);

  const settings = await settingsRepository.get();
  if (!settings.isPro) {
    const db = getDb();
    const activeCount = await db
      .select({ id: recurringTransactions.id })
      .from(recurringTransactions)
      .where(eq(recurringTransactions.isActive, true));
    if (activeCount.length >= FREE_TIER_ACTIVE_LIMIT) {
      throw new PaywallRequiredError(
        'subscription_limit',
        `Free tier is limited to ${FREE_TIER_ACTIVE_LIMIT} active recurring transactions. Upgrade to Pro for unlimited recurring transactions.`,
      );
    }
  }

  const db = getDb();
  const now = new Date().toISOString();
  const [row] = await db
    .insert(recurringTransactions)
    .values({
      id: randomUUID(),
      kind: parsed.kind,
      name: parsed.name,
      accountId: parsed.accountId,
      amountMinor: parsed.amountMinor,
      currencyCode: parsed.currencyCode,
      billingCycle: parsed.billingCycle,
      nextRenewalDate: parsed.nextRenewalDate,
      categoryId: parsed.categoryId ?? null,
      reminderDaysBefore: parsed.reminderDaysBefore ?? 3,
      isActive: true,
      notes: null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!row) throw new ValidationError('Failed to create recurring transaction');

  await scheduleReminderFor(row);
  return row;
}

export async function update(
  id: string,
  input: RecurringTransactionUpdateInput,
): Promise<RecurringTransaction> {
  const parsed = recurringTransactionUpdateSchema.parse(input);
  if (parsed.currencyCode) await assertCurrencyExists(parsed.currencyCode);
  if (parsed.accountId) await assertAccountExists(parsed.accountId);

  const db = getDb();
  const [existing] = await db
    .select()
    .from(recurringTransactions)
    .where(eq(recurringTransactions.id, id))
    .limit(1);
  if (!existing) throw new NotFoundError('RecurringTransaction', id);

  const [row] = await db
    .update(recurringTransactions)
    .set({ ...parsed, updatedAt: new Date().toISOString() })
    .where(eq(recurringTransactions.id, id))
    .returning();
  if (!row) throw new NotFoundError('RecurringTransaction', id);

  const renewalRelevantChange =
    parsed.nextRenewalDate !== undefined || parsed.reminderDaysBefore !== undefined;
  if (renewalRelevantChange) await scheduleReminderFor(row);

  return row;
}

export async function deactivate(id: string): Promise<void> {
  const db = getDb();
  const [row] = await db
    .update(recurringTransactions)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(eq(recurringTransactions.id, id))
    .returning();
  if (!row) throw new NotFoundError('RecurringTransaction', id);
  await notifications.cancelRenewalReminder(id);
}

export async function reactivate(id: string): Promise<RecurringTransaction> {
  const db = getDb();

  const settings = await settingsRepository.get();
  if (!settings.isPro) {
    const activeCount = await db
      .select({ id: recurringTransactions.id })
      .from(recurringTransactions)
      .where(eq(recurringTransactions.isActive, true));
    if (activeCount.length >= FREE_TIER_ACTIVE_LIMIT) {
      throw new PaywallRequiredError(
        'subscription_limit',
        `Free tier is limited to ${FREE_TIER_ACTIVE_LIMIT} active recurring transactions. Upgrade to Pro for unlimited recurring transactions.`,
      );
    }
  }

  const [row] = await db
    .update(recurringTransactions)
    .set({ isActive: true, updatedAt: new Date().toISOString() })
    .where(eq(recurringTransactions.id, id))
    .returning();
  if (!row) throw new NotFoundError('RecurringTransaction', id);
  await scheduleReminderFor(row);
  return row;
}

export async function deleteRecurringTransaction(id: string): Promise<void> {
  const db = getDb();
  const result = await db
    .delete(recurringTransactions)
    .where(eq(recurringTransactions.id, id))
    .returning({ id: recurringTransactions.id });
  if (result.length === 0) throw new NotFoundError('RecurringTransaction', id);
  await notifications.cancelRenewalReminder(id);
}

export async function list(
  activeOnly?: boolean,
  kind?: 'subscription' | 'bill' | 'income',
): Promise<RecurringTransaction[]> {
  const db = getDb();
  const conditions = [];
  if (activeOnly) conditions.push(eq(recurringTransactions.isActive, true));
  if (kind) conditions.push(eq(recurringTransactions.kind, kind));
  if (conditions.length > 0) {
    return db
      .select()
      .from(recurringTransactions)
      .where(and(...conditions));
  }
  return db.select().from(recurringTransactions);
}

export async function getUpcoming(withinDays: number): Promise<RecurringTransaction[]> {
  const db = getDb();
  const today = todayIsoDate();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + withinDays);
  const horizonIso = horizon.toISOString().slice(0, 10);

  return db
    .select()
    .from(recurringTransactions)
    .where(
      and(
        eq(recurringTransactions.isActive, true),
        gte(recurringTransactions.nextRenewalDate, today),
        lte(recurringTransactions.nextRenewalDate, horizonIso),
      ),
    );
}

/** Internal: called after a renewal date passes to advance to the next cycle. */
export async function advanceRenewal(id: string): Promise<RecurringTransaction> {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(recurringTransactions)
    .where(eq(recurringTransactions.id, id))
    .limit(1);
  if (!existing) throw new NotFoundError('RecurringTransaction', id);

  const nextRenewalDate = advanceByBillingCycle(existing.nextRenewalDate, existing.billingCycle);
  const [row] = await db
    .update(recurringTransactions)
    .set({ nextRenewalDate, updatedAt: new Date().toISOString() })
    .where(eq(recurringTransactions.id, id))
    .returning();
  if (!row) throw new NotFoundError('RecurringTransaction', id);

  await scheduleReminderFor(row);
  return row;
}

export { deleteRecurringTransaction as delete };
