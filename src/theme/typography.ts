// Type scale — ported verbatim from docs/design_system/tokens/typography.css.
// Every step is a size the design system actually renders; nothing here is
// aspirational. Keep the platform UI face (SF Pro / Roboto via Expo
// defaults) per docs/UI_UX_GUIDELINES.md — IBM Plex in the web design system
// is a stated substitution, not a font to bring into the app. Archivo
// ExtraBold (already a dependency) stays for the wordmark only.

export const fontSize = {
  '2xs': 11, // row date, bar value, base-currency echo
  xs: 12, // row note, field label, hint
  sm: 13, // chip label, section label
  bodySm: 14, // empty-state message, paywall reason
  body: 15, // DEFAULT body / list row title / settings row
  md: 16, // primary button label
  lg: 18, // sheet title, empty-state title
  xl: 20, // lock title
  '2xl': 22, // report total
  '3xl': 24, // screen header
  '4xl': 26, // modal / detail title
  display: 36, // onboarding wordmark
  amountLg: 40, // currency symbol beside the amount input
  amountXl: 48, // the amount input itself
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const;

export const lineHeight = {
  tight: 1.15,
  snug: 1.3,
  normal: 1.45,
  relaxed: 1.6,
} as const;

export const letterSpacing = {
  label: 0.6, // uppercase section labels only
  display: -0.4, // approximates -0.02em at the display size
  normal: 0,
} as const;

// The one non-negotiable typographic rule: every figure a user could compare
// against another figure gets tabular figures — amounts, totals, rates,
// balances, percentages, dates in a column, file sizes. Spread this onto a
// Text style rather than hardcoding fontVariant inline.
export const tabularNums = {
  fontVariant: ['tabular-nums'] as const,
};
