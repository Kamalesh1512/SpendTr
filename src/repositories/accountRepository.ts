// AccountRepository (docs/API_DESIGN.md §1). getRunningBalance() is the
// direct implementation of Gap #1 (docs/PRD.md §2) — it computes month-end
// balances by folding all transactions/transfers up to each month boundary,
// never by storing a redundant running-total column
// (docs/CODING_STANDARDS.md "Data Access Layer").
//
// Currency note: a running balance is computed in the account's own
// currency (accounts.currency_code), not the app's base currency — the
// design's AccountDetail chart renders in the account's currency. This
// repository sums transactions.amount_minor directly rather than
// base_amount_minor, on the assumption that a transaction posted to an
// account is entered in that account's currency (the normal case for a
// wallet). A transaction entered under an account in a *different*
// currency than that account's own would be summed at face value here,
// not converted — this is a known simplification (flagged in the
// implementation plan, "Transfers have no designed UI") rather than a
// silent bug; revisit if multi-currency-per-account entry becomes a
// real product need.
import { and, eq, lt, or } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { getDb } from '../db/client';
import { accounts, currencies, transactions } from '../db/schema';
import { NotFoundError, PaywallRequiredError, ValidationError } from '../types/errors';
import { monthKeyExclusiveEnd, trailingMonthKeys } from '../utils/date';
import { convertToBase } from '../services/currency';
import * as settingsRepository from './settingsRepository';

export type Account = typeof accounts.$inferSelect;

export interface CreateAccountInput {
  name: string;
  currencyCode: string;
  icon: string;
  color: string;
  initialBalanceMinor?: number;
}

async function assertCurrencyExists(code: string): Promise<void> {
  const db = getDb();
  const [row] = await db.select().from(currencies).where(eq(currencies.code, code)).limit(1);
  if (!row) throw new ValidationError(`Unknown currency code: ${code}`);
}

const FREE_TIER_ACCOUNT_LIMIT = 1;

export async function create(input: CreateAccountInput): Promise<Account> {
  if (!input.name.trim()) throw new ValidationError('Account name is required');
  await assertCurrencyExists(input.currencyCode);

  const db = getDb();
  const existing = await db.select({ id: accounts.id }).from(accounts);

  if (existing.length > 0) {
    // The very first account (created during onboarding) is exempt from
    // the free-tier gate — it's the one account every user gets for free
    // (docs/MONETIZATION.md "Always free: ... single account").
    const settings = await settingsRepository.get();
    if (!settings.isPro && existing.length >= FREE_TIER_ACCOUNT_LIMIT) {
      throw new PaywallRequiredError(
        'account_limit',
        `Free tier is limited to ${FREE_TIER_ACCOUNT_LIMIT} account. Upgrade to Pro for multiple accounts.`,
      );
    }
  }

  const now = new Date().toISOString();
  const [row] = await db
    .insert(accounts)
    .values({
      id: randomUUID(),
      name: input.name.trim(),
      currencyCode: input.currencyCode,
      icon: input.icon,
      color: input.color,
      initialBalanceMinor: input.initialBalanceMinor ?? 0,
      isDefault: existing.length === 0,
      sortOrder: existing.length,
      createdAt: now,
    })
    .returning();
  if (!row) throw new ValidationError('Failed to create account');
  return row;
}

export async function update(id: string, input: Partial<CreateAccountInput>): Promise<Account> {
  const db = getDb();
  const [existing] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  if (!existing) throw new NotFoundError('Account', id);
  if (input.currencyCode) await assertCurrencyExists(input.currencyCode);

  const [row] = await db
    .update(accounts)
    .set({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.currencyCode !== undefined ? { currencyCode: input.currencyCode } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.initialBalanceMinor !== undefined ? { initialBalanceMinor: input.initialBalanceMinor } : {}),
    })
    .where(eq(accounts.id, id))
    .returning();
  if (!row) throw new NotFoundError('Account', id);
  return row;
}

