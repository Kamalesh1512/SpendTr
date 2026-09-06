// Drizzle schema — mirrors docs/DATABASE_SCHEMA.md. All Phase 1 and Phase 2
// tables are defined up front (docs/CLAUDE.md section 7) to avoid a
// disruptive later migration, but Phase 2 tables get no UI built against
// them until Phase 2 begins (docs/CLAUDE.md section 11).
//
// Two columns exist beyond DATABASE_SCHEMA.md, both flagged there in the
// same change that added this file:
//   - accounts.initial_balance_minor: the design's onboarding "Starting
//     balance" field needs an opening figure for AccountRepository's
//     running-balance fold; without it every account starts at zero.
//   - user_settings.hide_amounts_in_switcher: the designed Settings
//     screen's "Hide amounts in the app switcher" toggle.
//
// Do not add, remove, or rename anything else without flagging it.
import { sql } from 'drizzle-orm';
import { check, index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

// ---------------------------------------------------------------- Phase 1

export const currencies = sqliteTable('currencies', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  symbol: text('symbol').notNull(),
  decimalDigits: integer('decimal_digits').notNull().default(2),
});

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  currencyCode: text('currency_code')
    .notNull()
    .references(() => currencies.code),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  // Not in DATABASE_SCHEMA.md — see file header.
  initialBalanceMinor: integer('initial_balance_minor').notNull().default(0),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

export const categories = sqliteTable(
  'categories',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    icon: text('icon').notNull(),
    iconType: text('icon_type', { enum: ['vector', 'emoji'] }).notNull().default('vector'),
    color: text('color').notNull(),
    type: text('type', { enum: ['expense', 'income'] }).notNull(),
    isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    check('categories_type_check', sql`${t.type} IN ('expense','income')`),
    check('categories_icon_type_check', sql`${t.iconType} IN ('vector','emoji')`),
  ],
);

export const recurringTransactions = sqliteTable(
  'recurring_transactions',
  {
    id: text('id').primaryKey(),
    kind: text('kind', { enum: ['subscription', 'bill', 'income'] }).notNull(),
    name: text('name').notNull(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
    amountMinor: integer('amount_minor').notNull(),
    currencyCode: text('currency_code')
      .notNull()
      .references(() => currencies.code),
    billingCycle: text('billing_cycle', {
      enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
    }).notNull(),
    nextRenewalDate: text('next_renewal_date').notNull(),
    categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
    reminderDaysBefore: integer('reminder_days_before').notNull().default(3),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    index('idx_recurring_next_renewal').on(t.nextRenewalDate),
    check('recurring_kind_check', sql`${t.kind} IN ('subscription','bill','income')`),
    check(
      'recurring_billing_cycle_check',
      sql`${t.billingCycle} IN ('weekly','monthly','quarterly','yearly')`,
    ),
  ],
);

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict' }),
    type: text('type', { enum: ['expense', 'income', 'transfer'] }).notNull(),
    transferAccountId: text('transfer_account_id').references(() => accounts.id),
    amountMinor: integer('amount_minor').notNull(),
    currencyCode: text('currency_code')
      .notNull()
      .references(() => currencies.code),
    baseAmountMinor: integer('base_amount_minor'),
    baseCurrencyCode: text('base_currency_code').references(() => currencies.code),
    categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
    isSplit: integer('is_split', { mode: 'boolean' }).notNull().default(false),
    note: text('note'),
    occurredAt: text('occurred_at').notNull(),
    recurringTransactionId: text('recurring_transaction_id').references(
      () => recurringTransactions.id,
      { onDelete: 'set null' },
    ),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    index('idx_transactions_occurred_at').on(t.occurredAt),
    index('idx_transactions_category_id').on(t.categoryId),
    index('idx_transactions_account_id').on(t.accountId),
    check('transactions_type_check', sql`${t.type} IN ('expense','income','transfer')`),
  ],
);

