import { z } from 'zod';

// Mirrors TransactionRepository.create's input contract (docs/API_DESIGN.md
// §1). Used by both the Add/Edit Transaction form (react-hook-form
// resolver) and re-validated inside TransactionRepository itself, per
// docs/CODING_STANDARDS.md "Form Validation".
//
// `splits` (Phase 2) mirrors API_DESIGN.md exactly. TransactionRepository
// enforces that the split amounts sum exactly to amountMinor
// (docs/CLAUDE.md §10) and writes/replaces the transaction_splits rows.
export const transactionInputSchema = z
  .object({
    accountId: z.string().uuid(),
    type: z.enum(['expense', 'income', 'transfer']),
    transferAccountId: z.string().uuid().optional(),
    amountMinor: z.number().int().positive(),
    currencyCode: z.string().length(3),
    categoryId: z.string().uuid().optional(),
    splits: z
      .array(
        z.object({
          categoryId: z.string().uuid().optional(),
          amountMinor: z.number().int().positive(),
          note: z.string().max(280).optional(),
        }),
      )
      .min(2)
      .optional(),
    note: z.string().max(280).optional(),
    occurredAt: z.string().min(10),
    recurringTransactionId: z.string().uuid().optional(),
  })
  .refine((v) => v.type !== 'transfer' || !!v.transferAccountId, {
    message: 'transferAccountId is required when type is "transfer"',
    path: ['transferAccountId'],
  })
  .refine((v) => v.type !== 'transfer' || v.transferAccountId !== v.accountId, {
    message: 'transferAccountId must differ from accountId',
    path: ['transferAccountId'],
  });

export type TransactionInput = z.infer<typeof transactionInputSchema>;

// .partial() doesn't compose with .refine() (ZodEffects has no .partial()),
// so the update schema re-declares the same shape as partial and re-applies
// the transfer-target-required refinement only when type is being changed
// to 'transfer' explicitly in this same update.
export const transactionUpdateSchema = z
  .object({
    accountId: z.string().uuid(),
    type: z.enum(['expense', 'income', 'transfer']),
    transferAccountId: z.string().uuid().optional(),
    amountMinor: z.number().int().positive(),
    currencyCode: z.string().length(3),
    categoryId: z.string().uuid().optional(),
    splits: z
      .array(
        z.object({
          categoryId: z.string().uuid().optional(),
          amountMinor: z.number().int().positive(),
          note: z.string().max(280).optional(),
        }),
      )
      .min(2)
      .optional(),
    note: z.string().max(280).optional(),
    occurredAt: z.string().min(10),
    recurringTransactionId: z.string().uuid().optional(),
  })
  .partial()
  .refine((v) => v.type !== 'transfer' || !!v.transferAccountId, {
    message: 'transferAccountId is required when type is "transfer"',
    path: ['transferAccountId'],
  });

export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>;
