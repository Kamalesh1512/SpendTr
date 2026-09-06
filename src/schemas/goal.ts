import { z } from 'zod';

// Mirrors GoalRepository.create's input contract (docs/API_DESIGN.md §1).
export const goalInputSchema = z.object({
  name: z.string().min(1).max(80),
  targetAmountMinor: z.number().int().positive(),
  currencyCode: z.string().length(3),
  targetDate: z.string().min(10).optional(),
  icon: z.string().min(1),
  color: z.string().min(1),
});

export type GoalInput = z.infer<typeof goalInputSchema>;

export const goalUpdateSchema = goalInputSchema.partial();
export type GoalUpdateInput = z.infer<typeof goalUpdateSchema>;

export const goalContributionInputSchema = z.object({
  amountMinor: z.number().int().positive(),
  occurredAt: z.string().min(10),
  transactionId: z.string().uuid().optional(),
});

export type GoalContributionInput = z.infer<typeof goalContributionInputSchema>;
