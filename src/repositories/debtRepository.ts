// DebtRepository (docs/API_DESIGN.md §1). Goals and debts are a Pro-only
// feature in full (docs/MONETIZATION.md "Pro unlock: Goals and debts") —
// `create()` is the enforcement point, same pattern as GoalRepository.
// A debt's remaining balance is always computed from its payment history,
// never stored as a redundant total (docs/CLAUDE.md §10).
import { eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { getDb } from '../db/client';
import { accounts, debtPayments, debts } from '../db/schema';
import {
  debtInputSchema,
  debtPaymentInputSchema,
  debtUpdateSchema,
  type DebtInput,
  type DebtPaymentInput,
  type DebtUpdateInput,
} from '../schemas/debt';
import { NotFoundError, PaywallRequiredError, ValidationError } from '../types/errors';
import * as settingsRepository from './settingsRepository';

export type Debt = typeof debts.$inferSelect;
export type DebtPayment = typeof debtPayments.$inferSelect;

async function assertProForDebts(): Promise<void> {
  const settings = await settingsRepository.get();
  if (!settings.isPro) {
    throw new PaywallRequiredError('debts', 'Debts require Pro.');
  }
}

async function assertAccountExists(accountId: string): Promise<void> {
  const db = getDb();
  const [row] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  if (!row) throw new NotFoundError('Account', accountId);
}

export async function create(input: DebtInput): Promise<Debt> {
  const parsed = debtInputSchema.parse(input);
  await assertProForDebts();
  await assertAccountExists(parsed.accountId);

  const db = getDb();
  const now = new Date().toISOString();
  const [row] = await db
    .insert(debts)
    .values({
      id: randomUUID(),
      counterpartyName: parsed.counterpartyName,
      direction: parsed.direction,
      principalAmountMinor: parsed.principalAmountMinor,
      currencyCode: parsed.currencyCode,
      accountId: parsed.accountId,
      isSettled: false,
      notes: parsed.notes ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!row) throw new ValidationError('Failed to create debt');
  return row;
}

export async function update(id: string, input: DebtUpdateInput): Promise<Debt> {
  const parsed = debtUpdateSchema.parse(input);
  if (parsed.accountId) await assertAccountExists(parsed.accountId);
  const db = getDb();
  const [row] = await db
    .update(debts)
    .set({ ...parsed, updatedAt: new Date().toISOString() })
    .where(eq(debts.id, id))
    .returning();
  if (!row) throw new NotFoundError('Debt', id);
  return row;
}

export async function deleteDebt(id: string): Promise<void> {
  const db = getDb();
  const result = await db.delete(debts).where(eq(debts.id, id)).returning({ id: debts.id });
  if (result.length === 0) throw new NotFoundError('Debt', id);
}

export async function list(includeSettled = false): Promise<Debt[]> {
  const db = getDb();
  const rows = await db.select().from(debts).orderBy(debts.createdAt);
  return includeSettled ? rows : rows.filter((d) => !d.isSettled);
}

export async function getPayments(debtId: string): Promise<DebtPayment[]> {
  const db = getDb();
  return db.select().from(debtPayments).where(eq(debtPayments.debtId, debtId)).orderBy(debtPayments.occurredAt);
}

export async function getRemainingBalance(debtId: string): Promise<number> {
  const db = getDb();
  const [debt] = await db.select().from(debts).where(eq(debts.id, debtId)).limit(1);
  if (!debt) throw new NotFoundError('Debt', debtId);

  const rows = await db
    .select({ amountMinor: debtPayments.amountMinor })
    .from(debtPayments)
    .where(eq(debtPayments.debtId, debtId));
  const paidMinor = rows.reduce((sum, r) => sum + r.amountMinor, 0);
  return Math.max(0, debt.principalAmountMinor - paidMinor);
}

export async function addPayment(debtId: string, input: DebtPaymentInput): Promise<void> {
  const parsed = debtPaymentInputSchema.parse(input);
  const db = getDb();
  const [debt] = await db.select().from(debts).where(eq(debts.id, debtId)).limit(1);
  if (!debt) throw new NotFoundError('Debt', debtId);

  const remaining = await getRemainingBalance(debtId);
  if (parsed.amountMinor > remaining) {
    throw new ValidationError(
      `A payment can't exceed what's outstanding (${remaining}). Edit the original amount if the debt was larger than recorded.`,
    );
  }

  await db.insert(debtPayments).values({
    id: randomUUID(),
    debtId,
    transactionId: parsed.transactionId ?? null,
    amountMinor: parsed.amountMinor,
    occurredAt: parsed.occurredAt,
  });

  if (remaining - parsed.amountMinor === 0) {
    await db.update(debts).set({ isSettled: true, updatedAt: new Date().toISOString() }).where(eq(debts.id, debtId));
  }
}

export async function markSettled(debtId: string): Promise<void> {
  const db = getDb();
  const result = await db
    .update(debts)
    .set({ isSettled: true, updatedAt: new Date().toISOString() })
    .where(eq(debts.id, debtId))
    .returning({ id: debts.id });
  if (result.length === 0) throw new NotFoundError('Debt', debtId);
}

/** Not in API_DESIGN.md's original signature list, but needed by the
 * designed "Reopen this debt" button (docs/design_system/templates/
 * spendtr-app/debts.jsx `DebtDetailScreen`) — the natural counterpart to
 * markSettled(), same pattern as RecurringTransactionRepository's
 * deactivate()/reactivate() pair. */
export async function reopen(debtId: string): Promise<void> {
  const db = getDb();
  const result = await db
    .update(debts)
    .set({ isSettled: false, updatedAt: new Date().toISOString() })
    .where(eq(debts.id, debtId))
    .returning({ id: debts.id });
  if (result.length === 0) throw new NotFoundError('Debt', debtId);
}

export { deleteDebt as delete };
