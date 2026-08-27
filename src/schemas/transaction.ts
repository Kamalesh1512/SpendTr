import { z } from 'zod';

// Mirrors TransactionRepository.create's input contract (docs/API_DESIGN.md).
// Used by both the Add/Edit Transaction form (react-hook-form resolver) and
// re-validated inside TransactionRepository itself, per
// docs/CODING_STANDARDS.md "Form Validation".
export const transactionInputSchema = z.object({
  type: z.enum(['expense', 'income']),
  amountMinor: z.number().int().positive(),
  currencyCode: z.string().length(3),
  categoryId: z.string().uuid().optional(),
  note: z.string().max(280).optional(),
  occurredAt: z.string().min(10),
  recurringSubscriptionId: z.string().uuid().optional(),
});

export type TransactionInput = z.infer<typeof transactionInputSchema>;

export const transactionUpdateSchema = transactionInputSchema.partial();
export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>;
