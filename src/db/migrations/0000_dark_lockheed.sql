CREATE TABLE `budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text,
	`amount_minor` integer NOT NULL,
	`period` text DEFAULT 'monthly' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "budgets_period_check" CHECK("budgets"."period" IN ('monthly'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_budgets_category_unique` ON `budgets` (`category_id`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon` text NOT NULL,
	`color` text NOT NULL,
	`type` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT "categories_type_check" CHECK("categories"."type" IN ('expense','income'))
);
--> statement-breakpoint
CREATE TABLE `currencies` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`symbol` text NOT NULL,
	`decimal_digits` integer DEFAULT 2 NOT NULL
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
CREATE TABLE `recurring_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
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
	FOREIGN KEY (`currency_code`) REFERENCES `currencies`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "subscriptions_billing_cycle_check" CHECK("recurring_subscriptions"."billing_cycle" IN ('weekly','monthly','quarterly','yearly'))
);
--> statement-breakpoint
CREATE INDEX `idx_subscriptions_next_renewal` ON `recurring_subscriptions` (`next_renewal_date`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency_code` text NOT NULL,
	`base_amount_minor` integer,
	`base_currency_code` text,
	`category_id` text,
	`note` text,
	`occurred_at` text NOT NULL,
	`recurring_subscription_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`currency_code`) REFERENCES `currencies`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`base_currency_code`) REFERENCES `currencies`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`recurring_subscription_id`) REFERENCES `recurring_subscriptions`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "transactions_type_check" CHECK("transactions"."type" IN ('expense','income'))
);
--> statement-breakpoint
CREATE INDEX `idx_transactions_occurred_at` ON `transactions` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_transactions_category_id` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`base_currency_code` text NOT NULL,
	`biometric_lock_enabled` integer DEFAULT false NOT NULL,
	`theme` text DEFAULT 'system' NOT NULL,
	`notifications_enabled` integer DEFAULT true NOT NULL,
	`onboarding_complete` integer DEFAULT false NOT NULL,
	`is_pro` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`base_currency_code`) REFERENCES `currencies`(`code`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "user_settings_single_row_check" CHECK("user_settings"."id" = 1),
	CONSTRAINT "user_settings_theme_check" CHECK("user_settings"."theme" IN ('system','light','dark'))
);
