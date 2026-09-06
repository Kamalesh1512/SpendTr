// Shared predicate for the Home SearchFilter panel (docs/design_system/
// templates/spendtr-app/home.jsx `SearchFilterScreen`, Phase 2). Repository
// filters (type/category/account/date/search) are pushed down to
// TransactionRepository.list (docs/API_DESIGN.md §1); amount range has no
// repository equivalent, so it's applied client-side here, on the same
// already-fetched list, rather than inventing a repository contract for it.
import type { Transaction } from '../repositories/transactionRepository';
import { minorToMajor } from './money';
import { todayIsoDate } from './date';

export type DatePreset = 'thisMonth' | 'last3Months' | 'thisYear' | 'allTime' | 'custom';

export interface SearchFilterState {
  search: string;
  type: 'all' | 'expense' | 'income';
  datePreset: DatePreset;
  customFrom: string;
  customTo: string;
  categoryId: string | null;
  amountMin: string;
  amountMax: string;
}

export function defaultSearchFilterState(): SearchFilterState {
  const today = todayIsoDate();
  return {
    search: '',
    type: 'all',
    datePreset: 'allTime',
    customFrom: today,
    customTo: today,
    categoryId: null,
    amountMin: '',
    amountMax: '',
  };
}

/** [from, to] inclusive, or undefined bounds for "all time". */
export function dateRangeForPreset(state: Pick<SearchFilterState, 'datePreset' | 'customFrom' | 'customTo'>, now: Date = new Date()): { from?: string; to?: string } {
  const today = todayIsoDate(now);
  switch (state.datePreset) {
    case 'thisMonth':
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case 'last3Months': {
      const d = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return { from: todayIsoDate(d).slice(0, 7) + '-01', to: today };
    }
    case 'thisYear':
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    case 'custom':
      return { from: state.customFrom, to: state.customTo };
    case 'allTime':
    default:
      return {};
  }
}

/** True when this filter state has anything applied beyond the defaults. */
export function isSearchFilterActive(state: SearchFilterState): boolean {
  return (
    state.search.trim() !== '' ||
    state.type !== 'all' ||
    state.datePreset !== 'allTime' ||
    state.categoryId !== null ||
    state.amountMin !== '' ||
    state.amountMax !== ''
  );
}

/**
 * Client-side amount-range check only — every other dimension of
 * `SearchFilterState` is expected to already have been pushed into the
 * TransactionRepository.list() query that produced `transactions`, so this
 * is not a full re-filter.
 */
export function withinAmountRange(t: Transaction, state: Pick<SearchFilterState, 'amountMin' | 'amountMax'>, decimalDigits: number): boolean {
  const majorAmount = minorToMajor(t.baseAmountMinor ?? t.amountMinor, decimalDigits);
  if (state.amountMin.trim() && majorAmount < (parseFloat(state.amountMin) || 0)) return false;
  if (state.amountMax.trim() && majorAmount > (parseFloat(state.amountMax) || Infinity)) return false;
  return true;
}

/**
 * Full client-side predicate, every dimension at once — used only for the
 * SearchFilter panel's live "Show N results" preview against the
 * account-scoped list already in memory, so adjusting a chip doesn't need a
 * repository round trip on every tap. The real applied view still goes
 * through TransactionRepository.list() (see `dateRangeForPreset` +
 * `search`/`type`/`categoryId` passed there) once the user confirms.
 */
export function matchesSearchFilterPreview(
  t: Transaction,
  state: SearchFilterState,
  categoryName: string | undefined,
  decimalDigits: number,
): boolean {
  if (state.type !== 'all' && t.type !== state.type) return false;
  if (state.categoryId && t.categoryId !== state.categoryId) return false;

  const { from, to } = dateRangeForPreset(state);
  const occurredDay = t.occurredAt.slice(0, 10);
  if (from && occurredDay < from) return false;
  if (to && occurredDay > to) return false;

  if (!withinAmountRange(t, state, decimalDigits)) return false;

  const term = state.search.trim().toLowerCase();
  if (term) {
    const haystack = `${t.note ?? ''} ${categoryName ?? ''} ${t.amountMinor}`.toLowerCase();
    if (!haystack.includes(term)) return false;
  }

  return true;
}
