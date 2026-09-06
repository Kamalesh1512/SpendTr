// TransactionRepository (docs/API_DESIGN.md §1). All money math funnels
// through src/services/currency.ts; free-tier multi-currency gating is
// enforced here (docs/MONETIZATION.md).
import { and, desc, eq, gte, inArray, lte, ne, or, sql } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { getDb } from '../db/client';
import { accounts, categories, currencies, transactionSplits, transactions } from '../db/schema';
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

export type Transaction = typeof transactions.$inferSelect & { splitCount?: number };
export type TransactionSplit = typeof transactionSplits.$inferSelect;

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

/**
 * Split amounts must sum exactly to the parent transaction's amount
 * (docs/CLAUDE.md §10) — enforced here, not just in the UI, since the split
 * sheet is only a convenience over this guarantee.
 */
function assertSplitsSumToAmount(amountMinor: number, splits: { amountMinor: number }[] | undefined): void {
  if (!splits) return;
  const sum = splits.reduce((total, s) => total + s.amountMinor, 0);
  if (sum !== amountMinor) {
    throw new ValidationError(`Split amounts (${sum}) must sum exactly to the transaction amount (${amountMinor}).`);
  }
}

/** Transaction splitting is a Pro feature (docs/MONETIZATION.md). */
async function assertSplitsAllowedForTier(splits: unknown): Promise<void> {
  if (splits === undefined) return;
  const settings = await settingsRepository.get();
  if (!settings.isPro) {
    throw new PaywallRequiredError('split', 'Splitting a transaction across categories requires Pro.');
  }
}

async function replaceSplits(
  transactionId: string,
  splits: { categoryId?: string; amountMinor: number; note?: string }[],
): Promise<void> {
  const db = getDb();
  await db.delete(transactionSplits).where(eq(transactionSplits.transactionId, transactionId));
  await db.insert(transactionSplits).values(
    splits.map((s) => ({
      id: randomUUID(),
      transactionId,
      categoryId: s.categoryId ?? null,
      amountMinor: s.amountMinor,
      note: s.note ?? null,
    })),
  );
}

export async function getSplits(transactionId: string): Promise<TransactionSplit[]> {
  const db = getDb();
  return db.select().from(transactionSplits).where(eq(transactionSplits.transactionId, transactionId));
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
  assertSplitsSumToAmount(parsed.amountMinor, parsed.splits);
  await assertSplitsAllowedForTier(parsed.splits);
  await assertAccountExists(parsed.accountId);
  if (parsed.type === 'transfer' && parsed.transferAccountId) {
    await assertAccountExists(parsed.transferAccountId);
  }
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
      accountId: parsed.accountId,
      type: parsed.type,
      transferAccountId: parsed.type === 'transfer' ? (parsed.transferAccountId ?? null) : null,
      amountMinor: parsed.amountMinor,
      currencyCode: parsed.currencyCode,
      baseAmountMinor: conversion.baseAmountMinor,
      baseCurrencyCode: conversion.baseCurrencyCode,
      categoryId: parsed.type === 'transfer' ? null : (parsed.splits ? null : (parsed.categoryId ?? null)),
      isSplit: !!parsed.splits,
      note: parsed.note ?? null,
      occurredAt: parsed.occurredAt,
      recurringTransactionId: parsed.recurringTransactionId ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!row) throw new ValidationError('Failed to create transaction');
  if (parsed.splits) await replaceSplits(row.id, parsed.splits);
  return row;
}

