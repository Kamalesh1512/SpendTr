// GoalRepository (docs/API_DESIGN.md §1). Goals and debts are a Pro-only
// feature in full (docs/MONETIZATION.md "Pro unlock: Goals and debts") —
// unlike per-category limits elsewhere, there is no free-tier allowance to
// gate around, so `create()` alone is the enforcement point (viewing an
// existing list is never blocked, matching CategoryRepository's pattern).
// A goal's progress is always computed from its contribution history, never
// stored as a redundant total (docs/CLAUDE.md §10) — `isAchieved` is kept in
// sync as a queryable cache but getProgress() always recomputes the sum.
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { getDb } from '../db/client';
import { goalContributions, goals } from '../db/schema';
import {
  goalContributionInputSchema,
  goalInputSchema,
  goalUpdateSchema,
  type GoalContributionInput,
  type GoalInput,
  type GoalUpdateInput,
} from '../schemas/goal';
import { NotFoundError, PaywallRequiredError, ValidationError } from '../types/errors';
import * as settingsRepository from './settingsRepository';

export type Goal = typeof goals.$inferSelect;
export type GoalContribution = typeof goalContributions.$inferSelect;

async function assertProForGoals(): Promise<void> {
  const settings = await settingsRepository.get();
  if (!settings.isPro) {
    throw new PaywallRequiredError('goals', 'Goals require Pro.');
  }
}

export async function create(input: GoalInput): Promise<Goal> {
  const parsed = goalInputSchema.parse(input);
  await assertProForGoals();
  const db = getDb();
  const now = new Date().toISOString();
  const [row] = await db
    .insert(goals)
    .values({
      id: randomUUID(),
      name: parsed.name,
      targetAmountMinor: parsed.targetAmountMinor,
      currencyCode: parsed.currencyCode,
      targetDate: parsed.targetDate ?? null,
      icon: parsed.icon,
      color: parsed.color,
      isAchieved: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!row) throw new ValidationError('Failed to create goal');
  return row;
}

export async function update(id: string, input: GoalUpdateInput): Promise<Goal> {
  const parsed = goalUpdateSchema.parse(input);
  const db = getDb();
  const [row] = await db
    .update(goals)
    .set({ ...parsed, updatedAt: new Date().toISOString() })
    .where(eq(goals.id, id))
    .returning();
  if (!row) throw new NotFoundError('Goal', id);
  return row;
}

export async function deleteGoal(id: string): Promise<void> {
  const db = getDb();
  const result = await db.delete(goals).where(eq(goals.id, id)).returning({ id: goals.id });
  if (result.length === 0) throw new NotFoundError('Goal', id);
}

export async function list(): Promise<Goal[]> {
  const db = getDb();
  return db.select().from(goals).orderBy(goals.createdAt);
}

export async function getContributions(goalId: string): Promise<GoalContribution[]> {
  const db = getDb();
  return db
    .select()
    .from(goalContributions)
    .where(eq(goalContributions.goalId, goalId))
    .orderBy(sql`${goalContributions.occurredAt} DESC`);
}

export async function addContribution(goalId: string, input: GoalContributionInput): Promise<void> {
  const parsed = goalContributionInputSchema.parse(input);
  const db = getDb();
  const [goal] = await db.select().from(goals).where(eq(goals.id, goalId)).limit(1);
  if (!goal) throw new NotFoundError('Goal', goalId);

  await db.insert(goalContributions).values({
    id: randomUUID(),
    goalId,
    transactionId: parsed.transactionId ?? null,
    amountMinor: parsed.amountMinor,
    occurredAt: parsed.occurredAt,
  });

  const { contributedMinor } = await getProgress(goalId);
  await db
    .update(goals)
    .set({ isAchieved: contributedMinor >= goal.targetAmountMinor, updatedAt: new Date().toISOString() })
    .where(eq(goals.id, goalId));
}

export async function getProgress(
  goalId: string,
): Promise<{ contributedMinor: number; targetMinor: number; percent: number }> {
  const db = getDb();
  const [goal] = await db.select().from(goals).where(eq(goals.id, goalId)).limit(1);
  if (!goal) throw new NotFoundError('Goal', goalId);

  const rows = await db
    .select({ amountMinor: goalContributions.amountMinor })
    .from(goalContributions)
    .where(eq(goalContributions.goalId, goalId));
  const contributedMinor = rows.reduce((sum, r) => sum + r.amountMinor, 0);

  return {
    contributedMinor,
    targetMinor: goal.targetAmountMinor,
    percent: goal.targetAmountMinor > 0 ? (contributedMinor / goal.targetAmountMinor) * 100 : 0,
  };
}

export { deleteGoal as delete };
