import { z } from 'zod';

// Mirrors CategoryRepository.create's input contract (docs/API_DESIGN.md).
export const categoryInputSchema = z.object({
  name: z.string().min(1).max(60),
  icon: z.string().min(1),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'color must be a hex string like #RRGGBB'),
  type: z.enum(['expense', 'income']),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const categoryUpdateSchema = categoryInputSchema.partial();
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