export async function deleteAccount(id: string): Promise<void> {
  const db = getDb();
  const all = await db.select({ id: accounts.id }).from(accounts);
  if (all.length <= 1) {
    throw new ValidationError('The only remaining account cannot be deleted.');
  }
  const result = await db.delete(accounts).where(eq(accounts.id, id)).returning({ id: accounts.id });
  if (result.length === 0) throw new NotFoundError('Account', id);
}

export async function list(): Promise<Account[]> {
  const db = getDb();
  return db.select().from(accounts).orderBy(accounts.sortOrder);
}

/**
 * Month-end closing balances for `accountId` over the trailing `months`
 * months (oldest first), each folding: the account's initial balance, plus
 * every expense/income posted to it, plus both legs of every transfer
 * touching it — up to that month's boundary. Never a stored column.
 */
export async function getRunningBalance(
  accountId: string,
  months: number,
): Promise<{ month: string; balanceMinor: number }[]> {
  const db = getDb();
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  if (!account) throw new NotFoundError('Account', accountId);

  const monthKeys = trailingMonthKeys(months);
  const results: { month: string; balanceMinor: number }[] = [];

  for (const monthKey of monthKeys) {
    const cutoff = monthKeyExclusiveEnd(monthKey); // first day of the *next* month
    const rows = await db
      .select()
      .from(transactions)
      .where(
        and(
          lt(transactions.occurredAt, cutoff),
          or(eq(transactions.accountId, accountId), eq(transactions.transferAccountId, accountId)),
        ),
      );

    let balanceMinor = account.initialBalanceMinor;
    for (const row of rows) {
      if (row.type === 'transfer') {
        if (row.accountId === accountId) balanceMinor -= row.amountMinor;
        if (row.transferAccountId === accountId) balanceMinor += row.amountMinor;
      } else if (row.accountId === accountId) {
        balanceMinor += row.type === 'income' ? row.amountMinor : -row.amountMinor;
      }
    }
    results.push({ month: monthKey, balanceMinor });
  }

  return results;
}

/**
 * Today's balance for a single account, in that account's own currency —
 * the current month's closing figure from `getRunningBalance`, since that
 * fold already includes every transaction up to now (docs/API_DESIGN.md
 * doesn't name this method; added per the implementation plan §5.2 for
 * AccountSwitcher's per-row balances).
 */
export async function getCurrentBalance(accountId: string): Promise<number> {
  const [current] = await getRunningBalance(accountId, 1);
  return current?.balanceMinor ?? 0;
}

/**
 * Sum of every account's current balance, converted into the app's base
 * currency (docs/API_DESIGN.md doesn't name this method; added per the
 * implementation plan §5.2 — "an all-accounts base-currency total
 * (AccountSwitcher's 'All accounts')"). A balance that can't be converted
 * (no cached/bundled rate for that pair) is excluded from the total rather
 * than silently treated as zero, and its currency is reported alongside.
 */
export async function getAllAccountsBaseTotal(): Promise<{
  totalBaseMinor: number;
  baseCurrencyCode: string;
  unconvertedCurrencyCodes: string[];
}> {
  const db = getDb();
  const settings = await settingsRepository.get();
  const all = await list();
  let totalBaseMinor = 0;
  const unconvertedCurrencyCodes = new Set<string>();

  for (const account of all) {
    const balanceMinor = await getCurrentBalance(account.id);
    const conversion = await convertToBase(db, balanceMinor, account.currencyCode, settings.baseCurrencyCode);
    if (conversion.baseAmountMinor === null) {
      unconvertedCurrencyCodes.add(account.currencyCode);
      continue;
    }
    totalBaseMinor += conversion.baseAmountMinor;
  }

  return {
    totalBaseMinor,
    baseCurrencyCode: settings.baseCurrencyCode,
    unconvertedCurrencyCodes: [...unconvertedCurrencyCodes],
  };
}

export { deleteAccount as delete };
