// Seed set for the `currencies` table (docs/DATABASE_SCHEMA.md). This is
// the exact currency set the configured FX API (Frankfurter, ECB reference
// rates — docs/THIRD_PARTY_INTEGRATIONS.md §1) supports, so every seeded
// currency can actually be converted. Frankfurter does not cover AED —
// docs/DATABASE_SCHEMA.md's illustrative example list mentions it, but its
// own §1 admits the ~30-currency ECB limitation, so it is intentionally
// left out here rather than silently seeding a currency that can never
// receive a live rate. Flag to the developer if AED support is required.
export interface CurrencySeed {
  code: string;
  name: string;
  symbol: string;
  decimalDigits: number;
}

export const CURRENCY_SEED: CurrencySeed[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', decimalDigits: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimalDigits: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimalDigits: 2 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimalDigits: 0 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimalDigits: 2 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimalDigits: 2 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimalDigits: 2 },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimalDigits: 2 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimalDigits: 2 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimalDigits: 2 },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', decimalDigits: 2 },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimalDigits: 2 },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', decimalDigits: 0 },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', decimalDigits: 2 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimalDigits: 2 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimalDigits: 2 },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', decimalDigits: 2 },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', decimalDigits: 2 },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', decimalDigits: 2 },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', decimalDigits: 2 },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', decimalDigits: 2 },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', decimalDigits: 2 },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei', decimalDigits: 2 },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв', decimalDigits: 2 },
  { code: 'ISK', name: 'Icelandic Krona', symbol: 'kr', decimalDigits: 0 },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', decimalDigits: 2 },
  { code: 'ILS', name: 'Israeli New Shekel', symbol: '₪', decimalDigits: 2 },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', decimalDigits: 2 },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', decimalDigits: 2 },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', decimalDigits: 2 },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', decimalDigits: 2 },
];
