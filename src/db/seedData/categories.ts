// Default categories seeded on first launch (docs/DATABASE_SCHEMA.md
// `categories` table: is_default = 1, not user-deletable). Names, icons
// (Ionicons — @expo/vector-icons is already a dependency) and colors are
// taken from the design system: the 15 default hues in
// docs/design_system/tokens/categories.css, paired with the icon+name
// choices in docs/design_system/templates/spendtr-app/data.jsx (the design
// deliberately avoids two default icons reading alike at 20px — Groceries
// is a basket, Shopping a shirt, Dining a knife-and-fork).
//
// All defaults ship as icon_type 'vector' — the design's "Emoji: never"
// rule governs shipped UI chrome and this default set; a user creating a
// *custom* category (Pro) may still choose an emoji, which is what
// DATABASE_SCHEMA.md's icon_type CHECK, PRD.md's Phase 1 scope, and the
// NFR8 category-picker performance benchmark all require.
export interface CategorySeed {
  name: string;
  icon: string;
  iconType: 'vector' | 'emoji';
  color: string;
  type: 'expense' | 'income';
  sortOrder: number;
}

export const CATEGORY_SEED: CategorySeed[] = [
  { name: 'Groceries', icon: 'basket', iconType: 'vector', color: '#84CC16', type: 'expense', sortOrder: 0 },
  { name: 'Dining & Restaurants', icon: 'restaurant', iconType: 'vector', color: '#F97316', type: 'expense', sortOrder: 1 },
  { name: 'Transport', icon: 'bus', iconType: 'vector', color: '#3B82F6', type: 'expense', sortOrder: 2 },
  { name: 'Entertainment', icon: 'game-controller', iconType: 'vector', color: '#A855F7', type: 'expense', sortOrder: 3 },
  { name: 'Shopping', icon: 'shirt', iconType: 'vector', color: '#EC4899', type: 'expense', sortOrder: 4 },
  { name: 'Bills & Utilities', icon: 'flash', iconType: 'vector', color: '#EAB308', type: 'expense', sortOrder: 5 },
  { name: 'Health & Fitness', icon: 'barbell', iconType: 'vector', color: '#EF4444', type: 'expense', sortOrder: 6 },
  { name: 'Housing & Rent', icon: 'home', iconType: 'vector', color: '#8B5CF6', type: 'expense', sortOrder: 7 },
  { name: 'Travel', icon: 'airplane', iconType: 'vector', color: '#14B8A6', type: 'expense', sortOrder: 8 },
  { name: 'Subscriptions', icon: 'repeat', iconType: 'vector', color: '#06B6D4', type: 'expense', sortOrder: 9 },
  { name: 'Education', icon: 'school', iconType: 'vector', color: '#6366F1', type: 'expense', sortOrder: 10 },
  { name: 'Personal Care', icon: 'cut', iconType: 'vector', color: '#F43F5E', type: 'expense', sortOrder: 11 },
  { name: 'Gifts & Donations', icon: 'gift', iconType: 'vector', color: '#D946EF', type: 'expense', sortOrder: 12 },
  { name: 'Other', icon: 'ellipsis-horizontal', iconType: 'vector', color: '#6B7280', type: 'expense', sortOrder: 13 },
  { name: 'Salary', icon: 'cash', iconType: 'vector', color: '#22C55E', type: 'income', sortOrder: 0 },
  { name: 'Freelance', icon: 'briefcase', iconType: 'vector', color: '#0EA5E9', type: 'income', sortOrder: 1 },
  { name: 'Investments', icon: 'trending-up', iconType: 'vector', color: '#10B981', type: 'income', sortOrder: 2 },
  { name: 'Gifts Received', icon: 'gift', iconType: 'vector', color: '#F43F5E', type: 'income', sortOrder: 3 },
  { name: 'Other Income', icon: 'ellipsis-horizontal', iconType: 'vector', color: '#6B7280', type: 'income', sortOrder: 4 },
];

