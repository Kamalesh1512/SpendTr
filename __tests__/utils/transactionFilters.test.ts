import {
  dateRangeForPreset,
  defaultSearchFilterState,
  isSearchFilterActive,
  matchesSearchFilterPreview,
  withinAmountRange,
} from '@/utils/transactionFilters';
import type { Transaction } from '@/repositories/transactionRepository';

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 't1',
    accountId: 'a1',
    type: 'expense',
    transferAccountId: null,
    amountMinor: 1000,
    currencyCode: 'USD',
    baseAmountMinor: 1000,
    baseCurrencyCode: 'USD',
    categoryId: null,
    isSplit: false,
    note: null,
    occurredAt: '2026-08-15',
    recurringTransactionId: null,
    createdAt: '2026-08-15T00:00:00.000Z',
    updatedAt: '2026-08-15T00:00:00.000Z',
    ...overrides,
  };
}

describe('isSearchFilterActive', () => {
  test('defaults are inactive', () => {
    expect(isSearchFilterActive(defaultSearchFilterState())).toBe(false);
  });

  test('any non-default field marks it active', () => {
    expect(isSearchFilterActive({ ...defaultSearchFilterState(), search: 'taxi' })).toBe(true);
    expect(isSearchFilterActive({ ...defaultSearchFilterState(), type: 'income' })).toBe(true);
    expect(isSearchFilterActive({ ...defaultSearchFilterState(), amountMin: '5' })).toBe(true);
  });
});

describe('dateRangeForPreset', () => {
  const now = new Date(2026, 7, 15); // Aug 15 2026

  test('thisMonth', () => {
    expect(dateRangeForPreset({ datePreset: 'thisMonth', customFrom: '', customTo: '' }, now)).toEqual({
      from: '2026-08-01',
      to: '2026-08-15',
    });
  });

  test('last3Months spans back two full calendar months', () => {
    expect(dateRangeForPreset({ datePreset: 'last3Months', customFrom: '', customTo: '' }, now)).toEqual({
      from: '2026-06-01',
      to: '2026-08-15',
    });
  });

  test('thisYear', () => {
    expect(dateRangeForPreset({ datePreset: 'thisYear', customFrom: '', customTo: '' }, now)).toEqual({
      from: '2026-01-01',
      to: '2026-08-15',
    });
  });

  test('custom uses the given bounds verbatim', () => {
    expect(dateRangeForPreset({ datePreset: 'custom', customFrom: '2026-01-01', customTo: '2026-02-01' }, now)).toEqual({
      from: '2026-01-01',
      to: '2026-02-01',
    });
  });

  test('allTime has no bounds', () => {
    expect(dateRangeForPreset({ datePreset: 'allTime', customFrom: '', customTo: '' }, now)).toEqual({});
  });
});

describe('withinAmountRange', () => {
  test('respects both bounds, using baseAmountMinor when present', () => {
    const t = makeTransaction({ amountMinor: 5000, baseAmountMinor: 4000 });
    expect(withinAmountRange(t, { amountMin: '30', amountMax: '50' }, 2)).toBe(true);
    expect(withinAmountRange(t, { amountMin: '41', amountMax: '' }, 2)).toBe(false);
    expect(withinAmountRange(t, { amountMin: '', amountMax: '39' }, 2)).toBe(false);
  });

  test('empty bounds impose no constraint', () => {
    const t = makeTransaction({ amountMinor: 100, baseAmountMinor: null });
    expect(withinAmountRange(t, { amountMin: '', amountMax: '' }, 2)).toBe(true);
  });
});

describe('matchesSearchFilterPreview', () => {
  test('matches on note substring, case-insensitively', () => {
    const t = makeTransaction({ note: 'Reimbursed Taxi' });
    const state = { ...defaultSearchFilterState(), search: 'taxi' };
    expect(matchesSearchFilterPreview(t, state, undefined, 2)).toBe(true);
    expect(matchesSearchFilterPreview(t, { ...state, search: 'bus' }, undefined, 2)).toBe(false);
  });

  test('matches on category name', () => {
    const t = makeTransaction({ categoryId: 'c1' });
    const state = { ...defaultSearchFilterState(), search: 'groceries' };
    expect(matchesSearchFilterPreview(t, state, 'Groceries', 2)).toBe(true);
  });

  test('type filter excludes non-matching rows', () => {
    const t = makeTransaction({ type: 'income' });
    const state = { ...defaultSearchFilterState(), type: 'expense' as const };
    expect(matchesSearchFilterPreview(t, state, undefined, 2)).toBe(false);
  });

  test('category filter excludes non-matching rows', () => {
    const t = makeTransaction({ categoryId: 'c1' });
    const state = { ...defaultSearchFilterState(), categoryId: 'c2' };
    expect(matchesSearchFilterPreview(t, state, undefined, 2)).toBe(false);
  });

  test('date preset excludes rows outside the window', () => {
    const t = makeTransaction({ occurredAt: '2026-06-01' });
    const state = { ...defaultSearchFilterState(), datePreset: 'thisMonth' as const };
    expect(matchesSearchFilterPreview(t, state, undefined, 2)).toBe(false);
  });
});
