import * as settingsRepository from '@/repositories/settingsRepository';
import { setUpSeededDb, tearDown } from './testSetup';

describe('SettingsRepository', () => {
  beforeEach(async () => {
    await setUpSeededDb();
  });
  afterEach(tearDown);

  test('get() creates the single default row on first call', async () => {
    const settings = await settingsRepository.get('EUR');
    expect(settings.id).toBe(1);
    expect(settings.baseCurrencyCode).toBe('EUR');
    expect(settings.isPro).toBe(false);
    expect(settings.onboardingComplete).toBe(false);
  });

  test('get() returns the same row on subsequent calls, ignoring the default arg', async () => {
    await settingsRepository.get('EUR');
    const second = await settingsRepository.get('USD');
    expect(second.baseCurrencyCode).toBe('EUR');
  });

  test('update() persists changes and bumps updatedAt', async () => {
    const initial = await settingsRepository.get('USD');
    const updated = await settingsRepository.update({ isPro: true, theme: 'dark' });
    expect(updated.isPro).toBe(true);
    expect(updated.theme).toBe('dark');
    expect(updated.updatedAt >= initial.updatedAt).toBe(true);
  });
});
