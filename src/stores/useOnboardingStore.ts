// Transient onboarding wizard state (docs/USER_FLOWS.md Flow 1). Not
// persisted data — final choices are written to user_settings and the
// first account via SettingsRepository/AccountRepository when onboarding
// completes (docs/CODING_STANDARDS.md "State Management": Zustand never
// duplicates persisted data).
import { create } from 'zustand';

interface OnboardingState {
  step: number;
  baseCurrencyCode: string | null;
  // Step 2 (Account): docs/DATABASE_SCHEMA.md "exactly one account exists
  // after onboarding (seeded as 'Cash' or user-renamed during setup)".
  accountName: string;
  accountIcon: string;
  accountColor: string;
  accountInitialBalanceText: string; // raw decimal text; converted to minor units on finish
  biometricLockEnabled: boolean;
  notificationsEnabled: boolean;
  setStep: (step: number) => void;
  setBaseCurrencyCode: (code: string) => void;
  setAccountName: (name: string) => void;
  setAccountIcon: (icon: string) => void;
  setAccountColor: (color: string) => void;
  setAccountInitialBalanceText: (value: string) => void;
  setBiometricLockEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  reset: () => void;
}

const DEFAULTS = {
  step: 0,
  baseCurrencyCode: null as string | null,
  accountName: 'Cash',
  accountIcon: 'cash',
  accountColor: '#22C55E',
  accountInitialBalanceText: '',
  biometricLockEnabled: false,
  notificationsEnabled: false,
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...DEFAULTS,
  setStep: (step) => set({ step }),
  setBaseCurrencyCode: (baseCurrencyCode) => set({ baseCurrencyCode }),
  setAccountName: (accountName) => set({ accountName }),
  setAccountIcon: (accountIcon) => set({ accountIcon }),
  setAccountColor: (accountColor) => set({ accountColor }),
  setAccountInitialBalanceText: (accountInitialBalanceText) => set({ accountInitialBalanceText }),
  setBiometricLockEnabled: (biometricLockEnabled) => set({ biometricLockEnabled }),
  setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
  reset: () => set({ ...DEFAULTS }),
}));
