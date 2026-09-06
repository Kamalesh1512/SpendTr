// BudgetRepository (docs/API_DESIGN.md §1). At most one budget row per
// category_id (including one overall budget where category_id IS NULL) —
// SQLite treats multiple NULLs as distinct, so overall-budget uniqueness is
// enforced here, not by the DB constraint (docs/DATABASE_SCHEMA.md `budgets`
// business rule). Flexible periods (weekly/daily/custom) and nested
// per-category limits are Pro-only, Phase 2 features
// (docs/MONETIZATION.md) — Phase 1 shipped `period: 'monthly'` only.
import { and, eq, isNull } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { getDb } from '../db/client';
import { budgetCategoryLimits, budgets } from '../db/schema';
import { budgetInputSchema, type BudgetInput } from '../schemas/budget';
import { budgetCategoryLimitInputSchema } from '../schemas/budgetCategoryLimit';
import { NotFoundError, PaywallRequiredError, ValidationError } from '../types/errors';
import { monthBounds, todayIsoDate, weekBounds } from '../utils/date';
import * as settingsRepository from './settingsRepository';
import * as transactionRepository from './transactionRepository';

export type Budget = typeof budgets.$inferSelect;
export type BudgetCategoryLimit = typeof budgetCategoryLimits.$inferSelect;

async function assertProForFlexiblePeriod(period: 'monthly' | 'weekly' | 'daily' | 'custom'): Promise<void> {
  if (period === 'monthly') return;
  const settings = await settingsRepository.get();
  if (!settings.isPro) {
    throw new PaywallRequiredError(
      'flexible_budget_periods',
      'Weekly, daily, and custom-range budgets require Pro. Free tier is limited to monthly budgets.',
    );
  }
}

async function assertProForCategoryLimits(): Promise<void> {
  const settings = await settingsRepository.get();
  if (!settings.isPro) {
    throw new PaywallRequiredError(
      'flexible_budget_periods',
      'Per-category limits within a budget require Pro.',
    );
  }
}

async function findExisting(categoryId: string | undefined): Promise<Budget | null> {
  const db = getDb();
  if (categoryId === undefined) {
    const [row] = await db.select().from(budgets).where(isNull(budgets.categoryId)).limit(1);
    return row ?? null;
  }
  const [row] = await db.select().from(budgets).where(eq(budgets.categoryId, categoryId)).limit(1);
  return row ?? null;
}

