// BudgetRepository (docs/API_DESIGN.md §1). At most one budget row per
// category_id (including one overall budget where category_id IS NULL) —
// SQLite treats multiple NULLs as distinct, so overall-budget uniqueness is
// enforced here, not by the DB constraint (docs/DATABASE_SCHEMA.md `budgets`
// business rule).
import { eq, isNull } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { getDb } from '../db/client';
import { budgets } from '../db/schema';
import { budgetInputSchema, type BudgetInput } from '../schemas/budget';
import { NotFoundError, ValidationError } from '../types/errors';
import * as transactionRepository from './transactionRepository';

export type Budget = typeof budgets.$inferSelect;

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
  const db = getDb();
  const now = new Date().toISOString();

  const existing = await findExisting(parsed.categoryId);
  if (existing) {
    const [row] = await db
      .update(budgets)
      .set({ amountMinor: parsed.amountMinor, updatedAt: now })
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
      period: 'monthly',
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!row) throw new ValidationError('Failed to create budget');
  return row;
}

export async function getWithProgress(
  month: string,
): Promise<Array<{ budget: Budget; spentBaseMinor: number }>> {
  const db = getDb();
  const allBudgets = await db.select().from(budgets);
  const summary = await transactionRepository.getMonthlySummary(month);

  const spentByCategory = new Map(summary.byCategory.map((c) => [c.categoryId, c.totalBaseMinor]));

  return allBudgets.map((budget) => ({
    budget,
    spentBaseMinor:
      budget.categoryId === null
        ? summary.totalExpenseBaseMinor
        : spentByCategory.get(budget.categoryId) ?? 0,
  }));
}

export async function deleteBudget(id: string): Promise<void> {
  const db = getDb();
  const result = await db.delete(budgets).where(eq(budgets.id, id)).returning({ id: budgets.id });
  if (result.length === 0) throw new NotFoundError('Budget', id);
}

export { deleteBudget as delete };
