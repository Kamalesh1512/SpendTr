import * as goalRepository from '@/repositories/goalRepository';
import * as settingsRepository from '@/repositories/settingsRepository';
import { PaywallRequiredError } from '@/types/errors';
import { setUpSeededDb, tearDown } from './testSetup';

describe('GoalRepository', () => {
  beforeEach(async () => {
    await setUpSeededDb();
    await settingsRepository.get('USD');
  });
  afterEach(tearDown);

  test('create() requires Pro', async () => {
    await expect(
      goalRepository.create({
        name: 'New laptop',
        targetAmountMinor: 250000,
        currencyCode: 'USD',
        icon: 'laptop',
        color: '#6366F1',
      }),
    ).rejects.toThrow(PaywallRequiredError);
  });

  test('create() succeeds for Pro users and list() returns it', async () => {
    await settingsRepository.update({ isPro: true });
    const goal = await goalRepository.create({
      name: 'New laptop',
      targetAmountMinor: 250000,
      currencyCode: 'USD',
      icon: 'laptop',
      color: '#6366F1',
    });
    expect(goal.isAchieved).toBe(false);

    const all = await goalRepository.list();
    expect(all).toHaveLength(1);
    expect(all[0]!.id).toBe(goal.id);
  });

  test('getProgress() computes contributedMinor from contribution history, not a stored total', async () => {
    await settingsRepository.update({ isPro: true });
    const goal = await goalRepository.create({
      name: 'New laptop',
      targetAmountMinor: 1000,
      currencyCode: 'USD',
      icon: 'laptop',
      color: '#6366F1',
    });

    await goalRepository.addContribution(goal.id, { amountMinor: 400, occurredAt: '2026-08-01' });
    await goalRepository.addContribution(goal.id, { amountMinor: 300, occurredAt: '2026-08-15' });

    const progress = await goalRepository.getProgress(goal.id);
    expect(progress.contributedMinor).toBe(700);
    expect(progress.targetMinor).toBe(1000);
    expect(progress.percent).toBe(70);
  });

  test('addContribution() marks the goal achieved once contributions reach the target', async () => {
    await settingsRepository.update({ isPro: true });
    const goal = await goalRepository.create({
      name: 'New laptop',
      targetAmountMinor: 1000,
      currencyCode: 'USD',
      icon: 'laptop',
      color: '#6366F1',
    });

    await goalRepository.addContribution(goal.id, { amountMinor: 1000, occurredAt: '2026-08-01' });

    const all = await goalRepository.list();
    expect(all[0]!.isAchieved).toBe(true);
  });

  test('delete() removes the goal and cascades its contributions', async () => {
    await settingsRepository.update({ isPro: true });
    const goal = await goalRepository.create({
      name: 'New laptop',
      targetAmountMinor: 1000,
      currencyCode: 'USD',
      icon: 'laptop',
      color: '#6366F1',
    });
    await goalRepository.addContribution(goal.id, { amountMinor: 100, occurredAt: '2026-08-01' });

    await goalRepository.delete(goal.id);

    expect(await goalRepository.list()).toHaveLength(0);
    await expect(goalRepository.getProgress(goal.id)).rejects.toThrow('Goal not found');
  });
});