export async function update(id: string, input: TransactionUpdateInput): Promise<Transaction> {
  const parsed = transactionUpdateSchema.parse(input);
  const db = getDb();
  const [existing] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  if (!existing) throw new NotFoundError('Transaction', id);
  assertSplitsSumToAmount(parsed.amountMinor ?? existing.amountMinor, parsed.splits);
  await assertSplitsAllowedForTier(parsed.splits);
  // Editing a split transaction back down to a single category is done by
  // the caller omitting `splits` and setting `categoryId` explicitly — that
  // combination means "leave split mode", so the stale split rows are
  // cleared rather than left orphaned under a transaction no longer marked
  // isSplit.
  const wantsUnsplit =
    existing.isSplit && parsed.splits === undefined && Object.prototype.hasOwnProperty.call(input, 'categoryId');

  if (parsed.occurredAt && !isValidOccurredAt(parsed.occurredAt)) {
    throw new ValidationError('occurredAt must be a valid date not in the future beyond today');
  }
  if (parsed.currencyCode) await assertCurrencyExists(parsed.currencyCode);
  if (parsed.accountId) await assertAccountExists(parsed.accountId);
  if (parsed.transferAccountId) await assertAccountExists(parsed.transferAccountId);

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

  const { splits, ...rest } = parsed;
  const nextIsSplit = splits ? true : wantsUnsplit ? false : existing.isSplit;
  const [row] = await db
    .update(transactions)
    .set({ ...rest, isSplit: nextIsSplit, baseAmountMinor, baseCurrencyCode, updatedAt: new Date().toISOString() })
    .where(eq(transactions.id, id))
    .returning();
  if (!row) throw new NotFoundError('Transaction', id);
  if (splits) {
    await replaceSplits(id, splits);
  } else if (wantsUnsplit) {
    await db.delete(transactionSplits).where(eq(transactionSplits.transactionId, id));
  }
  return row;
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = getDb();
  const result = await db.delete(transactions).where(eq(transactions.id, id)).returning({ id: transactions.id });
  if (result.length === 0) throw new NotFoundError('Transaction', id);
}

/** Phase 2 (docs/API_DESIGN.md §1). No-op on an empty array rather than an error. */
export async function bulkDelete(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = getDb();
  await db.delete(transactions).where(inArray(transactions.id, ids));
}

export async function list(filters?: {
  from?: string;
  to?: string;
  accountId?: string;
  categoryId?: string;
  type?: 'expense' | 'income' | 'transfer';
  /** Case-insensitive match against the note, the category name, or the
   * amount (Phase 2, docs/API_DESIGN.md §1 `search filter`). */
  search?: string;
}): Promise<Transaction[]> {
  const db = getDb();
  const conditions = [];
  if (filters?.from) conditions.push(gte(transactions.occurredAt, filters.from));
  if (filters?.to) conditions.push(lte(transactions.occurredAt, filters.to));
  if (filters?.accountId) {
    // An account's ledger includes transactions it owns AND transfers into
    // it from another account — both legs affect this account's running
    // balance (docs/DATABASE_SCHEMA.md `transactions` business rules).
    conditions.push(
      or(eq(transactions.accountId, filters.accountId), eq(transactions.transferAccountId, filters.accountId)),
    );
  }
  if (filters?.categoryId) conditions.push(eq(transactions.categoryId, filters.categoryId));
  if (filters?.type) conditions.push(eq(transactions.type, filters.type));
  if (filters?.search?.trim()) {
    const term = `%${filters.search.trim().toLowerCase()}%`;
    conditions.push(
      sql`(
        lower(coalesce(${transactions.note}, '')) LIKE ${term}
        OR lower(coalesce((SELECT ${categories.name} FROM ${categories} WHERE ${categories.id} = ${transactions.categoryId}), '')) LIKE ${term}
        OR CAST(${transactions.amountMinor} AS TEXT) LIKE ${term}
      )`,
    );
  }

  const rows =
    conditions.length > 0
      ? await db
          .select()
          .from(transactions)
          .where(and(...conditions))
          .orderBy(desc(transactions.occurredAt))
      : await db.select().from(transactions).orderBy(desc(transactions.occurredAt));

  const splitIds = rows.filter((r) => r.isSplit).map((r) => r.id);
  if (splitIds.length === 0) return rows;

  const counts = await db
    .select({ transactionId: transactionSplits.transactionId, count: sql<number>`count(*)` })
    .from(transactionSplits)
    .where(inArray(transactionSplits.transactionId, splitIds))
    .groupBy(transactionSplits.transactionId);
  const countByTransactionId = new Map(counts.map((c) => [c.transactionId, Number(c.count)]));

  return rows.map((r) => (r.isSplit ? { ...r, splitCount: countByTransactionId.get(r.id) ?? 0 } : r));
}

