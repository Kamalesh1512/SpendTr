import * as budgetRepository from '@/repositories/budgetRepository';
import * as categoryRepository from '@/repositories/categoryRepository';
import * as settingsRepository from '@/repositories/settingsRepository';
import * as transactionRepository from '@/repositories/transactionRepository';
import { setUpSeededDb, tearDown } from './testSetup';

describe('BudgetRepository', () => {
  beforeEach(async () => {
    await setUpSeededDb();
    await settingsRepository.get('USD');
  });
  afterEach(tearDown);

  test('upsert() creates an overall budget when categoryId is omitted', async () => {
    const budget = await budgetRepository.upsert({ amountMinor: 100000 });
    expect(budget.categoryId).toBeNull();
    expect(budget.period).toBe('monthly');
  });

  test('upsert() called twice with no categoryId updates the same overall budget row, not a duplicate', async () => {
    await budgetRepository.upsert({ amountMinor: 100000 });
    const updated = await budgetRepository.upsert({ amountMinor: 150000 });
    const all = await budgetRepository.getWithProgress('2026-08');
    const overallRows = all.filter((b) => b.budget.categoryId === null);
    expect(overallRows.length).toBe(1);
    expect(updated.amountMinor).toBe(150000);
  });

  test('upsert() creates a per-category budget and updates it on re-upsert', async () => {
    const [category] = await categoryRepository.list('expense');
    const first = await budgetRepository.upsert({ categoryId: category!.id, amountMinor: 20000 });
    const second = await budgetRepository.upsert({ categoryId: category!.id, amountMinor: 25000 });
    expect(first.id).toBe(second.id);
    expect(second.amountMinor).toBe(25000);
  });

  test('getWithProgress() reports spend against the matching budget for the given month', async () => {
    const [category] = await categoryRepository.list('expense');
    await budgetRepository.upsert({ categoryId: category!.id, amountMinor: 20000 });
    await transactionRepository.create({
      type: 'expense',
      amountMinor: 5000,
      currencyCode: 'USD',
      categoryId: category!.id,
      occurredAt: '2026-08-05',
    });

    const progress = await budgetRepository.getWithProgress('2026-08');
    const row = progress.find((p) => p.budget.categoryId === category!.id);
    expect(row?.spentBaseMinor).toBe(5000);
  });

  test('delete() removes the budget row', async () => {
    const budget = await budgetRepository.upsert({ amountMinor: 100000 });
    await budgetRepository.delete(budget.id);
    const all = await budgetRepository.getWithProgress('2026-08');
    expect(all.find((b) => b.budget.id === budget.id)).toBeUndefined();
  });
});
