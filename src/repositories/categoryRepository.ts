// CategoryRepository (docs/API_DESIGN.md §1). Free-tier custom-category
// gating lives here (docs/MONETIZATION.md: free tier = default categories
// only, no custom categories).
import { randomUUID } from 'expo-crypto';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import { categories } from '../db/schema';
import { categoryInputSchema, categoryUpdateSchema, type CategoryInput, type CategoryUpdateInput } from '../schemas/category';
import { NotFoundError, PaywallRequiredError, ValidationError } from '../types/errors';
import * as settingsRepository from './settingsRepository';

export type Category = typeof categories.$inferSelect;

export async function create(input: CategoryInput): Promise<Category> {
  const parsed = categoryInputSchema.parse(input);

  const settings = await settingsRepository.get();
  if (!settings.isPro) {
    throw new PaywallRequiredError(
      'custom_category',
      'Custom categories require Pro. Free tier is limited to the default category set.',
    );
  }

  const db = getDb();
  const now = new Date().toISOString();
  const [row] = await db
    .insert(categories)
    .values({
      id: randomUUID(),
      name: parsed.name,
      icon: parsed.icon,
      color: parsed.color,
      type: parsed.type,
      isDefault: false,
      sortOrder: 0,
      createdAt: now,
    })
    .returning();
  if (!row) throw new ValidationError('Failed to create category');
  return row;
}

export async function update(id: string, input: CategoryUpdateInput): Promise<Category> {
  const parsed = categoryUpdateSchema.parse(input);
  const db = getDb();
  const [row] = await db.update(categories).set(parsed).where(eq(categories.id, id)).returning();
  if (!row) throw new NotFoundError('Category', id);
  return row;
}

export async function deleteCategory(id: string): Promise<void> {
  const db = getDb();
  const [existing] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!existing) throw new NotFoundError('Category', id);
  if (existing.isDefault) {
    throw new ValidationError('Default categories cannot be deleted, only renamed/re-iconed.');
  }
  await db.delete(categories).where(eq(categories.id, id));
}

export async function list(type?: 'expense' | 'income'): Promise<Category[]> {
  const db = getDb();
  if (type) {
    return db.select().from(categories).where(and(eq(categories.type, type)));
  }
  return db.select().from(categories);
}

export { deleteCategory as delete };