export async function getById(id: string): Promise<Transaction | null> {
  const db = getDb();
  const [row] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  return row ?? null;
}

export interface TransactionSummary {
  totalExpenseBaseMinor: number;
  totalIncomeBaseMinor: number;
  byCategory: { categoryId: string; totalBaseMinor: number }[];
}

/**
 * Category/total aggregation over an arbitrary inclusive date range —
 * generalized from getMonthlySummary so BudgetRepository can support
 * weekly/daily/custom periods (Phase 2) without duplicating the
 * split-proration logic. `getMonthlySummary` is the month-shaped special
 * case of this, kept as its own function since it's the one Reports/Home
 * still call directly.
 */
export async function getSummaryForRange(fromInclusive: string, toInclusive: string): Promise<TransactionSummary> {
  const db = getDb();
  const rows = await db
    .select()
    .from(transactions)
    .where(and(gte(transactions.occurredAt, fromInclusive), lte(transactions.occurredAt, toInclusive)));
  return summarize(rows);
}

export async function getMonthlySummary(month: string): Promise<TransactionSummary> {
  const db = getDb();
  const rows = await db.select().from(transactions).where(sql`substr(${transactions.occurredAt}, 1, 7) = ${month}`);
  return summarize(rows);
}

async function summarize(rows: Transaction[]): Promise<TransactionSummary> {
  const db = getDb();
  const splitTransactionIds = rows.filter((r) => r.isSplit).map((r) => r.id);
  const splitsByTransactionId = new Map<string, { categoryId: string | null; amountMinor: number }[]>();
  if (splitTransactionIds.length > 0) {
    const splitRows = await db
      .select()
      .from(transactionSplits)
      .where(inArray(transactionSplits.transactionId, splitTransactionIds));
    for (const s of splitRows) {
      const forTransaction = splitsByTransactionId.get(s.transactionId) ?? [];
      forTransaction.push({ categoryId: s.categoryId, amountMinor: s.amountMinor });
      splitsByTransactionId.set(s.transactionId, forTransaction);
    }
  }

  let totalExpenseBaseMinor = 0;
  let totalIncomeBaseMinor = 0;
  const byCategoryMap = new Map<string, number>();

  for (const row of rows) {
    // Transfers move money between the user's own accounts — they never
    // count toward category-based spend/income reports
    // (docs/DATABASE_SCHEMA.md `transactions` business rules).
    if (row.type === 'transfer') continue;
    if (row.baseAmountMinor == null) continue;
    if (row.type === 'expense') {
      totalExpenseBaseMinor += row.baseAmountMinor;
      const splits = row.isSplit ? splitsByTransactionId.get(row.id) : undefined;
      if (splits && splits.length > 0) {
        // Prorate the parent's converted base amount across its splits by
        // each split's share of the native amount — the last split absorbs
        // the rounding remainder so the shares always sum to
        // row.baseAmountMinor exactly, never double-counting or dropping a
        // fraction of a cent.
        let allocated = 0;
        splits.forEach((s, i) => {
          const isLast = i === splits.length - 1;
          const share = isLast
            ? row.baseAmountMinor! - allocated
            : Math.round((s.amountMinor / row.amountMinor) * row.baseAmountMinor!);
          allocated += share;
          if (s.categoryId) {
            byCategoryMap.set(s.categoryId, (byCategoryMap.get(s.categoryId) ?? 0) + share);
          }
        });
      } else if (row.categoryId) {
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
