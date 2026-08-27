import * as LocalAuthentication from 'expo-local-authentication';
import { authenticate, isBiometricAvailable, setBiometricLockEnabled } from '@/services/biometrics';
import * as settingsRepository from '@/repositories/settingsRepository';
import { ValidationError } from '@/types/errors';
import { setUpSeededDb, tearDown } from '../repositories/testSetup';

describe('biometrics service', () => {
  beforeEach(async () => {
    await setUpSeededDb();
    await settingsRepository.get('USD');
    jest.clearAllMocks();
  });
  afterEach(tearDown);

  test('isBiometricAvailable is true when hardware present and enrolled', async () => {
    expect(await isBiometricAvailable()).toBe(true);
  });

  test('isBiometricAvailable is false when hardware is missing', async () => {
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValueOnce(false);
    expect(await isBiometricAvailable()).toBe(false);
  });

  test('authenticate reflects the native result', async () => {
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValueOnce({ success: false });
    expect(await authenticate()).toBe(false);
  });

  test('setBiometricLockEnabled(true) requires hardware + successful auth, then persists the setting', async () => {
    const settings = await setBiometricLockEnabledAndGet(true);
    expect(settings.biometricLockEnabled).toBe(true);
  });

  test('setBiometricLockEnabled(true) throws if hardware is unavailable', async () => {
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValueOnce(false);
    await expect(setBiometricLockEnabled(true)).rejects.toThrow(ValidationError);
  });

  test('setBiometricLockEnabled(true) throws if authentication fails', async () => {
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValueOnce({ success: false });
    await expect(setBiometricLockEnabled(true)).rejects.toThrow(ValidationError);
  });

  test('setBiometricLockEnabled(false) does not require authentication', async () => {
    await setBiometricLockEnabledAndGet(true);
    (LocalAuthentication.authenticateAsync as jest.Mock).mockClear();
    await setBiometricLockEnabled(false);
    expect(LocalAuthentication.authenticateAsync).not.toHaveBeenCalled();
    const settings = await settingsRepository.get();
    expect(settings.biometricLockEnabled).toBe(false);
  });

  async function setBiometricLockEnabledAndGet(enabled: boolean) {
    await setBiometricLockEnabled(enabled);
    return settingsRepository.get();
  }
});