// Suggestions offered in the "add category" flow (custom categories are a
// Pro feature — docs/MONETIZATION.md). Colors from
// docs/design_system/tokens/categories.css's suggested set; icons chosen to
// match the category's meaning using the same Ionicons set. Not seeded —
// only offered as a starting point when a Pro user creates a category.
export interface CategorySuggestion {
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
}

export const CATEGORY_SUGGESTIONS: CategorySuggestion[] = [
  { name: 'Coffee & Cafés', icon: 'cafe', color: '#B45309', type: 'expense' },
  { name: 'Bars & Nightlife', icon: 'wine', color: '#9F1239', type: 'expense' },
  { name: 'Takeaway', icon: 'fast-food', color: '#EA580C', type: 'expense' },
  { name: 'Fuel', icon: 'car-sport', color: '#0EA5E9', type: 'expense' },
  { name: 'Metro & Trains', icon: 'subway', color: '#1D4ED8', type: 'expense' },
  { name: 'Cycling', icon: 'bicycle', color: '#2DD4BF', type: 'expense' },
  { name: 'Pets', icon: 'paw', color: '#CA8A04', type: 'expense' },
  { name: 'Kids', icon: 'happy-outline', color: '#FB923C', type: 'expense' },
  { name: 'Books', icon: 'book', color: '#7C3AED', type: 'expense' },
  { name: 'Courses', icon: 'library', color: '#4F46E5', type: 'expense' },
  { name: 'Music', icon: 'musical-notes', color: '#C026D3', type: 'expense' },
  { name: 'Streaming', icon: 'play', color: '#0891B2', type: 'expense' },
  { name: 'Internet', icon: 'wifi', color: '#0D9488', type: 'expense' },
  { name: 'Water', icon: 'water', color: '#38BDF8', type: 'expense' },
  { name: 'Software', icon: 'laptop', color: '#64748B', type: 'expense' },
  { name: 'Eyewear', icon: 'glasses', color: '#94A3B8', type: 'expense' },
  { name: 'Insurance', icon: 'shield-checkmark-outline', color: '#475569', type: 'expense' },
  { name: 'Repairs', icon: 'construct', color: '#A16207', type: 'expense' },
  { name: 'Garden', icon: 'leaf', color: '#65A30D', type: 'expense' },
  { name: 'Sports', icon: 'football', color: '#16A34A', type: 'expense' },
  { name: 'Cinema', icon: 'film', color: '#BE185D', type: 'expense' },
  { name: 'Hotels', icon: 'bed', color: '#0F766E', type: 'expense' },
  { name: 'Local Shops', icon: 'storefront', color: '#DB2777', type: 'expense' },
  { name: 'Sales', icon: 'pricetag', color: '#F472B6', type: 'expense' },
  { name: 'Family', icon: 'people', color: '#F59E0B', type: 'expense' },
  { name: 'Personal', icon: 'person', color: '#8B5CF6', type: 'expense' },
  { name: 'Charity', icon: 'heart', color: '#22D3EE', type: 'expense' },
  { name: 'Pharmacy', icon: 'medical', color: '#DC2626', type: 'expense' },
  { name: 'Supplements', icon: 'nutrition', color: '#84CC16', type: 'expense' },
  { name: 'Events', icon: 'ticket', color: '#818CF8', type: 'expense' },
  { name: 'Late Fees', icon: 'alert-circle-outline', color: '#B91C1C', type: 'expense' },
  { name: 'Taxes', icon: 'document-text-outline', color: '#57534E', type: 'expense' },
  { name: 'Card Fees', icon: 'card', color: '#6B7280', type: 'expense' },
  { name: 'Reimbursable', icon: 'receipt', color: '#71717A', type: 'expense' },
  { name: 'Prizes', icon: 'trophy', color: '#EAB308', type: 'income' },
  { name: 'Freelance', icon: 'briefcase', color: '#0EA5E9', type: 'income' },
  { name: 'Investments', icon: 'trending-up', color: '#10B981', type: 'income' },
  { name: 'Refunds', icon: 'arrow-undo', color: '#34D399', type: 'income' },
  { name: 'Gifts Received', icon: 'gift', color: '#F43F5E', type: 'income' },
];
