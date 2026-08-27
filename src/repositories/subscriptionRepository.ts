// SubscriptionRepository (docs/API_DESIGN.md §1). Renewal-date math lives
// here (src/utils/date.ts advanceByBillingCycle), not scattered in UI code
// (docs/DATABASE_SCHEMA.md `recurring_subscriptions` business rules).
import { and, eq, gte, lte } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { getDb } from '../db/client';
import { currencies, recurringSubscriptions } from '../db/schema';
import {
  subscriptionInputSchema,
  subscriptionUpdateSchema,
  type SubscriptionInput,
  type SubscriptionUpdateInput,
} from '../schemas/subscription';
import * as notifications from '../services/notifications';
import { NotFoundError, PaywallRequiredError, ValidationError } from '../types/errors';
import { advanceByBillingCycle, todayIsoDate } from '../utils/date';
import * as settingsRepository from './settingsRepository';

export type Subscription = typeof recurringSubscriptions.$inferSelect;

const FREE_TIER_ACTIVE_SUBSCRIPTION_LIMIT = 5;

async function assertCurrencyExists(code: string): Promise<void> {
  const db = getDb();
  const [row] = await db.select().from(currencies).where(eq(currencies.code, code)).limit(1);
  if (!row) throw new ValidationError(`Unknown currency code: ${code}`);
}

async function scheduleReminderFor(sub: Subscription): Promise<void> {
  if (!sub.isActive) {
    await notifications.cancelRenewalReminder(sub.id);
    return;
  }
  await notifications.scheduleRenewalReminder({
    id: sub.id,
    name: sub.name,
    nextRenewalDate: sub.nextRenewalDate,
    reminderDaysBefore: sub.reminderDaysBefore,
  });
}

export async function create(input: SubscriptionInput): Promise<Subscription> {
  const parsed = subscriptionInputSchema.parse(input);
  await assertCurrencyExists(parsed.currencyCode);

  const settings = await settingsRepository.get();
  if (!settings.isPro) {
    const db = getDb();
    const activeCount = await db
      .select({ id: recurringSubscriptions.id })
      .from(recurringSubscriptions)
      .where(eq(recurringSubscriptions.isActive, true));
    if (activeCount.length >= FREE_TIER_ACTIVE_SUBSCRIPTION_LIMIT) {
      throw new PaywallRequiredError(
        'subscription_limit',
        `Free tier is limited to ${FREE_TIER_ACTIVE_SUBSCRIPTION_LIMIT} active subscriptions. Upgrade to Pro for unlimited subscriptions.`,
      );
    }
  }

  const db = getDb();
  const now = new Date().toISOString();
  const [row] = await db
    .insert(recurringSubscriptions)
    .values({
      id: randomUUID(),
      name: parsed.name,
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
  if (!row) throw new ValidationError('Failed to create subscription');

  await scheduleReminderFor(row);
  return row;
}

export async function update(id: string, input: SubscriptionUpdateInput): Promise<Subscription> {
  const parsed = subscriptionUpdateSchema.parse(input);
  if (parsed.currencyCode) await assertCurrencyExists(parsed.currencyCode);

  const db = getDb();
  const [existing] = await db.select().from(recurringSubscriptions).where(eq(recurringSubscriptions.id, id)).limit(1);
  if (!existing) throw new NotFoundError('Subscription', id);

  const [row] = await db
    .update(recurringSubscriptions)
    .set({ ...parsed, updatedAt: new Date().toISOString() })
    .where(eq(recurringSubscriptions.id, id))
    .returning();
  if (!row) throw new NotFoundError('Subscription', id);

  const renewalRelevantChange =
    parsed.nextRenewalDate !== undefined || parsed.reminderDaysBefore !== undefined;
  if (renewalRelevantChange) await scheduleReminderFor(row);

  return row;
}

export async function deactivate(id: string): Promise<void> {
  const db = getDb();
  const [row] = await db
    .update(recurringSubscriptions)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(eq(recurringSubscriptions.id, id))
    .returning();
  if (!row) throw new NotFoundError('Subscription', id);
  await notifications.cancelRenewalReminder(id);
}

export async function deleteSubscription(id: string): Promise<void> {
  const db = getDb();
  const result = await db
    .delete(recurringSubscriptions)
    .where(eq(recurringSubscriptions.id, id))
    .returning({ id: recurringSubscriptions.id });
  if (result.length === 0) throw new NotFoundError('Subscription', id);
  await notifications.cancelRenewalReminder(id);
}

export async function list(activeOnly?: boolean): Promise<Subscription[]> {
  const db = getDb();
  if (activeOnly) {
    return db.select().from(recurringSubscriptions).where(eq(recurringSubscriptions.isActive, true));
  }
  return db.select().from(recurringSubscriptions);
}

export async function getUpcoming(withinDays: number): Promise<Subscription[]> {
  const db = getDb();
  const today = todayIsoDate();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + withinDays);
  const horizonIso = horizon.toISOString().slice(0, 10);

  return db
    .select()
    .from(recurringSubscriptions)
    .where(
      and(
        eq(recurringSubscriptions.isActive, true),
        gte(recurringSubscriptions.nextRenewalDate, today),
        lte(recurringSubscriptions.nextRenewalDate, horizonIso),
      ),
    );
}

/** Internal: called after a renewal date passes to advance to the next cycle. */
export async function advanceRenewal(id: string): Promise<Subscription> {
  const db = getDb();
  const [existing] = await db.select().from(recurringSubscriptions).where(eq(recurringSubscriptions.id, id)).limit(1);
  if (!existing) throw new NotFoundError('Subscription', id);

  const nextRenewalDate = advanceByBillingCycle(existing.nextRenewalDate, existing.billingCycle);
  const [row] = await db
    .update(recurringSubscriptions)
    .set({ nextRenewalDate, updatedAt: new Date().toISOString() })
    .where(eq(recurringSubscriptions.id, id))
    .returning();
  if (!row) throw new NotFoundError('Subscription', id);

  await scheduleReminderFor(row);
  return row;
}

export { deleteSubscription as delete };
