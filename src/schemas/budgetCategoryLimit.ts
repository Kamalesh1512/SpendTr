import { z } from 'zod';

// Mirrors BudgetRepository.setCategoryLimit's input contract
// (docs/API_DESIGN.md §1, Phase 2).
export const budgetCategoryLimitInputSchema = z.object({
  amountMinor: z.number().int().positive(),
});

export type BudgetCategoryLimitInput = z.infer<typeof budgetCategoryLimitInputSchema>;
