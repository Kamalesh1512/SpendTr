// UI-only "most recently used" ordering for the currency picker sheet,
// mirroring useRecentCategoriesStore. Derived/UI state only.
import { create } from 'zustand';

interface RecentCurrenciesState {
  recentCodes: string[];
  markUsed: (code: string) => void;
}

const MAX_RECENT = 3;

export const useRecentCurrenciesStore = create<RecentCurrenciesState>((set) => ({
  recentCodes: [],
  markUsed: (code) =>
    set((state) => ({
      recentCodes: [code, ...state.recentCodes.filter((c) => c !== code)].slice(0, MAX_RECENT),
    })),
}));
