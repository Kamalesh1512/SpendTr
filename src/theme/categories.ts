// Category hues — ported verbatim from docs/design_system/tokens/categories.css.
//
// These are DATA colors, not theme colors: identical in light and dark,
// never replaced by the user's accent. A category circle is always fully
// filled with its hue, radius 50%, with a white Ionicons glyph at ~46% of
// the circle's diameter (see src/components/CategoryIcon.tsx).
//
// The 15 keys marked default are seeded on first launch (categoryId ->
// Ionicons name lives in src/db/seedData/categories.ts); the rest ship as
// suggestions in the "add category" flow for custom (Pro) categories.

export const CATEGORY_GLYPH = '#FFFFFF';

export const DEFAULT_CATEGORY_COLORS = {
  groceries: '#84CC16',
  dining: '#F97316',
  transport: '#3B82F6',
  entertainment: '#A855F7',
  shopping: '#EC4899',
  bills: '#EAB308',
  health: '#EF4444',
  housing: '#8B5CF6',
  travel: '#14B8A6',
  subscriptions: '#06B6D4',
  education: '#6366F1',
  personalcare: '#F43F5E',
  gifts: '#D946EF',
  salary: '#22C55E',
  other: '#6B7280',
} as const;

export const SUGGESTED_CATEGORY_COLORS = {
  coffee: '#B45309',
  bars: '#9F1239',
  takeaway: '#EA580C',
  fuel: '#0EA5E9',
  metro: '#1D4ED8',
  cycling: '#2DD4BF',
  pets: '#CA8A04',
  kids: '#FB923C',
  books: '#7C3AED',
  courses: '#4F46E5',
  music: '#C026D3',
  streaming: '#0891B2',
  internet: '#0D9488',
  water: '#38BDF8',
  software: '#64748B',
  eyewear: '#94A3B8',
  insurance: '#475569',
  repairs: '#A16207',
  garden: '#65A30D',
  sports: '#16A34A',
  cinema: '#BE185D',
  hotels: '#0F766E',
  localshops: '#DB2777',
  sales: '#F472B6',
  family: '#F59E0B',
  personal: '#8B5CF6',
  charity: '#22D3EE',
  pharmacy: '#DC2626',
  supplements: '#84CC16',
  events: '#818CF8',
  latefees: '#B91C1C',
  taxes: '#57534E',
  cardfees: '#6B7280',
  reimbursable: '#71717A',
  prizes: '#EAB308',
  freelance: '#0EA5E9',
  investments: '#10B981',
  refunds: '#34D399',
  giftsin: '#F43F5E',
} as const;

export const CATEGORY_COLORS = {
  ...DEFAULT_CATEGORY_COLORS,
  ...SUGGESTED_CATEGORY_COLORS,
};

export type DefaultCategoryKey = keyof typeof DEFAULT_CATEGORY_COLORS;