export async function upsert(input: BudgetInput): Promise<Budget> {
  const parsed = budgetInputSchema.parse(input);
  await assertProForFlexiblePeriod(parsed.period);
  const db = getDb();
  const now = new Date().toISOString();

  const existing = await findExisting(parsed.categoryId);
  if (existing) {
    const [row] = await db
      .update(budgets)
      .set({
        amountMinor: parsed.amountMinor,
        period: parsed.period,
        customStartDate: parsed.period === 'custom' ? (parsed.customStartDate ?? null) : null,
        customEndDate: parsed.period === 'custom' ? (parsed.customEndDate ?? null) : null,
        updatedAt: now,
      })
      .where(eq(budgets.id, existing.id))
      .returning();
    if (!row) throw new ValidationError('Failed to update budget');
    return row;
  }

  const [row] = await db
    .insert(budgets)
    .values({
      id: randomUUID(),
      categoryId: parsed.categoryId ?? null,
      amountMinor: parsed.amountMinor,
      period: parsed.period,
      customStartDate: parsed.period === 'custom' ? (parsed.customStartDate ?? null) : null,
      customEndDate: parsed.period === 'custom' ? (parsed.customEndDate ?? null) : null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!row) throw new ValidationError('Failed to create budget');
  return row;
}

/** The [start, end] window a budget is currently tracking, given its own `period`. */
function currentWindowFor(budget: Pick<Budget, 'period' | 'customStartDate' | 'customEndDate'>, anchor: string): { start: string; end: string } {
  switch (budget.period) {
    case 'weekly':
      return weekBounds(anchor);
    case 'daily':
      return { start: anchor, end: anchor };
    case 'custom':
      // Both columns are NOT NULL-equivalent for a custom-period budget by
      // the time it's persisted (enforced in the input schema's refine), so
      // a missing value here would mean corrupted data, not a valid state.
      return { start: budget.customStartDate ?? anchor, end: budget.customEndDate ?? anchor };
    case 'monthly':
    default:
      return monthBounds(anchor);
  }
}

/**
 * Signature matches docs/API_DESIGN.md exactly (periodStart/periodEnd), but
 * each budget can carry its own `period` (Phase 2) — `periodStart` is used
 * as the anchor date ("today", from the caller) to derive each budget's own
 * current window; `periodEnd` is accepted for contract compatibility but
 * unused, since a weekly/daily/custom budget's real end is computed from
 * its own period, not a caller-supplied end. Summaries are memoized per
 * distinct window so budgets sharing the same period (the common case) only
 * query once.
 */
export async function getWithProgress(
  periodStart: string,
  _periodEnd?: string,
): Promise<{ budget: Budget; spentBaseMinor: number }[]> {
  const db = getDb();
  const allBudgets = await db.select().from(budgets);

  const summaryByWindow = new Map<string, Awaited<ReturnType<typeof transactionRepository.getSummaryForRange>>>();
  async function summaryFor(window: { start: string; end: string }) {
    const key = `${window.start}|${window.end}`;
    const cached = summaryByWindow.get(key);
    if (cached) return cached;
    const summary = await transactionRepository.getSummaryForRange(window.start, window.end);
    summaryByWindow.set(key, summary);
    return summary;
  }

  const results: { budget: Budget; spentBaseMinor: number }[] = [];
  for (const budget of allBudgets) {
    const window = currentWindowFor(budget, periodStart);
    const summary = await summaryFor(window);
    const spentByCategory = new Map(summary.byCategory.map((c) => [c.categoryId, c.totalBaseMinor]));
    results.push({
      budget,
      spentBaseMinor: budget.categoryId === null ? summary.totalExpenseBaseMinor : spentByCategory.get(budget.categoryId) ?? 0,
    });
  }
  return results;
}

export async function deleteBudget(id: string): Promise<void> {
  const db = getDb();
  const result = await db.delete(budgets).where(eq(budgets.id, id)).returning({ id: budgets.id });
  if (result.length === 0) throw new NotFoundError('Budget', id);
}

async function assertBudgetExists(budgetId: string): Promise<Budget> {
  const db = getDb();
  const [row] = await db.select().from(budgets).where(eq(budgets.id, budgetId)).limit(1);
  if (!row) throw new NotFoundError('Budget', budgetId);
  return row;
}

export async function setCategoryLimit(budgetId: string, categoryId: string, amountMinor: number): Promise<void> {
  const parsed = budgetCategoryLimitInputSchema.parse({ amountMinor });
  await assertProForCategoryLimits();
  await assertBudgetExists(budgetId);

  const db = getDb();
  const [existing] = await db
    .select()
    .from(budgetCategoryLimits)
    .where(and(eq(budgetCategoryLimits.budgetId, budgetId), eq(budgetCategoryLimits.categoryId, categoryId)))
    .limit(1);

  if (existing) {
    await db.update(budgetCategoryLimits).set({ amountMinor: parsed.amountMinor }).where(eq(budgetCategoryLimits.id, existing.id));
  } else {
    await db.insert(budgetCategoryLimits).values({ id: randomUUID(), budgetId, categoryId, amountMinor: parsed.amountMinor });
  }
}

export async function removeCategoryLimit(budgetId: string, categoryId: string): Promise<void> {
  const db = getDb();
  await db
    .delete(budgetCategoryLimits)
    .where(and(eq(budgetCategoryLimits.budgetId, budgetId), eq(budgetCategoryLimits.categoryId, categoryId)));
}

/**
 * Not in API_DESIGN.md's original signature list, but needed by the
 * nested-limits UI to render each limit alongside its own spend — the same
 * "small read method the screens need" pattern already flagged for
 * AccountSwitcher/RecurringList/Home in the implementation plan.
 */
export async function getCategoryLimitsWithProgress(
  budgetId: string,
): Promise<{ limit: BudgetCategoryLimit; spentBaseMinor: number }[]> {
  const budget = await assertBudgetExists(budgetId);
  const db = getDb();
  const limits = await db.select().from(budgetCategoryLimits).where(eq(budgetCategoryLimits.budgetId, budgetId));
  if (limits.length === 0) return [];

  const window = currentWindowFor(budget, todayIsoDate());
  const summary = await transactionRepository.getSummaryForRange(window.start, window.end);
  const spentByCategory = new Map(summary.byCategory.map((c) => [c.categoryId, c.totalBaseMinor]));

  return limits.map((limit) => ({ limit, spentBaseMinor: spentByCategory.get(limit.categoryId) ?? 0 }));
}

export { deleteBudget as delete };