export const budgets = sqliteTable(
  'budgets',
  {
    id: text('id').primaryKey(),
    categoryId: text('category_id').references(() => categories.id, { onDelete: 'cascade' }),
    amountMinor: integer('amount_minor').notNull(),
    period: text('period', { enum: ['monthly', 'weekly', 'daily', 'custom'] })
      .notNull()
      .default('monthly'),
    customStartDate: text('custom_start_date'),
    customEndDate: text('custom_end_date'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    uniqueIndex('idx_budgets_category_unique').on(t.categoryId),
    check('budgets_period_check', sql`${t.period} IN ('monthly','weekly','daily','custom')`),
  ],
);

export const userSettings = sqliteTable(
  'user_settings',
  {
    id: integer('id').primaryKey(),
    baseCurrencyCode: text('base_currency_code')
      .notNull()
      .references(() => currencies.code),
    biometricLockEnabled: integer('biometric_lock_enabled', { mode: 'boolean' }).notNull().default(false),
    theme: text('theme', { enum: ['system', 'light', 'dark'] }).notNull().default('system'),
    accentColor: text('accent_color').notNull().default('default'),
    notificationsEnabled: integer('notifications_enabled', { mode: 'boolean' }).notNull().default(true),
    onboardingComplete: integer('onboarding_complete', { mode: 'boolean' }).notNull().default(false),
    isPro: integer('is_pro', { mode: 'boolean' }).notNull().default(false),
    proRestoreLinked: integer('pro_restore_linked', { mode: 'boolean' }).notNull().default(false),
    // Not in DATABASE_SCHEMA.md — see file header.
    hideAmountsInSwitcher: integer('hide_amounts_in_switcher', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    check('user_settings_single_row_check', sql`${t.id} = 1`),
    check('user_settings_theme_check', sql`${t.theme} IN ('system','light','dark')`),
  ],
);

export const exchangeRatesCache = sqliteTable(
  'exchange_rates_cache',
  {
    baseCurrencyCode: text('base_currency_code')
      .notNull()
      .references(() => currencies.code),
    targetCurrencyCode: text('target_currency_code')
      .notNull()
      .references(() => currencies.code),
    rate: real('rate').notNull(),
    fetchedAt: text('fetched_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.baseCurrencyCode, t.targetCurrencyCode] })],
);

// ---------------------------------------------------------------- Phase 2
// Defined now per docs/CLAUDE.md section 7; no UI is built against these
// until Phase 2 begins (docs/CLAUDE.md section 11).

export const transactionSplits = sqliteTable('transaction_splits', {
  id: text('id').primaryKey(),
  transactionId: text('transaction_id')
    .notNull()
    .references(() => transactions.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  amountMinor: integer('amount_minor').notNull(),
  note: text('note'),
});

export const budgetCategoryLimits = sqliteTable(
  'budget_category_limits',
  {
    id: text('id').primaryKey(),
    budgetId: text('budget_id')
      .notNull()
      .references(() => budgets.id, { onDelete: 'cascade' }),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    amountMinor: integer('amount_minor').notNull(),
  },
  (t) => [uniqueIndex('idx_budget_category_limits_unique').on(t.budgetId, t.categoryId)],
);

export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  targetAmountMinor: integer('target_amount_minor').notNull(),
  currencyCode: text('currency_code')
    .notNull()
    .references(() => currencies.code),
  targetDate: text('target_date'),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  isAchieved: integer('is_achieved', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const goalContributions = sqliteTable('goal_contributions', {
  id: text('id').primaryKey(),
  goalId: text('goal_id')
    .notNull()
    .references(() => goals.id, { onDelete: 'cascade' }),
  transactionId: text('transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
  amountMinor: integer('amount_minor').notNull(),
  occurredAt: text('occurred_at').notNull(),
});

export const debts = sqliteTable(
  'debts',
  {
    id: text('id').primaryKey(),
    counterpartyName: text('counterparty_name').notNull(),
    direction: text('direction', { enum: ['lent', 'borrowed'] }).notNull(),
    principalAmountMinor: integer('principal_amount_minor').notNull(),
    currencyCode: text('currency_code')
      .notNull()
      .references(() => currencies.code),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
    isSettled: integer('is_settled', { mode: 'boolean' }).notNull().default(false),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [check('debts_direction_check', sql`${t.direction} IN ('lent','borrowed')`)],
);

export const debtPayments = sqliteTable('debt_payments', {
  id: text('id').primaryKey(),
  debtId: text('debt_id')
    .notNull()
    .references(() => debts.id, { onDelete: 'cascade' }),
  transactionId: text('transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
  amountMinor: integer('amount_minor').notNull(),
  occurredAt: text('occurred_at').notNull(),
});
