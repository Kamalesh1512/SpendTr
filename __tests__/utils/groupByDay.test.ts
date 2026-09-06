import { dayLabel, groupByDay } from '@/utils/groupByDay';

describe('groupByDay', () => {
  const today = '2026-08-29';

  test('dayLabel renders Today/Yesterday relative to the given today', () => {
    expect(dayLabel('2026-08-29', today)).toBe('Today');
    expect(dayLabel('2026-08-28', today)).toBe('Yesterday');
    expect(dayLabel('2026-08-27', today)).toBe('Thu 27 Aug');
  });

  test('groups consecutive same-day rows into one section, preserving order', () => {
    const rows = [
      { occurredAt: '2026-08-29T00:00:00.000Z', id: 'a' },
      { occurredAt: '2026-08-29T00:00:00.000Z', id: 'b' },
      { occurredAt: '2026-08-28T00:00:00.000Z', id: 'c' },
    ];
    const sections = groupByDay(rows, () => 0);
    expect(sections).toHaveLength(2);
    expect(sections[0]!.day).toBe('2026-08-29');
    expect(sections[0]!.items.map((r) => r.id)).toEqual(['a', 'b']);
    expect(sections[1]!.day).toBe('2026-08-28');
  });

  test('does not merge non-consecutive rows sharing a day (input assumed pre-sorted)', () => {
    const rows = [
      { occurredAt: '2026-08-29', id: 'a' },
      { occurredAt: '2026-08-28', id: 'b' },
      { occurredAt: '2026-08-29', id: 'c' },
    ];
    const sections = groupByDay(rows, () => 0);
    expect(sections).toHaveLength(3);
  });

  test('sums netEffect per section — expenses subtract, income adds, transfers excluded', () => {
    const rows = [
      { occurredAt: '2026-08-29', type: 'expense' as const, amountMinor: 500 },
      { occurredAt: '2026-08-29', type: 'income' as const, amountMinor: 2000 },
      { occurredAt: '2026-08-29', type: 'transfer' as const, amountMinor: 9999 },
    ];
    const sections = groupByDay(rows, (r) =>
      r.type === 'transfer' ? 0 : r.type === 'income' ? r.amountMinor : -r.amountMinor,
    );
    expect(sections[0]!.totalMinor).toBe(1500);
  });
});
