// Drizzle schema — mirrors docs/DATABASE_SCHEMA.md exactly. Do not add,
// remove, or rename tables/columns beyond what that document defines
// without flagging it (docs/CLAUDE.md §9). Migrations are generated via
// `npm run db:generate`, never hand-written ALTER TABLE.
import { sql } from 'drizzle-orm';
import { check, index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const currencies = sqliteTable('currencies', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  symbol: text('symbol').notNull(),
  decimalDigits: integer('decimal_digits').notNull().default(2),
});

export const categories = sqliteTable(
  'categories',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    icon: text('icon').notNull(),
    color: text('color').notNull(),
    type: text('type', { enum: ['expense', 'income'] }).notNull(),
    isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: text('created_at').notNull(),
  },
  (t) => [check('categories_type_check', sql`${t.type} IN ('expense','income')`)],
);

export const recurringSubscriptions = sqliteTable(
  'recurring_subscriptions',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
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
    index('idx_subscriptions_next_renewal').on(t.nextRenewalDate),
    check(
      'subscriptions_billing_cycle_check',
      sql`${t.billingCycle} IN ('weekly','monthly','quarterly','yearly')`,
    ),
  ],
);

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    type: text('type', { enum: ['expense', 'income'] }).notNull(),
    amountMinor: integer('amount_minor').notNull(),
    currencyCode: text('currency_code')
      .notNull()
      .references(() => currencies.code),
    baseAmountMinor: integer('base_amount_minor'),
    baseCurrencyCode: text('base_currency_code').references(() => currencies.code),
    categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
    note: text('note'),
    occurredAt: text('occurred_at').notNull(),
    recurringSubscriptionId: text('recurring_subscription_id').references(
      () => recurringSubscriptions.id,
      { onDelete: 'set null' },
    ),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    index('idx_transactions_occurred_at').on(t.occurredAt),
    index('idx_transactions_category_id').on(t.categoryId),
    check('transactions_type_check', sql`${t.type} IN ('expense','income')`),
  ],
);

export const budgets = sqliteTable(
  'budgets',
  {
    id: text('id').primaryKey(),
    categoryId: text('category_id').references(() => categories.id, { onDelete: 'cascade' }),
    amountMinor: integer('amount_minor').notNull(),
    period: text('period', { enum: ['monthly'] }).notNull().default('monthly'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    uniqueIndex('idx_budgets_category_unique').on(t.categoryId),
    check('budgets_period_check', sql`${t.period} IN ('monthly')`),
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
    notificationsEnabled: integer('notifications_enabled', { mode: 'boolean' }).notNull().default(true),
    onboardingComplete: integer('onboarding_complete', { mode: 'boolean' }).notNull().default(false),
    isPro: integer('is_pro', { mode: 'boolean' }).notNull().default(false),
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
