import * as budgetRepository from '@/repositories/budgetRepository';
import * as categoryRepository from '@/repositories/categoryRepository';
import * as settingsRepository from '@/repositories/settingsRepository';
import * as transactionRepository from '@/repositories/transactionRepository';
import { PaywallRequiredError } from '@/types/errors';
import { seedTestAccount, setUpSeededDb, tearDown } from './testSetup';
import type { Account } from '@/repositories/accountRepository';

describe('BudgetRepository', () => {
  let account: Account;

  beforeEach(async () => {
    await setUpSeededDb();
    await settingsRepository.get('USD');
    account = await seedTestAccount();
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
      accountId: account.id,
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

  test('upsert() rejects a non-monthly period on the free tier', async () => {
    await expect(budgetRepository.upsert({ amountMinor: 100000, period: 'weekly' })).rejects.toThrow(
      PaywallRequiredError,
    );
  });

  test('upsert() accepts a custom period for Pro users and getWithProgress() uses its own range', async () => {
    await settingsRepository.update({ isPro: true });
    const [category] = await categoryRepository.list('expense');
    await budgetRepository.upsert({
      categoryId: category!.id,
      amountMinor: 20000,
      period: 'custom',
      customStartDate: '2026-08-10',
      customEndDate: '2026-08-20',
    });
    // Inside the custom range.
    await transactionRepository.create({
      accountId: account.id,
      type: 'expense',
      amountMinor: 3000,
      currencyCode: 'USD',
      categoryId: category!.id,
      occurredAt: '2026-08-15',
    });
    // Outside the custom range — same month, must not count.
    await transactionRepository.create({
      accountId: account.id,
      type: 'expense',
      amountMinor: 9000,
      currencyCode: 'USD',
      categoryId: category!.id,
      occurredAt: '2026-08-25',
    });

    // periodStart is just an anchor date here — the custom budget ignores
    // it and uses its own stored start/end.
    const progress = await budgetRepository.getWithProgress('2026-08-01');
    const row = progress.find((p) => p.budget.categoryId === category!.id);
    expect(row?.spentBaseMinor).toBe(3000);
  });

  test('upsert() rejects a custom period missing its date range', async () => {
    await settingsRepository.update({ isPro: true });
    await expect(budgetRepository.upsert({ amountMinor: 100000, period: 'custom' })).rejects.toThrow();
  });

  test('setCategoryLimit() requires Pro', async () => {
    const [category] = await categoryRepository.list('expense');
    const overall = await budgetRepository.upsert({ amountMinor: 100000 });
    await expect(budgetRepository.setCategoryLimit(overall.id, category!.id, 5000)).rejects.toThrow(
      PaywallRequiredError,
    );
  });

  test('setCategoryLimit() upserts a single row per (budget, category) and getCategoryLimitsWithProgress() reports spend', async () => {
    await settingsRepository.update({ isPro: true });
    const [category] = await categoryRepository.list('expense');
    const overall = await budgetRepository.upsert({ amountMinor: 100000 });

    await budgetRepository.setCategoryLimit(overall.id, category!.id, 5000);
    await budgetRepository.setCategoryLimit(overall.id, category!.id, 8000);

    await transactionRepository.create({
      accountId: account.id,
      type: 'expense',
      amountMinor: 2000,
      currencyCode: 'USD',
      categoryId: category!.id,
      occurredAt: new Date().toISOString().slice(0, 10),
    });

    const withProgress = await budgetRepository.getCategoryLimitsWithProgress(overall.id);
    expect(withProgress).toHaveLength(1);
    expect(withProgress[0]!.limit.amountMinor).toBe(8000);
    expect(withProgress[0]!.spentBaseMinor).toBe(2000);
  });

  test('removeCategoryLimit() deletes the limit row', async () => {
    await settingsRepository.update({ isPro: true });
    const [category] = await categoryRepository.list('expense');
    const overall = await budgetRepository.upsert({ amountMinor: 100000 });
    await budgetRepository.setCategoryLimit(overall.id, category!.id, 5000);

    await budgetRepository.removeCategoryLimit(overall.id, category!.id);

    expect(await budgetRepository.getCategoryLimitsWithProgress(overall.id)).toHaveLength(0);
  });
});
