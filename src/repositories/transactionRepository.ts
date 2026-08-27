// TransactionRepository (docs/API_DESIGN.md §1). All money math funnels
// through src/services/currency.ts; free-tier multi-currency gating is
// enforced here (docs/MONETIZATION.md).
import { and, desc, eq, gte, lte, ne, sql } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { getDb } from '../db/client';
import { currencies, transactions } from '../db/schema';
import {
  transactionInputSchema,
  transactionUpdateSchema,
  type TransactionInput,
  type TransactionUpdateInput,
} from '../schemas/transaction';
import { convertToBase } from '../services/currency';
import { NotFoundError, PaywallRequiredError, ValidationError } from '../types/errors';
import { isValidOccurredAt } from '../utils/date';
import * as settingsRepository from './settingsRepository';

export type Transaction = typeof transactions.$inferSelect;

async function assertCurrencyExists(code: string): Promise<void> {
  const db = getDb();
  const [row] = await db.select().from(currencies).where(eq(currencies.code, code)).limit(1);
  if (!row) throw new ValidationError(`Unknown currency code: ${code}`);
}

/**
 * Free tier: base currency only, or one additional non-base currency at a
 * time (docs/MONETIZATION.md). A free user may freely use their base
 * currency plus whichever single non-base currency they've already used;
 * a second *distinct* non-base currency requires Pro.
 */
async function assertCurrencyAllowedForFreeTier(currencyCode: string, baseCurrencyCode: string): Promise<void> {
  const db = getDb();
  const distinctNonBase = await db
    .selectDistinct({ code: transactions.currencyCode })
    .from(transactions)
    .where(ne(transactions.currencyCode, baseCurrencyCode));
  const usedNonBaseCodes = new Set(distinctNonBase.map((r) => r.code));
  if (usedNonBaseCodes.size >= 1 && !usedNonBaseCodes.has(currencyCode)) {
    throw new PaywallRequiredError(
      'multi_currency',
      'Free tier allows your base currency plus one other currency. Upgrade to Pro for unlimited currencies.',
    );
  }
}

export async function create(input: TransactionInput): Promise<Transaction> {
  const parsed = transactionInputSchema.parse(input);
  await assertCurrencyExists(parsed.currencyCode);
  if (!isValidOccurredAt(parsed.occurredAt)) {
    throw new ValidationError('occurredAt must be a valid date not in the future beyond today');
  }

  const settings = await settingsRepository.get(parsed.currencyCode);
  if (!settings.isPro && parsed.currencyCode !== settings.baseCurrencyCode) {
    await assertCurrencyAllowedForFreeTier(parsed.currencyCode, settings.baseCurrencyCode);
  }

  const db = getDb();
  const conversion = await convertToBase(db, parsed.amountMinor, parsed.currencyCode, settings.baseCurrencyCode);

  const now = new Date().toISOString();
  const [row] = await db
    .insert(transactions)
    .values({
      id: randomUUID(),
      type: parsed.type,
      amountMinor: parsed.amountMinor,
      currencyCode: parsed.currencyCode,
      baseAmountMinor: conversion.baseAmountMinor,
      baseCurrencyCode: conversion.baseCurrencyCode,
      categoryId: parsed.categoryId ?? null,
      note: parsed.note ?? null,
      occurredAt: parsed.occurredAt,
      recurringSubscriptionId: parsed.recurringSubscriptionId ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!row) throw new ValidationError('Failed to create transaction');
  return row;
}

export async function update(id: string, input: TransactionUpdateInput): Promise<Transaction> {
  const parsed = transactionUpdateSchema.parse(input);
  const db = getDb();
  const [existing] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  if (!existing) throw new NotFoundError('Transaction', id);

  if (parsed.occurredAt && !isValidOccurredAt(parsed.occurredAt)) {
    throw new ValidationError('occurredAt must be a valid date not in the future beyond today');
  }
  if (parsed.currencyCode) await assertCurrencyExists(parsed.currencyCode);

  const amountOrCurrencyChanged =
    (parsed.amountMinor !== undefined && parsed.amountMinor !== existing.amountMinor) ||
    (parsed.currencyCode !== undefined && parsed.currencyCode !== existing.currencyCode);

  let baseAmountMinor = existing.baseAmountMinor;
  let baseCurrencyCode = existing.baseCurrencyCode;

  if (amountOrCurrencyChanged) {
    const nextAmountMinor = parsed.amountMinor ?? existing.amountMinor;
    const nextCurrencyCode = parsed.currencyCode ?? existing.currencyCode;
    const settings = await settingsRepository.get();
    const conversion = await convertToBase(db, nextAmountMinor, nextCurrencyCode, settings.baseCurrencyCode);
    baseAmountMinor = conversion.baseAmountMinor;
    baseCurrencyCode = conversion.baseCurrencyCode;
  }

  const [row] = await db
    .update(transactions)
    .set({ ...parsed, baseAmountMinor, baseCurrencyCode, updatedAt: new Date().toISOString() })
    .where(eq(transactions.id, id))
    .returning();
  if (!row) throw new NotFoundError('Transaction', id);
  return row;
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = getDb();
  const result = await db.delete(transactions).where(eq(transactions.id, id)).returning({ id: transactions.id });
  if (result.length === 0) throw new NotFoundError('Transaction', id);
}

export async function list(filters?: {
  from?: string;
  to?: string;
  categoryId?: string;
  type?: 'expense' | 'income';
}): Promise<Transaction[]> {
  const db = getDb();
  const conditions = [];
  if (filters?.from) conditions.push(gte(transactions.occurredAt, filters.from));
  if (filters?.to) conditions.push(lte(transactions.occurredAt, filters.to));
  if (filters?.categoryId) conditions.push(eq(transactions.categoryId, filters.categoryId));
  if (filters?.type) conditions.push(eq(transactions.type, filters.type));

  if (conditions.length > 0) {
    return db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.occurredAt));
  }
  return db.select().from(transactions).orderBy(desc(transactions.occurredAt));
}

export async function getById(id: string): Promise<Transaction | null> {
  const db = getDb();
  const [row] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  return row ?? null;
}

export async function getMonthlySummary(month: string): Promise<{
  totalExpenseBaseMinor: number;
  totalIncomeBaseMinor: number;
  byCategory: Array<{ categoryId: string; totalBaseMinor: number }>;
}> {
  const db = getDb();
  const rows = await db.select().from(transactions).where(sql`substr(${transactions.occurredAt}, 1, 7) = ${month}`);

  let totalExpenseBaseMinor = 0;
  let totalIncomeBaseMinor = 0;
  const byCategoryMap = new Map<string, number>();

  for (const row of rows) {
    if (row.baseAmountMinor == null) continue;
    if (row.type === 'expense') {
      totalExpenseBaseMinor += row.baseAmountMinor;
      if (row.categoryId) {
        byCategoryMap.set(row.categoryId, (byCategoryMap.get(row.categoryId) ?? 0) + row.baseAmountMinor);
      }
    } else {
      totalIncomeBaseMinor += row.baseAmountMinor;
    }
  }

  return {
    totalExpenseBaseMinor,
    totalIncomeBaseMinor,
    byCategory: Array.from(byCategoryMap.entries()).map(([categoryId, totalBaseMinor]) => ({
      categoryId,
      totalBaseMinor,
    })),
  };
}

export { deleteTransaction as delete };
