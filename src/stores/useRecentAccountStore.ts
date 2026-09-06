// UI-only "most recently used account" for the Add Transaction entry flow
// (docs/USER_FLOWS.md Flow 2: "defaults to the most-recently-used account,
// one tap to change if the user has more than one"). Derived/UI state only
// — the source of truth for which accounts exist is SQLite via
// accountRepository, not this store.
import { create } from 'zustand';

interface RecentAccountState {
  lastUsedAccountId: string | null;
  markUsed: (accountId: string) => void;
}

export const useRecentAccountStore = create<RecentAccountState>((set) => ({
  lastUsedAccountId: null,
  markUsed: (accountId) => set({ lastUsedAccountId: accountId }),
}));
