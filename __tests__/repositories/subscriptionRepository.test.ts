import * as settingsRepository from '@/repositories/settingsRepository';
import * as subscriptionRepository from '@/repositories/subscriptionRepository';
import { PaywallRequiredError, ValidationError } from '@/types/errors';
import { setUpSeededDb, tearDown } from './testSetup';

describe('SubscriptionRepository', () => {
  beforeEach(async () => {
    await setUpSeededDb();
    await settingsRepository.get('USD');
  });
  afterEach(tearDown);

  test('create() rejects an unknown currency code', async () => {
    await expect(
      subscriptionRepository.create({
        name: 'Netflix',
        amountMinor: 1599,
        currencyCode: 'ZZZ',
        billingCycle: 'monthly',
        nextRenewalDate: '2026-09-01',
      }),
    ).rejects.toThrow(ValidationError);
  });

  test('free tier allows up to 5 active subscriptions, rejects the 6th', async () => {
    for (let i = 0; i < 5; i += 1) {
      await subscriptionRepository.create({
        name: `Sub ${i}`,
        amountMinor: 999,
        currencyCode: 'USD',
        billingCycle: 'monthly',
        nextRenewalDate: '2026-09-01',
      });
    }
    await expect(
      subscriptionRepository.create({
        name: 'Sub 6',
        amountMinor: 999,
        currencyCode: 'USD',
        billingCycle: 'monthly',
        nextRenewalDate: '2026-09-01',
      }),
    ).rejects.toThrow(PaywallRequiredError);
  });

  test('Pro users are not limited to 5 active subscriptions', async () => {
    await settingsRepository.update({ isPro: true });
    for (let i = 0; i < 6; i += 1) {
      await subscriptionRepository.create({
        name: `Sub ${i}`,
        amountMinor: 999,
        currencyCode: 'USD',
        billingCycle: 'monthly',
        nextRenewalDate: '2026-09-01',
      });
    }
    const active = await subscriptionRepository.list(true);
    expect(active.length).toBe(6);
  });

  test('deactivate() sets is_active=0 without deleting the row', async () => {
    const sub = await subscriptionRepository.create({
      name: 'Spotify',
      amountMinor: 999,
      currencyCode: 'USD',
      billingCycle: 'monthly',
      nextRenewalDate: '2026-09-01',
    });
    await subscriptionRepository.deactivate(sub.id);
    const all = await subscriptionRepository.list(false);
    expect(all.find((s) => s.id === sub.id)?.isActive).toBe(false);
  });

  test('advanceRenewal() advances nextRenewalDate by one billing cycle', async () => {
    const sub = await subscriptionRepository.create({
      name: 'Gym',
      amountMinor: 4999,
      currencyCode: 'USD',
      billingCycle: 'monthly',
      nextRenewalDate: '2026-01-31',
    });
    const advanced = await subscriptionRepository.advanceRenewal(sub.id);
    expect(advanced.nextRenewalDate).toBe('2026-02-28');
  });

  test('getUpcoming() returns only active subscriptions renewing within the window', async () => {
    await subscriptionRepository.create({
      name: 'Soon',
      amountMinor: 500,
      currencyCode: 'USD',
      billingCycle: 'monthly',
      nextRenewalDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    });
    const farSub = await subscriptionRepository.create({
      name: 'Far',
      amountMinor: 500,
      currencyCode: 'USD',
      billingCycle: 'monthly',
      nextRenewalDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    });

    const upcoming = await subscriptionRepository.getUpcoming(7);
    expect(upcoming.some((s) => s.name === 'Soon')).toBe(true);
    expect(upcoming.some((s) => s.id === farSub.id)).toBe(false);
  });
});
