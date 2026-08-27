// Default categories seeded on first launch (docs/DATABASE_SCHEMA.md
// `categories` table: is_default = 1, not user-deletable). Icon identifiers
// are Ionicons names (@expo/vector-icons is already a dependency) resolved
// by the CategoryPicker/icon components. No specific default set is
// mandated by docs — this is a standard, reasonable expense-tracker set.
export interface CategorySeed {
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
  sortOrder: number;
}

export const CATEGORY_SEED: CategorySeed[] = [
  { name: 'Food & Dining', icon: 'restaurant', color: '#F97316', type: 'expense', sortOrder: 0 },
  { name: 'Groceries', icon: 'cart', color: '#84CC16', type: 'expense', sortOrder: 1 },
  { name: 'Transport', icon: 'car', color: '#3B82F6', type: 'expense', sortOrder: 2 },
  { name: 'Housing', icon: 'home', color: '#8B5CF6', type: 'expense', sortOrder: 3 },
  { name: 'Utilities', icon: 'flash', color: '#EAB308', type: 'expense', sortOrder: 4 },
  { name: 'Shopping', icon: 'bag', color: '#EC4899', type: 'expense', sortOrder: 5 },
  { name: 'Subscriptions', icon: 'repeat', color: '#06B6D4', type: 'expense', sortOrder: 6 },
  { name: 'Health', icon: 'medkit', color: '#EF4444', type: 'expense', sortOrder: 7 },
  { name: 'Entertainment', icon: 'film', color: '#A855F7', type: 'expense', sortOrder: 8 },
  { name: 'Travel', icon: 'airplane', color: '#14B8A6', type: 'expense', sortOrder: 9 },
  { name: 'Education', icon: 'school', color: '#6366F1', type: 'expense', sortOrder: 10 },
  { name: 'Other Expense', icon: 'ellipsis-horizontal', color: '#6B7280', type: 'expense', sortOrder: 11 },
  { name: 'Salary', icon: 'cash', color: '#22C55E', type: 'income', sortOrder: 0 },
  { name: 'Freelance', icon: 'briefcase', color: '#0EA5E9', type: 'income', sortOrder: 1 },
  { name: 'Gifts', icon: 'gift', color: '#F43F5E', type: 'income', sortOrder: 2 },
  { name: 'Other Income', icon: 'ellipsis-horizontal', color: '#6B7280', type: 'income', sortOrder: 3 },
];
