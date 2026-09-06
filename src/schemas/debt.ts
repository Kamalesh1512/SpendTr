import { z } from 'zod';

// Mirrors DebtRepository.create's input contract (docs/API_DESIGN.md §1).
export const debtInputSchema = z.object({
  counterpartyName: z.string().min(1).max(80),
  direction: z.enum(['lent', 'borrowed']),
  principalAmountMinor: z.number().int().positive(),
  currencyCode: z.string().length(3),
  accountId: z.string().uuid(),
  notes: z.string().max(280).optional(),
});

export type DebtInput = z.infer<typeof debtInputSchema>;

export const debtUpdateSchema = debtInputSchema.partial();
export type DebtUpdateInput = z.infer<typeof debtUpdateSchema>;

export const debtPaymentInputSchema = z.object({
  amountMinor: z.number().int().positive(),
  occurredAt: z.string().min(10),
  transactionId: z.string().uuid().optional(),
});

export type DebtPaymentInput = z.infer<typeof debtPaymentInputSchema>;
