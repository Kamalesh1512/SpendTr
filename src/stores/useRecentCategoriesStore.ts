// UI-only "most recently used" ordering for the category picker
// (docs/UI_UX_GUIDELINES.md "Category picker: ... most-recently-used
// first"). Derived/UI state only — categories themselves live in SQLite.
import { create } from 'zustand';

interface RecentCategoriesState {
  recentIds: string[];
  markUsed: (categoryId: string) => void;
}

const MAX_RECENT = 6;

export const useRecentCategoriesStore = create<RecentCategoriesState>((set) => ({
  recentIds: [],
  markUsed: (categoryId) =>
    set((state) => ({
      recentIds: [categoryId, ...state.recentIds.filter((id) => id !== categoryId)].slice(0, MAX_RECENT),
    })),
}));
