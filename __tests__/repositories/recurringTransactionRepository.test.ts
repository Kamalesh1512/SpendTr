import * as settingsRepository from '@/repositories/settingsRepository';
import * as recurringTransactionRepository from '@/repositories/recurringTransactionRepository';
import { PaywallRequiredError, ValidationError } from '@/types/errors';
import { seedTestAccount, setUpSeededDb, tearDown } from './testSetup';
import type { Account } from '@/repositories/accountRepository';

describe('RecurringTransactionRepository', () => {
  let account: Account;

  beforeEach(async () => {
    await setUpSeededDb();
    await settingsRepository.get('USD');
    account = await seedTestAccount();
  });
  afterEach(tearDown);

  test('create() rejects an unknown currency code', async () => {
    await expect(
      recurringTransactionRepository.create({
        kind: 'subscription',
        name: 'Netflix',
        accountId: account.id,
        amountMinor: 1599,
        currencyCode: 'ZZZ',
        billingCycle: 'monthly',
        nextRenewalDate: '2026-09-01',
      }),
    ).rejects.toThrow(ValidationError);
  });

  test('create() accepts all three kinds (subscription, bill, income)', async () => {
    const bill = await recurringTransactionRepository.create({
      kind: 'bill',
      name: 'Rent',
      accountId: account.id,
      amountMinor: 92000,
      currencyCode: 'USD',
      billingCycle: 'monthly',
      nextRenewalDate: '2026-09-01',
    });
    expect(bill.kind).toBe('bill');

    const income = await recurringTransactionRepository.create({
      kind: 'income',
      name: 'Salary',
      accountId: account.id,
      amountMinor: 320000,
      currencyCode: 'USD',
      billingCycle: 'monthly',
      nextRenewalDate: '2026-09-26',
    });
    expect(income.kind).toBe('income');
  });

  test('free tier allows up to 5 active recurring transactions, rejects the 6th', async () => {
    for (let i = 0; i < 5; i += 1) {
      await recurringTransactionRepository.create({
        kind: 'subscription',
        name: `Sub ${i}`,
        accountId: account.id,
        amountMinor: 999,
        currencyCode: 'USD',
        billingCycle: 'monthly',
        nextRenewalDate: '2026-09-01',
      });
    }
    await expect(
      recurringTransactionRepository.create({
        kind: 'subscription',
        name: 'Sub 6',
        accountId: account.id,
        amountMinor: 999,
        currencyCode: 'USD',
        billingCycle: 'monthly',
        nextRenewalDate: '2026-09-01',
      }),
    ).rejects.toThrow(PaywallRequiredError);
  });

  test('Pro users are not limited to 5 active recurring transactions', async () => {
    await settingsRepository.update({ isPro: true });
    for (let i = 0; i < 6; i += 1) {
      await recurringTransactionRepository.create({
        kind: 'subscription',
        name: `Sub ${i}`,
        accountId: account.id,
        amountMinor: 999,
        currencyCode: 'USD',
        billingCycle: 'monthly',
        nextRenewalDate: '2026-09-01',
      });
    }
    const active = await recurringTransactionRepository.list(true);
    expect(active.length).toBe(6);
  });

  test('list(activeOnly, kind) filters by kind', async () => {
    await recurringTransactionRepository.create({
      kind: 'subscription',
      name: 'Netflix',
      accountId: account.id,
      amountMinor: 1599,
      currencyCode: 'USD',
      billingCycle: 'monthly',
      nextRenewalDate: '2026-09-01',
    });
    await recurringTransactionRepository.create({
      kind: 'bill',
      name: 'Rent',
      accountId: account.id,
      amountMinor: 92000,
      currencyCode: 'USD',
      billingCycle: 'monthly',
      nextRenewalDate: '2026-09-01',
    });
    const bills = await recurringTransactionRepository.list(undefined, 'bill');
    expect(bills).toHaveLength(1);
    expect(bills[0]?.kind).toBe('bill');
  });

  test('deactivate() sets is_active=0 without deleting the row', async () => {
    const sub = await recurringTransactionRepository.create({
      kind: 'subscription',
      name: 'Spotify',
      accountId: account.id,
      amountMinor: 999,
      currencyCode: 'USD',
      billingCycle: 'monthly',
      nextRenewalDate: '2026-09-01',
    });
    await recurringTransactionRepository.deactivate(sub.id);
    const all = await recurringTransactionRepository.list(false);
    expect(all.find((s) => s.id === sub.id)?.isActive).toBe(false);
  });

  test('advanceRenewal() advances nextRenewalDate by one billing cycle', async () => {
    const sub = await recurringTransactionRepository.create({
      kind: 'subscription',
      name: 'Gym',
      accountId: account.id,
      amountMinor: 4999,
      currencyCode: 'USD',
      billingCycle: 'monthly',
      nextRenewalDate: '2026-01-31',
    });
    const advanced = await recurringTransactionRepository.advanceRenewal(sub.id);
    expect(advanced.nextRenewalDate).toBe('2026-02-28');
  });

  test('getUpcoming() returns only active recurring transactions renewing within the window', async () => {
    await recurringTransactionRepository.create({
      kind: 'subscription',
      name: 'Soon',
      accountId: account.id,
      amountMinor: 500,
      currencyCode: 'USD',
      billingCycle: 'monthly',
      nextRenewalDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    });
    const farItem = await recurringTransactionRepository.create({
      kind: 'subscription',
      name: 'Far',
      accountId: account.id,
      amountMinor: 500,
      currencyCode: 'USD',
      billingCycle: 'monthly',
      nextRenewalDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    });

    const upcoming = await recurringTransactionRepository.getUpcoming(7);
    expect(upcoming.some((s) => s.name === 'Soon')).toBe(true);
    expect(upcoming.some((s) => s.id === farItem.id)).toBe(false);
  });
});
