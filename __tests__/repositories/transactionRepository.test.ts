import * as accountRepository from '@/repositories/accountRepository';
import * as categoryRepository from '@/repositories/categoryRepository';
import * as settingsRepository from '@/repositories/settingsRepository';
import * as transactionRepository from '@/repositories/transactionRepository';
import { PaywallRequiredError, ValidationError } from '@/types/errors';
import { seedTestAccount, setUpSeededDb, tearDown } from './testSetup';
import type { Account } from '@/repositories/accountRepository';

describe('TransactionRepository', () => {
  let account: Account;

  beforeEach(async () => {
    await setUpSeededDb();
    await settingsRepository.get('USD'); // base currency = USD, free tier by default
    account = await seedTestAccount();
  });
  afterEach(tearDown);

  test('create() rejects an unknown currency code', async () => {
    await expect(
      transactionRepository.create({
        accountId: account.id,
        type: 'expense',
        amountMinor: 500,
        currencyCode: 'ZZZ',
        occurredAt: '2026-08-01',
      }),
    ).rejects.toThrow(ValidationError);
  });

  test('create() rejects amounts that are not positive integers', async () => {
    await expect(
      transactionRepository.create({
        accountId: account.id,
        type: 'expense',
        amountMinor: -5,
        currencyCode: 'USD',
        occurredAt: '2026-08-01',
      }),
    ).rejects.toThrow();
  });

  test('create() rejects an occurredAt in the future', async () => {
    await expect(
      transactionRepository.create({
        accountId: account.id,
        type: 'expense',
        amountMinor: 500,
        currencyCode: 'USD',
        occurredAt: '2099-01-01',
      }),
    ).rejects.toThrow(ValidationError);
  });

  test('base-currency transactions always succeed on the free tier', async () => {
    const tx = await transactionRepository.create({
      accountId: account.id,
      type: 'expense',
      amountMinor: 1000,
      currencyCode: 'USD',
      occurredAt: '2026-08-01',
    });
    expect(tx.baseAmountMinor).toBe(1000);
    expect(tx.baseCurrencyCode).toBe('USD');
  });

  test('free tier allows exactly one distinct non-base currency', async () => {
    await transactionRepository.create({
      accountId: account.id,
      type: 'expense',
      amountMinor: 1000,
      currencyCode: 'EUR',
      occurredAt: '2026-08-01',
    });
    // Same non-base currency again is fine.
    await expect(
      transactionRepository.create({
        accountId: account.id,
        type: 'expense',
        amountMinor: 500,
        currencyCode: 'EUR',
        occurredAt: '2026-08-02',
      }),
    ).resolves.toBeDefined();
  });

  test('free tier rejects a second distinct non-base currency with PaywallRequiredError', async () => {
    await transactionRepository.create({
      accountId: account.id,
      type: 'expense',
      amountMinor: 1000,
      currencyCode: 'EUR',
      occurredAt: '2026-08-01',
    });
    await expect(
      transactionRepository.create({
        accountId: account.id,
        type: 'expense',
        amountMinor: 500,
        currencyCode: 'GBP',
        occurredAt: '2026-08-02',
      }),
    ).rejects.toThrow(PaywallRequiredError);
  });

  test('Pro users can use any number of distinct currencies', async () => {
    await settingsRepository.update({ isPro: true });
    await transactionRepository.create({
      accountId: account.id,
      type: 'expense',
      amountMinor: 1000,
      currencyCode: 'EUR',
      occurredAt: '2026-08-01',
    });
    await expect(
      transactionRepository.create({
        accountId: account.id,
        type: 'expense',
        amountMinor: 500,
        currencyCode: 'GBP',
        occurredAt: '2026-08-02',
      }),
    ).resolves.toBeDefined();
  });

  test('update() re-triggers conversion when amount or currency changes', async () => {
    const tx = await transactionRepository.create({
      accountId: account.id,
      type: 'expense',
      amountMinor: 1000,
      currencyCode: 'USD',
      occurredAt: '2026-08-01',
    });
    const updated = await transactionRepository.update(tx.id, { amountMinor: 2000 });
    expect(updated.baseAmountMinor).toBe(2000);
  });

  test('update() does not touch base amounts when only note/category change', async () => {
    const tx = await transactionRepository.create({
      accountId: account.id,
      type: 'expense',
      amountMinor: 1000,
      currencyCode: 'USD',
      occurredAt: '2026-08-01',
    });
    const updated = await transactionRepository.update(tx.id, { note: 'coffee' });
    expect(updated.baseAmountMinor).toBe(tx.baseAmountMinor);
    expect(updated.note).toBe('coffee');
  });

  test('getMonthlySummary aggregates by month and category, excluding other months', async () => {
    await transactionRepository.create({
      accountId: account.id,
      type: 'expense',
      amountMinor: 1000,
      currencyCode: 'USD',
      occurredAt: '2026-08-01',
    });
    await transactionRepository.create({
      accountId: account.id,
      type: 'expense',
      amountMinor: 500,
      currencyCode: 'USD',
      occurredAt: '2026-07-01',
    });
    await transactionRepository.create({
      accountId: account.id,
      type: 'income',
      amountMinor: 5000,
      currencyCode: 'USD',
      occurredAt: '2026-08-15',
    });

    const summary = await transactionRepository.getMonthlySummary('2026-08');
    expect(summary.totalExpenseBaseMinor).toBe(1000);
    expect(summary.totalIncomeBaseMinor).toBe(5000);
  });

  test('delete() removes the transaction', async () => {
    const tx = await transactionRepository.create({
      accountId: account.id,
      type: 'expense',
      amountMinor: 1000,
      currencyCode: 'USD',
      occurredAt: '2026-08-01',
    });
    await transactionRepository.delete(tx.id);
    expect(await transactionRepository.getById(tx.id)).toBeNull();
  });

  test('create() requires transferAccountId when type is transfer', async () => {
    await expect(
      transactionRepository.create({
        accountId: account.id,
        type: 'transfer',
        amountMinor: 1000,
        currencyCode: 'USD',
        occurredAt: '2026-08-01',
      }),
    ).rejects.toThrow();
  });

  test('a transfer is excluded from getMonthlySummary category totals', async () => {
    await settingsRepository.update({ isPro: true });
    const second = await accountRepository.create({
      name: 'Savings',
      currencyCode: 'USD',
      icon: 'card',
      color: '#5B5FEF',
    });
    await transactionRepository.create({
      accountId: account.id,
      type: 'transfer',
      transferAccountId: second.id,
      amountMinor: 5000,
      currencyCode: 'USD',
      occurredAt: '2026-08-01',
    });
    await transactionRepository.create({
      accountId: account.id,
      type: 'expense',
      amountMinor: 300,
      currencyCode: 'USD',
      occurredAt: '2026-08-01',
    });

    const summary = await transactionRepository.getMonthlySummary('2026-08');
    expect(summary.totalExpenseBaseMinor).toBe(300);
  });

  test('create() rejects splits that do not sum exactly to the parent amount', async () => {
    await expect(
      transactionRepository.create({
        accountId: account.id,
        type: 'expense',
        amountMinor: 1000,
        currencyCode: 'USD',
        occurredAt: '2026-08-01',
        splits: [{ amountMinor: 500 }, { amountMinor: 400 }],
      }),
    ).rejects.toThrow(ValidationError);
  });

  test('create() rejects splits on the free tier with PaywallRequiredError', async () => {
    const categories = await categoryRepository.list('expense');
    const [catA, catB] = categories;
    await expect(
      transactionRepository.create({
        accountId: account.id,
        type: 'expense',
        amountMinor: 1000,
        currencyCode: 'USD',
        occurredAt: '2026-08-01',
        splits: [
          { categoryId: catA!.id, amountMinor: 500 },
          { categoryId: catB!.id, amountMinor: 500 },
        ],
      }),
    ).rejects.toThrow(PaywallRequiredError);
  });

  test('create() with splits marks the transaction isSplit and writes one row per split', async () => {
    await settingsRepository.update({ isPro: true });
    const categories = await categoryRepository.list('expense');
    const [catA, catB] = categories;
    const row = await transactionRepository.create({
      accountId: account.id,
      type: 'expense',
      amountMinor: 1000,
      currencyCode: 'USD',
      occurredAt: '2026-08-01',
      splits: [
        { categoryId: catA!.id, amountMinor: 700 },
        { categoryId: catB!.id, amountMinor: 300 },
      ],
    });
    expect(row.isSplit).toBe(true);
    expect(row.categoryId).toBeNull();

    const splits = await transactionRepository.getSplits(row.id);
    expect(splits).toHaveLength(2);
    expect(splits.reduce((sum, s) => sum + s.amountMinor, 0)).toBe(1000);
  });

  test('getMonthlySummary() attributes a split transaction proportionally across its categories', async () => {
    await settingsRepository.update({ isPro: true });
    const categories = await categoryRepository.list('expense');
    const [catA, catB] = categories;
    await transactionRepository.create({
      accountId: account.id,
      type: 'expense',
      amountMinor: 1000,
      currencyCode: 'USD',
      occurredAt: '2026-08-01',
      splits: [
        { categoryId: catA!.id, amountMinor: 700 },
        { categoryId: catB!.id, amountMinor: 300 },
      ],
    });

    const summary = await transactionRepository.getMonthlySummary('2026-08');
    expect(summary.totalExpenseBaseMinor).toBe(1000);
    const byCategory = new Map(summary.byCategory.map((c) => [c.categoryId, c.totalBaseMinor]));
    expect(byCategory.get(catA!.id)).toBe(700);
    expect(byCategory.get(catB!.id)).toBe(300);
  });

  test('update() replaces an existing split set with a new one', async () => {
    await settingsRepository.update({ isPro: true });
    const categories = await categoryRepository.list('expense');
    const [catA, catB, catC] = categories;
    const row = await transactionRepository.create({
      accountId: account.id,
      type: 'expense',
      amountMinor: 1000,
      currencyCode: 'USD',
      occurredAt: '2026-08-01',
      splits: [
        { categoryId: catA!.id, amountMinor: 500 },
        { categoryId: catB!.id, amountMinor: 500 },
      ],
    });

    await transactionRepository.update(row.id, {
      splits: [
        { categoryId: catA!.id, amountMinor: 200 },
        { categoryId: catC!.id, amountMinor: 800 },
      ],
    });

    const splits = await transactionRepository.getSplits(row.id);
    expect(splits).toHaveLength(2);
    expect(splits.find((s) => s.categoryId === catB!.id)).toBeUndefined();
    expect(splits.find((s) => s.categoryId === catC!.id)?.amountMinor).toBe(800);
  });

  test('update() setting categoryId without splits reverts a split transaction to a single category', async () => {
    await settingsRepository.update({ isPro: true });
    const categories = await categoryRepository.list('expense');
    const [catA, catB] = categories;
    const row = await transactionRepository.create({
      accountId: account.id,
      type: 'expense',
      amountMinor: 1000,
      currencyCode: 'USD',
      occurredAt: '2026-08-01',
      splits: [
        { categoryId: catA!.id, amountMinor: 500 },
        { categoryId: catB!.id, amountMinor: 500 },
      ],
    });

    const updated = await transactionRepository.update(row.id, { categoryId: catA!.id });
    expect(updated.isSplit).toBe(false);
    expect(updated.categoryId).toBe(catA!.id);
    expect(await transactionRepository.getSplits(row.id)).toHaveLength(0);
  });

  test('list({ accountId }) includes both legs of a transfer touching that account', async () => {
    await settingsRepository.update({ isPro: true });
    const second = await accountRepository.create({
      name: 'Savings',
      currencyCode: 'USD',
      icon: 'card',
      color: '#5B5FEF',
    });
    const tx = await transactionRepository.create({
      accountId: account.id,
      type: 'transfer',
      transferAccountId: second.id,
      amountMinor: 5000,
      currencyCode: 'USD',
      occurredAt: '2026-08-01',
    });

    const secondAccountTxns = await transactionRepository.list({ accountId: second.id });
    expect(secondAccountTxns.some((t) => t.id === tx.id)).toBe(true);
  });

  test('list({ search }) matches a note, a category name, or an amount, case-insensitively', async () => {
    const categories = await categoryRepository.list('expense');
    const [catA] = categories;
    const noted = await transactionRepository.create({
      accountId: account.id,
      type: 'expense',
      amountMinor: 1234,
      currencyCode: 'USD',
      note: 'Reimbursed Taxi',
      occurredAt: '2026-08-01',
    });
    const categorized = await transactionRepository.create({
      accountId: account.id,
      type: 'expense',
      amountMinor: 500,
      currencyCode: 'USD',
      categoryId: catA!.id,
      occurredAt: '2026-08-02',
    });
    const other = await transactionRepository.create({
      accountId: account.id,
      type: 'expense',
      amountMinor: 999,
      currencyCode: 'USD',
      occurredAt: '2026-08-03',
    });

    const byNote = await transactionRepository.list({ search: 'taxi' });
    expect(byNote.map((t) => t.id)).toEqual([noted.id]);

    const byCategory = await transactionRepository.list({ search: catA!.name.toLowerCase() });
    expect(byCategory.some((t) => t.id === categorized.id)).toBe(true);
    expect(byCategory.some((t) => t.id === other.id)).toBe(false);

    const byAmount = await transactionRepository.list({ search: '1234' });
    expect(byAmount.map((t) => t.id)).toEqual([noted.id]);
  });

  test('bulkDelete() removes every listed transaction and no-ops on an empty array', async () => {
    const a = await transactionRepository.create({
      accountId: account.id,
      type: 'expense',
      amountMinor: 100,
      currencyCode: 'USD',
      occurredAt: '2026-08-01',
    });
    const b = await transactionRepository.create({
      accountId: account.id,
      type: 'expense',
      amountMinor: 200,
      currencyCode: 'USD',
      occurredAt: '2026-08-02',
    });

    await expect(transactionRepository.bulkDelete([])).resolves.toBeUndefined();
    expect(await transactionRepository.list()).toHaveLength(2);

    await transactionRepository.bulkDelete([a.id, b.id]);
    expect(await transactionRepository.list()).toHaveLength(0);
  });
});
