// Biometric app-lock service (docs/SECURITY.md §1). Free for all users —
// never paywalled. Wraps expo-local-authentication only; the app never
// implements its own PIN/password system, relying entirely on OS-level
// biometric/passcode APIs.
import * as LocalAuthentication from 'expo-local-authentication';
import * as settingsRepository from '../repositories/settingsRepository';
import { ValidationError } from '../types/errors';

/**
 * Idle timeout before the app re-locks on resume from background
 * (docs/SECURITY.md §1). Confirmed at 60 seconds with the developer.
 */
export const LOCK_IDLE_TIMEOUT_MS = 60_000;

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  return LocalAuthentication.isEnrolledAsync();
}

/** Prompts Face ID / fingerprint (or device passcode fallback, per OS behavior). */
export async function authenticate(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync();
  return result.success;
}

/**
 * Enables or disables the app lock setting. Enabling requires the device to
 * have biometrics available and requires one successful authentication as
 * confirmation before the setting takes effect.
 */
export async function setBiometricLockEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    const available = await isBiometricAvailable();
    if (!available) {
      throw new ValidationError('Biometric hardware is unavailable or not enrolled on this device.');
    }
    const confirmed = await authenticate();
    if (!confirmed) {
      throw new ValidationError('Biometric confirmation failed; app lock was not enabled.');
    }
  }
  await settingsRepository.update({ biometricLockEnabled: enabled });
}
