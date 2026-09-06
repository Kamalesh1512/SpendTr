import * as accountRepository from '@/repositories/accountRepository';
import * as settingsRepository from '@/repositories/settingsRepository';
import * as transactionRepository from '@/repositories/transactionRepository';
import { NotFoundError, PaywallRequiredError, ValidationError } from '@/types/errors';
import { todayIsoDate } from '@/utils/date';
import { setUpSeededDb, tearDown } from './testSetup';

describe('AccountRepository', () => {
  beforeEach(async () => {
    await setUpSeededDb();
    await settingsRepository.get('USD');
  });
  afterEach(tearDown);

  test('create() rejects an unknown currency code', async () => {
    await expect(
      accountRepository.create({ name: 'Cash', currencyCode: 'ZZZ', icon: 'cash', color: '#000000' }),
    ).rejects.toThrow(ValidationError);
  });

  test('the first account created is marked isDefault and is free', async () => {
    const account = await accountRepository.create({
      name: 'Cash',
      currencyCode: 'USD',
      icon: 'cash',
      color: '#22C55E',
    });
    expect(account.isDefault).toBe(true);
  });

  test('free tier rejects a second account with PaywallRequiredError', async () => {
    await accountRepository.create({ name: 'Cash', currencyCode: 'USD', icon: 'cash', color: '#22C55E' });
    await expect(
      accountRepository.create({ name: 'Travel', currencyCode: 'EUR', icon: 'airplane', color: '#14B8A6' }),
    ).rejects.toThrow(PaywallRequiredError);
  });

  test('Pro users can create multiple accounts', async () => {
    await accountRepository.create({ name: 'Cash', currencyCode: 'USD', icon: 'cash', color: '#22C55E' });
    await settingsRepository.update({ isPro: true });
    await expect(
      accountRepository.create({ name: 'Travel', currencyCode: 'EUR', icon: 'airplane', color: '#14B8A6' }),
    ).resolves.toBeDefined();
    expect(await accountRepository.list()).toHaveLength(2);
  });

  test('delete() rejects deleting the only remaining account', async () => {
    const account = await accountRepository.create({
      name: 'Cash',
      currencyCode: 'USD',
      icon: 'cash',
      color: '#22C55E',
    });
    await expect(accountRepository.delete(account.id)).rejects.toThrow(ValidationError);
  });

  test('delete() removes a non-only account', async () => {
    const cash = await accountRepository.create({ name: 'Cash', currencyCode: 'USD', icon: 'cash', color: '#22C55E' });
    await settingsRepository.update({ isPro: true });
    const travel = await accountRepository.create({
      name: 'Travel',
      currencyCode: 'EUR',
      icon: 'airplane',
      color: '#14B8A6',
    });
    await accountRepository.delete(travel.id);
    expect(await accountRepository.list()).toEqual([expect.objectContaining({ id: cash.id })]);
  });

  test('getRunningBalance() throws NotFoundError for an unknown account', async () => {
    await expect(accountRepository.getRunningBalance('does-not-exist', 3)).rejects.toThrow(NotFoundError);
  });

  test('getRunningBalance() folds the initial balance plus expenses/income across months', async () => {
    const account = await accountRepository.create({
      name: 'Cash',
      currencyCode: 'USD',
      icon: 'cash',
      color: '#22C55E',
      initialBalanceMinor: 10000, // $100.00 opening balance
    });

    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    const lastMonthIso = lastMonthDate.toISOString().slice(0, 10);
    // Today's own date, not a hardcoded day-of-month — a fixed "-05" here
    // would fail isValidOccurredAt's future-date check on the 1st-4th of
    // any month.
    const thisMonthIso = todayIsoDate();

    // Spend $20 last month, earn $50 this month.
    await transactionRepository.create({
      accountId: account.id,
      type: 'expense',
      amountMinor: 2000,
      currencyCode: 'USD',
      occurredAt: lastMonthIso,
    });
    await transactionRepository.create({
      accountId: account.id,
      type: 'income',
      amountMinor: 5000,
      currencyCode: 'USD',
      occurredAt: thisMonthIso,
    });

    const history = await accountRepository.getRunningBalance(account.id, 3);
    expect(history).toHaveLength(3);
    // Oldest month (2 months back): no activity yet, still the opening balance.
    expect(history[0]!.balanceMinor).toBe(10000);
    // Last month: opening balance - $20 spend = $80.
    expect(history[1]!.balanceMinor).toBe(8000);
    // This month: $80 + $50 income = $130.
    expect(history[2]!.balanceMinor).toBe(13000);
    expect(history[2]!.month).toBe(thisMonth);
  });

  test('getRunningBalance() folds both legs of a transfer between two accounts', async () => {
    await settingsRepository.update({ isPro: true });
    const cash = await accountRepository.create({ name: 'Cash', currencyCode: 'USD', icon: 'cash', color: '#22C55E' });
    const savings = await accountRepository.create({
      name: 'Savings',
      currencyCode: 'USD',
      icon: 'card',
      color: '#5B5FEF',
    });

    // Today's own date, not a hardcoded day-of-month — a fixed "-10" here
    // failed isValidOccurredAt's future-date check whenever the suite ran
    // before the 10th of the month.
    const occurredAt = todayIsoDate();

    await transactionRepository.create({
      accountId: cash.id,
      type: 'transfer',
      transferAccountId: savings.id,
      amountMinor: 5000,
      currencyCode: 'USD',
      occurredAt,
    });

    const cashHistory = await accountRepository.getRunningBalance(cash.id, 1);
    const savingsHistory = await accountRepository.getRunningBalance(savings.id, 1);
    expect(cashHistory[0]!.balanceMinor).toBe(-5000);
    expect(savingsHistory[0]!.balanceMinor).toBe(5000);
  });
});
