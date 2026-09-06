import { z } from 'zod';

// Mirrors CategoryRepository.create's input contract (docs/API_DESIGN.md).
export const categoryInputSchema = z.object({
  name: z.string().min(1).max(60),
  icon: z.string().min(1),
  iconType: z.enum(['vector', 'emoji']).default('vector'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'color must be a hex string like #RRGGBB'),
  type: z.enum(['expense', 'income']),
});

// z.input (not z.infer/output) so iconType stays optional here, matching
// the documented contract — the schema still fills the 'vector' default
// when .parse() runs inside the repository.
export type CategoryInput = z.input<typeof categoryInputSchema>;

export const categoryUpdateSchema = categoryInputSchema.partial();
export type CategoryUpdateInput = z.input<typeof categoryUpdateSchema>;
