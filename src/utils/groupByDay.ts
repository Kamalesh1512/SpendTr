// Day-grouped ledger sections (docs/design_system/readme.md "Layout rules":
// "Sticky day headers in the ledger, each with the day's net total
// right-aligned"). Mirrors docs/design_system/templates/spendtr-app/
// data.jsx's `groupByDay`/`DAY_LABELS`, adapted to compute the label from a
// real date instead of a fixture lookup table.
import { todayIsoDate } from './date';

export interface DaySection<T> {
  day: string; // YYYY-MM-DD
  label: string;
  items: T[];
  /** Net total: expenses subtract, income adds — in the section's own base-currency terms. */
  totalMinor: number;
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function dayLabel(dayIso: string, today: string = todayIsoDate()): string {
  if (dayIso === today) return 'Today';
  const yesterday = todayIsoDate(new Date(new Date(`${today}T00:00:00`).getTime() - 86400000));
  if (dayIso === yesterday) return 'Yesterday';
  const d = new Date(`${dayIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dayIso;
  return `${WEEKDAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

/**
 * Groups already-sorted (descending by occurredAt) rows into day sections.
 * `netEffect` decides how each row contributes to the day's total (e.g.
 * expenses subtract, income adds, transfers are excluded) — the caller
 * knows its own row shape, this stays generic.
 */
export function groupByDay<T extends { occurredAt: string }>(
  rows: T[],
  netEffect: (row: T) => number,
): DaySection<T>[] {
  const sections: DaySection<T>[] = [];
  for (const row of rows) {
    const day = row.occurredAt.slice(0, 10);
    let section = sections[sections.length - 1];
    if (!section || section.day !== day) {
      section = { day, label: dayLabel(day), items: [], totalMinor: 0 };
      sections.push(section);
    }
    section.items.push(row);
    section.totalMinor += netEffect(row);
  }
  return sections;
}
