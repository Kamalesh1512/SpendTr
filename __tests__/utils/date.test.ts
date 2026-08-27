import { advanceByBillingCycle, isValidOccurredAt, isValidIsoDateString } from '@/utils/date';

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
