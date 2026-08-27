import { z } from 'zod';

// Mirrors SubscriptionRepository.create's input contract (docs/API_DESIGN.md).
export const subscriptionInputSchema = z.object({
  name: z.string().min(1).max(120),
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
export type SubscriptionInput = z.input<typeof subscriptionInputSchema>;

export const subscriptionUpdateSchema = subscriptionInputSchema.partial();
export type SubscriptionUpdateInput = z.input<typeof subscriptionUpdateSchema>;
