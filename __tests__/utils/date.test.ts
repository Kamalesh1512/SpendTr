import { advanceByBillingCycle, isValidOccurredAt, isValidIsoDateString, monthBounds, todayIsoDate, weekBounds } from '@/utils/date';

describe('todayIsoDate', () => {
  // Regression test for the DatePicker "picked the 9th, got the 8th" bug:
  // the native date picker returns a Date at *local* midnight of the tapped
  // day. todayIsoDate must echo back that same local calendar day — using
  // toISOString() (UTC) instead shifts the date back a day in any
  // positive-UTC-offset timezone (e.g. IST). `new Date(y, m, d)` builds a
  // Date from local components, so this holds regardless of the test
  // runner's own timezone.
  test('returns the local calendar date, not the UTC date', () => {
    const localMidnightAug9 = new Date(2026, 7, 9); // month is 0-indexed
    expect(todayIsoDate(localMidnightAug9)).toBe('2026-08-09');
  });

  test('pads single-digit month and day', () => {
    expect(todayIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('isValidIsoDateString', () => {
  test('accepts valid ISO date strings', () => {
    expect(isValidIsoDateString('2026-08-26')).toBe(true);
    expect(isValidIsoDateString('2026-08-26T10:00:00.000Z')).toBe(true);
  });

  test('rejects malformed strings', () => {
    expect(isValidIsoDateString('not-a-date')).toBe(false);
    expect(isValidIsoDateString('08/26/2026')).toBe(false);
  });
});

describe('isValidOccurredAt', () => {
  const now = new Date('2026-08-26T12:00:00.000Z');

  test('accepts today and past dates', () => {
    expect(isValidOccurredAt('2026-08-26', now)).toBe(true);
    expect(isValidOccurredAt('2020-01-01', now)).toBe(true);
  });

  test('rejects dates clearly in the future', () => {
    expect(isValidOccurredAt('2026-09-01', now)).toBe(false);
  });

  test('rejects malformed input', () => {
    expect(isValidOccurredAt('not-a-date', now)).toBe(false);
  });
});

describe('advanceByBillingCycle', () => {
  test('weekly adds 7 days', () => {
    expect(advanceByBillingCycle('2026-08-01', 'weekly')).toBe('2026-08-08');
  });

  test('monthly adds one calendar month', () => {
    expect(advanceByBillingCycle('2026-01-15', 'monthly')).toBe('2026-02-15');
  });

  test('monthly from the 31st clamps into a 30-day month instead of overflowing', () => {
    expect(advanceByBillingCycle('2026-01-31', 'monthly')).toBe('2026-02-28');
  });

  test('monthly from the 31st into a 31-day month keeps the 31st', () => {
    expect(advanceByBillingCycle('2026-03-31', 'monthly')).toBe('2026-04-30');
  });

  test('quarterly adds three months with clamping', () => {
    expect(advanceByBillingCycle('2026-11-30', 'quarterly')).toBe('2027-02-28');
  });

  test('yearly adds twelve months, preserving Feb 29 -> Feb 28/29 correctly', () => {
    expect(advanceByBillingCycle('2024-02-29', 'yearly')).toBe('2025-02-28');
    expect(advanceByBillingCycle('2028-02-29', 'yearly')).toBe('2029-02-28');
  });

  test('monthly from a leap day advances to the same day number when the target month has it', () => {
    expect(advanceByBillingCycle('2024-02-29', 'monthly')).toBe('2024-03-29');
    expect(advanceByBillingCycle('2028-02-29', 'weekly')).toBe('2028-03-07');
  });
});

describe('monthBounds', () => {
  test('returns the first and last day of the containing month', () => {
    expect(monthBounds('2026-08-17')).toEqual({ start: '2026-08-01', end: '2026-08-31' });
  });

  test('handles a 28-day February', () => {
    expect(monthBounds('2026-02-10')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
  });

  test('handles a leap-year February', () => {
    expect(monthBounds('2024-02-10')).toEqual({ start: '2024-02-01', end: '2024-02-29' });
  });
});

describe('weekBounds', () => {
  test('returns Monday-Sunday for a mid-week anchor', () => {
    // 2026-08-19 is a Wednesday.
    expect(weekBounds('2026-08-19')).toEqual({ start: '2026-08-17', end: '2026-08-23' });
  });

  test('an anchor that is already Monday is its own week start', () => {
    expect(weekBounds('2026-08-17')).toEqual({ start: '2026-08-17', end: '2026-08-23' });
  });

  test('an anchor that is Sunday is its own week end', () => {
    expect(weekBounds('2026-08-23')).toEqual({ start: '2026-08-17', end: '2026-08-23' });
  });

  test('a week spanning a month boundary resolves correctly', () => {
    // 2026-08-31 is a Monday.
    expect(weekBounds('2026-08-31')).toEqual({ start: '2026-08-31', end: '2026-09-06' });
  });
});
