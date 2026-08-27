import { z } from 'zod';

// Mirrors BudgetRepository.upsert's input contract (docs/API_DESIGN.md).
// categoryId omitted = overall monthly budget.
export const budgetInputSchema = z.object({
  categoryId: z.string().uuid().optional(),
  amountMinor: z.number().int().positive(),
});

export type BudgetInput = z.infer<typeof budgetInputSchema>;
