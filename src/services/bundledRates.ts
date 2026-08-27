// Small bundled static rate table shipped in the app binary, used only
// when there is no cached rate at all (fresh install, offline first
// launch) — docs/PRD.md §15, docs/API_DESIGN.md §2. Snapshot rates; the UI
// must mark conversions using this table as approximate. Not a live feed —
// refreshed occasionally by the developer, not fetched at runtime.
export const BUNDLED_RATES_GENERATED_AT = '2026-06-01T00:00:00.000Z';

export const BUNDLED_FALLBACK_RATES: Record<string, Record<string, number> | undefined> = {
  USD: {
    EUR: 0.92,
    GBP: 0.79,
    JPY: 149.5,
    AUD: 1.52,
    CAD: 1.36,
    CHF: 0.88,
    CNY: 7.24,
    SGD: 1.34,
    INR: 83.4,
    NZD: 1.64,
    HKD: 7.81,
    KRW: 1330,
    MXN: 17.0,
    BRL: 5.0,
    ZAR: 18.7,
    SEK: 10.4,
    NOK: 10.6,
    DKK: 6.85,
    PLN: 3.95,
    CZK: 22.6,
    HUF: 353,
    RON: 4.57,
    BGN: 1.8,
    ISK: 138,
    TRY: 32.1,
    ILS: 3.7,
    PHP: 55.9,
    THB: 35.6,
    MYR: 4.68,
    IDR: 15650,
  },
};
