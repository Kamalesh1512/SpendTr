import * as debtRepository from '@/repositories/debtRepository';
import * as settingsRepository from '@/repositories/settingsRepository';
import { PaywallRequiredError, ValidationError } from '@/types/errors';
import { seedTestAccount, setUpSeededDb, tearDown } from './testSetup';
import type { Account } from '@/repositories/accountRepository';

describe('DebtRepository', () => {
  let account: Account;

  beforeEach(async () => {
    await setUpSeededDb();
    await settingsRepository.get('USD');
    account = await seedTestAccount();
  });
  afterEach(tearDown);

  test('create() requires Pro', async () => {
    await expect(
      debtRepository.create({
        counterpartyName: 'Priya',
        direction: 'lent',
        principalAmountMinor: 12000,
        currencyCode: 'USD',
        accountId: account.id,
      }),
    ).rejects.toThrow(PaywallRequiredError);
  });

  test('create() succeeds for Pro users; list() excludes settled by default', async () => {
    await settingsRepository.update({ isPro: true });
    const debt = await debtRepository.create({
      counterpartyName: 'Priya',
      direction: 'lent',
      principalAmountMinor: 12000,
      currencyCode: 'USD',
      accountId: account.id,
    });
    expect(debt.isSettled).toBe(false);

    await debtRepository.markSettled(debt.id);
    expect(await debtRepository.list()).toHaveLength(0);
    expect(await debtRepository.list(true)).toHaveLength(1);
  });

  test('getRemainingBalance() computes from payment history, not a stored total', async () => {
    await settingsRepository.update({ isPro: true });
    const debt = await debtRepository.create({
      counterpartyName: 'Priya',
      direction: 'lent',
      principalAmountMinor: 10000,
      currencyCode: 'USD',
      accountId: account.id,
    });

    await debtRepository.addPayment(debt.id, { amountMinor: 4000, occurredAt: '2026-08-01' });
    expect(await debtRepository.getRemainingBalance(debt.id)).toBe(6000);

    await debtRepository.addPayment(debt.id, { amountMinor: 6000, occurredAt: '2026-08-15' });
    expect(await debtRepository.getRemainingBalance(debt.id)).toBe(0);
  });

  test('addPayment() auto-settles the debt once the balance reaches zero', async () => {
    await settingsRepository.update({ isPro: true });
    const debt = await debtRepository.create({
      counterpartyName: 'Priya',
      direction: 'borrowed',
      principalAmountMinor: 5000,
      currencyCode: 'USD',
      accountId: account.id,
    });

    await debtRepository.addPayment(debt.id, { amountMinor: 5000, occurredAt: '2026-08-01' });

    const [row] = await debtRepository.list(true);
    expect(row!.isSettled).toBe(true);
  });

  test('addPayment() rejects a payment larger than what is outstanding', async () => {
    await settingsRepository.update({ isPro: true });
    const debt = await debtRepository.create({
      counterpartyName: 'Priya',
      direction: 'lent',
      principalAmountMinor: 5000,
      currencyCode: 'USD',
      accountId: account.id,
    });

    await expect(
      debtRepository.addPayment(debt.id, { amountMinor: 5001, occurredAt: '2026-08-01' }),
    ).rejects.toThrow(ValidationError);
  });

  test('reopen() reverses markSettled()', async () => {
    await settingsRepository.update({ isPro: true });
    const debt = await debtRepository.create({
      counterpartyName: 'Priya',
      direction: 'lent',
      principalAmountMinor: 5000,
      currencyCode: 'USD',
      accountId: account.id,
    });
    await debtRepository.markSettled(debt.id);
    await debtRepository.reopen(debt.id);

    const [row] = await debtRepository.list();
    expect(row!.isSettled).toBe(false);
  });

  test('delete() removes the debt and cascades its payments', async () => {
    await settingsRepository.update({ isPro: true });
    const debt = await debtRepository.create({
      counterpartyName: 'Priya',
      direction: 'lent',
      principalAmountMinor: 5000,
      currencyCode: 'USD',
      accountId: account.id,
    });
    await debtRepository.addPayment(debt.id, { amountMinor: 1000, occurredAt: '2026-08-01' });

    await debtRepository.delete(debt.id);

    expect(await debtRepository.list(true)).toHaveLength(0);
    await expect(debtRepository.getRemainingBalance(debt.id)).rejects.toThrow('Debt not found');
  });
});
