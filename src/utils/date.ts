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

export function todayIsoDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
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
  const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
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
