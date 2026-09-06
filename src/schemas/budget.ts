import { z } from 'zod';

// Mirrors BudgetRepository.upsert's input contract (docs/API_DESIGN.md).
// categoryId omitted = overall budget. `period` defaults to 'monthly'
// (Phase 1); weekly/daily/custom are Phase 2 and require Pro
// (docs/MONETIZATION.md).
export const budgetInputSchema = z
  .object({
    categoryId: z.string().uuid().optional(),
    amountMinor: z.number().int().positive(),
    period: z.enum(['monthly', 'weekly', 'daily', 'custom']).default('monthly'),
    customStartDate: z.string().min(10).optional(),
    customEndDate: z.string().min(10).optional(),
  })
  .refine((v) => v.period !== 'custom' || (!!v.customStartDate && !!v.customEndDate), {
    message: 'customStartDate and customEndDate are required when period is "custom"',
    path: ['customStartDate'],
  })
  .refine((v) => v.period !== 'custom' || v.customStartDate! <= v.customEndDate!, {
    message: 'customStartDate must be on or before customEndDate',
    path: ['customEndDate'],
  });

// z.input, not z.infer: `period` has a schema-level default, so callers may
// omit it entirely — only the parsed/output shape (used inside the
// repository after `.parse()`) has it as always-present.
export type BudgetInput = z.input<typeof budgetInputSchema>;
