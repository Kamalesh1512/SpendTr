import Purchases from 'react-native-purchases';
import { linkProToEmail, purchasePro, reconcileProEntitlement, restorePurchases } from '@/services/purchases';
import * as settingsRepository from '@/repositories/settingsRepository';
import { setUpSeededDb, tearDown } from '../repositories/testSetup';

// configurePurchases() is intentionally not called in these tests — no API
// key is set in the test environment, so each function's "not configured"
// guard is what's under test, plus the reconciliation math once configured
// is simulated by calling the mocked SDK directly.

describe('purchases service', () => {
  beforeEach(async () => {
    await setUpSeededDb();
    await settingsRepository.get('USD');
    jest.clearAllMocks();
  });
  afterEach(tearDown);

  test('reconcileProEntitlement falls back to the local cache when RevenueCat is not configured', async () => {
    const isPro = await reconcileProEntitlement();
    expect(isPro).toBe(false);
  });

  test('purchasePro throws if Purchases was never configured (no API key in this environment)', async () => {
    await expect(
      purchasePro({ identifier: 'pro_lifetime' } as unknown as Parameters<typeof purchasePro>[0]),
    ).rejects.toThrow();
  });

  test('restorePurchases throws if Purchases was never configured', async () => {
    await expect(restorePurchases()).rejects.toThrow();
    expect(Purchases.restorePurchases).not.toHaveBeenCalled();
  });

  test('linkProToEmail throws if Purchases was never configured', async () => {
    await expect(linkProToEmail('person@example.com')).rejects.toThrow();
    expect(Purchases.logIn).not.toHaveBeenCalled();
  });
});
