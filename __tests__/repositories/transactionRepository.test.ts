import * as settingsRepository from '@/repositories/settingsRepository';
import * as transactionRepository from '@/repositories/transactionRepository';
import { PaywallRequiredError, ValidationError } from '@/types/errors';
import { setUpSeededDb, tearDown } from './testSetup';

describe('TransactionRepository', () => {
  beforeEach(async () => {
    await setUpSeededDb();
    await settingsRepository.get('USD'); // base currency = USD, free tier by default
  });
  afterEach(tearDown);

  test('create() rejects an unknown currency code', async () => {
    await expect(
      transactionRepository.create({
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
        type: 'expense',
        amountMinor: 500,
        currencyCode: 'USD',
        occurredAt: '2099-01-01',
      }),
    ).rejects.toThrow(ValidationError);
  });

  test('base-currency transactions always succeed on the free tier', async () => {
    const tx = await transactionRepository.create({
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
      type: 'expense',
      amountMinor: 1000,
      currencyCode: 'EUR',
      occurredAt: '2026-08-01',
    });
    // Same non-base currency again is fine.
    await expect(
      transactionRepository.create({
        type: 'expense',
        amountMinor: 500,
        currencyCode: 'EUR',
        occurredAt: '2026-08-02',
      }),
    ).resolves.toBeDefined();
  });

  test('free tier rejects a second distinct non-base currency with PaywallRequiredError', async () => {
    await transactionRepository.create({
      type: 'expense',
      amountMinor: 1000,
      currencyCode: 'EUR',
      occurredAt: '2026-08-01',
    });
    await expect(
      transactionRepository.create({
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
      type: 'expense',
      amountMinor: 1000,
      currencyCode: 'EUR',
      occurredAt: '2026-08-01',
    });
    await expect(
      transactionRepository.create({
        type: 'expense',
        amountMinor: 500,
        currencyCode: 'GBP',
        occurredAt: '2026-08-02',
      }),
    ).resolves.toBeDefined();
  });

  test('update() re-triggers conversion when amount or currency changes', async () => {
    const tx = await transactionRepository.create({
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
      type: 'expense',
      amountMinor: 1000,
      currencyCode: 'USD',
      occurredAt: '2026-08-01',
    });
    await transactionRepository.create({
      type: 'expense',
      amountMinor: 500,
      currencyCode: 'USD',
      occurredAt: '2026-07-01',
    });
    await transactionRepository.create({
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
      type: 'expense',
      amountMinor: 1000,
      currencyCode: 'USD',
      occurredAt: '2026-08-01',
    });
    await transactionRepository.delete(tx.id);
    expect(await transactionRepository.getById(tx.id)).toBeNull();
  });
});
