import * as categoryRepository from '@/repositories/categoryRepository';
import * as settingsRepository from '@/repositories/settingsRepository';
import { PaywallRequiredError, ValidationError } from '@/types/errors';
import { setUpSeededDb, tearDown } from './testSetup';

describe('CategoryRepository', () => {
  beforeEach(async () => {
    await setUpSeededDb();
    await settingsRepository.get('USD');
  });
  afterEach(tearDown);

  test('list() returns the seeded default categories', async () => {
    const all = await categoryRepository.list();
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((c) => c.isDefault)).toBe(true);
  });

  test('list(type) filters by expense/income', async () => {
    const income = await categoryRepository.list('income');
    expect(income.every((c) => c.type === 'income')).toBe(true);
  });

  test('create() rejects custom categories on the free tier', async () => {
    await expect(
      categoryRepository.create({ name: 'Pets', icon: 'paw', color: '#123456', type: 'expense' }),
    ).rejects.toThrow(PaywallRequiredError);
  });

  test('create() allows custom categories once Pro', async () => {
    await settingsRepository.update({ isPro: true });
    const category = await categoryRepository.create({
      name: 'Pets',
      icon: 'paw',
      color: '#123456',
      type: 'expense',
    });
    expect(category.isDefault).toBe(false);
    expect(category.name).toBe('Pets');
  });

  test('delete() rejects deleting a default category', async () => {
    const [defaultCategory] = await categoryRepository.list('expense');
    await expect(categoryRepository.delete(defaultCategory!.id)).rejects.toThrow(ValidationError);
  });

  test('delete() removes a custom category', async () => {
    await settingsRepository.update({ isPro: true });
    const category = await categoryRepository.create({
      name: 'Pets',
      icon: 'paw',
      color: '#123456',
      type: 'expense',
    });
    await categoryRepository.delete(category.id);
    const all = await categoryRepository.list('expense');
    expect(all.find((c) => c.id === category.id)).toBeUndefined();
  });
});
