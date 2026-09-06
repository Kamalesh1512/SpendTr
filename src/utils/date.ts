// Date helpers. All persisted dates are ISO 8601 strings (UTC) per
// docs/DATABASE_SCHEMA.md. Recurring-subscription date math lives here so
// SubscriptionRepository can call a small, independently-testable function
// (docs/TESTING_STRATEGY.md calls this out as high-priority coverage).

export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}/;

export function isValidIsoDateString(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const time = Date.parse(value);
  return !Number.isNaN(time);
}

/**
 * Returns `now`'s calendar date in *local* time as YYYY-MM-DD. Deliberately
 * not `now.toISOString().slice(0, 10)` — that reads the UTC calendar day,
 * which is a different date than local for part of every day in any
 * timezone with a non-zero offset (e.g. the native date picker returns a
 * `Date` at local midnight of the tapped day; converting that through UTC
 * shifts the date back a day for any positive-offset timezone such as IST).
 * Every caller of this function wants "today/this day as the user experiences
 * it," not the UTC calendar day.
 */
export function todayIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validates that `occurredAt` is not in the future beyond "today", allowing
 * same-day entry regardless of the device's local time zone relative to UTC
 * (docs/API_DESIGN.md TransactionRepository validation rules). Because a
 * local "today" can be either behind or ahead of UTC "today", we accept any
 * date up to the later of the two.
 */
export function isValidOccurredAt(dateIso: string, now: Date = new Date()): boolean {
  if (!isValidIsoDateString(dateIso)) return false;
  const inputDate = dateIso.slice(0, 10);
  const utcToday = now.toISOString().slice(0, 10);
  const localToday = todayIsoDate(now);
  const maxAllowed = utcToday > localToday ? utcToday : localToday;
  return inputDate <= maxAllowed;
}

/**
 * Advances a date by one billing cycle, clamping day-of-month overflow to
 * the last valid day of the target month (e.g. Jan 31 + monthly -> Feb 28,
 * not Mar 3) — the edge case explicitly called out in TESTING_STRATEGY.md.
 */
export function advanceByBillingCycle(dateIso: string, cycle: BillingCycle): string {
  const d = new Date(`${dateIso.slice(0, 10)}T00:00:00.000Z`);

  if (cycle === 'weekly') {
    d.setUTCDate(d.getUTCDate() + 7);
    return d.toISOString().slice(0, 10);
  }

  const monthsToAdd = cycle === 'monthly' ? 1 : cycle === 'quarterly' ? 3 : 12;
  const originalDay = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + monthsToAdd);
  const daysInTargetMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(originalDay, daysInTargetMonth));
  return d.toISOString().slice(0, 10);
}

/** Advances `nextRenewalDate` repeatedly until it is in the future relative to `now`. */
export function advanceUntilFuture(dateIso: string, cycle: BillingCycle, now: Date = new Date()): string {
  let next = dateIso;
  const todayStr = todayIsoDate(now);
  let guard = 0;
  while (next.slice(0, 10) <= todayStr && guard < 1000) {
    next = advanceByBillingCycle(next, cycle);
    guard += 1;
  }
  return next;
}

export function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso.slice(0, 10)}T00:00:00.000Z`).getTime();
  const to = new Date(`${toIso.slice(0, 10)}T00:00:00.000Z`).getTime();
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

export function nowIso(now: Date = new Date()): string {
  return now.toISOString();
}

/**
 * Returns `count` YYYY-MM month keys ending at (and including) `endMonth`
 * (default: the current month), oldest first — the bucket sequence
 * AccountRepository.getRunningBalance folds transactions into
 * (docs/API_DESIGN.md AccountRepository).
 */
export function trailingMonthKeys(count: number, endMonth: string = todayIsoDate().slice(0, 7)): string[] {
  const [endYear, endMon] = endMonth.split('-').map(Number);
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(endYear!, endMon! - 1 - i, 1));
    months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

/** The first day of the month *after* the given YYYY-MM key, as YYYY-MM-DD. */
export function monthKeyExclusiveEnd(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const d = new Date(Date.UTC(year!, month!, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Inclusive [start, end] of the calendar month containing `anchorIso`. */
export function monthBounds(anchorIso: string): { start: string; end: string } {
  const monthKey = anchorIso.slice(0, 7);
  const [year, month] = monthKey.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year!, month!, 0)).getUTCDate();
  return { start: `${monthKey}-01`, end: `${monthKey}-${String(lastDay).padStart(2, '0')}` };
}

/**
 * Inclusive [start, end] of the ISO week (Monday-Sunday) containing
 * `anchorIso` — the window a `period: 'weekly'` budget resets on
 * (docs/DATABASE_SCHEMA.md `budgets`, Phase 2).
 */
export function weekBounds(anchorIso: string): { start: string; end: string } {
  const d = new Date(`${anchorIso.slice(0, 10)}T00:00:00.000Z`);
  const isoDayOfWeek = (d.getUTCDay() + 6) % 7; // Monday = 0 ... Sunday = 6
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - isoDayOfWeek);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) };
}
