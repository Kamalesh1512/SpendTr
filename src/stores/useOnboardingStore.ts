// Transient onboarding wizard state (docs/USER_FLOWS.md Flow 1). Not
// persisted data — final choices are written to user_settings via
// SettingsRepository when onboarding completes (docs/CODING_STANDARDS.md
// "State Management": Zustand never duplicates persisted data).
import { create } from 'zustand';

interface OnboardingState {
  step: number;
  baseCurrencyCode: string | null;
  biometricLockEnabled: boolean;
  notificationsEnabled: boolean;
  setStep: (step: number) => void;
  setBaseCurrencyCode: (code: string) => void;
  setBiometricLockEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  step: 0,
  baseCurrencyCode: null,
  biometricLockEnabled: false,
  notificationsEnabled: false,
  setStep: (step) => set({ step }),
  setBaseCurrencyCode: (baseCurrencyCode) => set({ baseCurrencyCode }),
  setBiometricLockEnabled: (biometricLockEnabled) => set({ biometricLockEnabled }),
  setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
  reset: () => set({ step: 0, baseCurrencyCode: null, biometricLockEnabled: false, notificationsEnabled: false }),
}));
