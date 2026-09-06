import { z } from 'zod';

// Mirrors RecurringTransactionRepository.create's input contract
// (docs/API_DESIGN.md §1). Renamed from schemas/subscription.ts —
// recurring_transactions covers subscriptions, bills, and income under one
// mechanism (docs/DATABASE_SCHEMA.md).
export const recurringTransactionInputSchema = z.object({
  kind: z.enum(['subscription', 'bill', 'income']),
  name: z.string().min(1).max(120),
  accountId: z.string().uuid(),
  amountMinor: z.number().int().positive(),
  currencyCode: z.string().length(3),
  billingCycle: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
  nextRenewalDate: z.string().min(10),
  categoryId: z.string().uuid().optional(),
  reminderDaysBefore: z.number().int().min(0).max(30).default(3),
});

// z.input (not z.infer/output) so reminderDaysBefore stays optional here,
// matching the documented contract — the schema still fills the default
// when .parse() runs inside the repository.
export type RecurringTransactionInput = z.input<typeof recurringTransactionInputSchema>;

export const recurringTransactionUpdateSchema = recurringTransactionInputSchema.partial();
export type RecurringTransactionUpdateInput = z.input<typeof recurringTransactionUpdateSchema>;
