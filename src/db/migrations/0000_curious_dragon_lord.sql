CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`currency_code` text NOT NULL,
	`icon` text NOT NULL,
	`color` text NOT NULL,
	`initial_balance_minor` integer DEFAULT 0 NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`currency_code`) REFERENCES `currencies`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `budget_category_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`budget_id` text NOT NULL,
	`category_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_budget_category_limits_unique` ON `budget_category_limits` (`budget_id`,`category_id`);--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text,
	`amount_minor` integer NOT NULL,
	`period` text DEFAULT 'monthly' NOT NULL,
	`custom_start_date` text,
	`custom_end_date` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "budgets_period_check" CHECK("budgets"."period" IN ('monthly','weekly','daily','custom'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_budgets_category_unique` ON `budgets` (`category_id`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon` text NOT NULL,
	`icon_type` text DEFAULT 'vector' NOT NULL,
	`color` text NOT NULL,
	`type` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT "categories_type_check" CHECK("categories"."type" IN ('expense','income')),
	CONSTRAINT "categories_icon_type_check" CHECK("categories"."icon_type" IN ('vector','emoji'))
);
--> statement-breakpoint
CREATE TABLE `currencies` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`symbol` text NOT NULL,
	`decimal_digits` integer DEFAULT 2 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `debt_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`debt_id` text NOT NULL,
	`transaction_id` text,
	`amount_minor` integer NOT NULL,
	`occurred_at` text NOT NULL,
	FOREIGN KEY (`debt_id`) REFERENCES `debts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `debts` (
	`id` text PRIMARY KEY NOT NULL,
	`counterparty_name` text NOT NULL,
	`direction` text NOT NULL,
	`principal_amount_minor` integer NOT NULL,
	`currency_code` text NOT NULL,
	`account_id` text NOT NULL,
	`is_settled` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`currency_code`) REFERENCES `currencies`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "debts_direction_check" CHECK("debts"."direction" IN ('lent','borrowed'))
);
--> statement-breakpoint
CREATE TABLE `exchange_rates_cache` (
	`base_currency_code` text NOT NULL,
	`target_currency_code` text NOT NULL,
	`rate` real NOT NULL,
	`fetched_at` text NOT NULL,
	PRIMARY KEY(`base_currency_code`, `target_currency_code`),
	FOREIGN KEY (`base_currency_code`) REFERENCES `currencies`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_currency_code`) REFERENCES `currencies`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `goal_contributions` (
	`id` text PRIMARY KEY NOT NULL,
	`goal_id` text NOT NULL,
	`transaction_id` text,
	`amount_minor` integer NOT NULL,
	`occurred_at` text NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`target_amount_minor` integer NOT NULL,
	`currency_code` text NOT NULL,
	`target_date` text,
	`icon` text NOT NULL,
	`color` text NOT NULL,
	`is_achieved` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`currency_code`) REFERENCES `currencies`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recurring_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`account_id` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency_code` text NOT NULL,
	`billing_cycle` text NOT NULL,
	`next_renewal_date` text NOT NULL,
	`category_id` text,
	`reminder_days_before` integer DEFAULT 3 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`currency_code`) REFERENCES `currencies`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "recurring_kind_check" CHECK("recurring_transactions"."kind" IN ('subscription','bill','income')),
	CONSTRAINT "recurring_billing_cycle_check" CHECK("recurring_transactions"."billing_cycle" IN ('weekly','monthly','quarterly','yearly'))
);
--> statement-breakpoint
CREATE INDEX `idx_recurring_next_renewal` ON `recurring_transactions` (`next_renewal_date`);--> statement-breakpoint
CREATE TABLE `transaction_splits` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`category_id` text,
	`amount_minor` integer NOT NULL,
	`note` text,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`type` text NOT NULL,
	`transfer_account_id` text,
	`amount_minor` integer NOT NULL,
	`currency_code` text NOT NULL,
	`base_amount_minor` integer,
	`base_currency_code` text,
	`category_id` text,
	`is_split` integer DEFAULT false NOT NULL,
	`note` text,
	`occurred_at` text NOT NULL,
	`recurring_transaction_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`transfer_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`currency_code`) REFERENCES `currencies`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`base_currency_code`) REFERENCES `currencies`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`recurring_transaction_id`) REFERENCES `recurring_transactions`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "transactions_type_check" CHECK("transactions"."type" IN ('expense','income','transfer'))
);
--> statement-breakpoint
CREATE INDEX `idx_transactions_occurred_at` ON `transactions` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_transactions_category_id` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_account_id` ON `transactions` (`account_id`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`base_currency_code` text NOT NULL,
	`biometric_lock_enabled` integer DEFAULT false NOT NULL,
	`theme` text DEFAULT 'system' NOT NULL,
	`accent_color` text DEFAULT 'default' NOT NULL,
	`notifications_enabled` integer DEFAULT true NOT NULL,
	`onboarding_complete` integer DEFAULT false NOT NULL,
	`is_pro` integer DEFAULT false NOT NULL,
	`pro_restore_linked` integer DEFAULT false NOT NULL,
	`hide_amounts_in_switcher` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`base_currency_code`) REFERENCES `currencies`(`code`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "user_settings_single_row_check" CHECK("user_settings"."id" = 1),
	CONSTRAINT "user_settings_theme_check" CHECK("user_settings"."theme" IN ('system','light','dark'))
);
