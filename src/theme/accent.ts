// User-customizable accent — ported from docs/design_system/tokens/accent.css.
//
// `brand` (colors.ts) is fixed and identifies Spendtr: splash, app icon,
// onboarding tile. `accent` is what INTERACTIVE UI consumes: buttons,
// selected chips, the active tab, quick-add, links, focus rings.
//
// Rules (enforced by convention, not the type system — hold the line in review):
// 1. Only accent/accentHover/accentPress/accentQuiet may vary by user choice.
//    Never override `brand`.
// 2. Semantic colors (success/danger/warning) are never accented — a failure
//    stays red whatever the user picked.
// 3. Category hues (categories.ts) are never accented either.
import { darkColors, lightColors } from './colors';

export interface AccentRoles {
  accent: string;
  accentHover: string;
  accentPress: string;
  accentQuiet: string;
  accentContrast: string;
}

export function defaultAccent(isDark: boolean): AccentRoles {
  const brandSet = isDark ? darkColors : lightColors;
  return {
    accent: brandSet.brand,
    accentHover: brandSet.brandHover,
    accentPress: brandSet.brandPress,
    accentQuiet: brandSet.brandQuiet,
    accentContrast: '#FFFFFF',
  };
}

export type AccentPresetId =
  | 'indigo'
  | 'teal'
  | 'emerald'
  | 'amber'
  | 'orange'
  | 'rose'
  | 'violet'
  | 'slate';

// The eight shipped presets shown in Settings -> Appearance -> Accent.
// `accentColor` in user_settings stores one of these ids ('default' means
// "use the brand indigo", i.e. defaultAccent()).
export const ACCENT_PRESETS: Record<AccentPresetId, string> = {
  indigo: '#5B5FEF',
  teal: '#14B8A6',
  emerald: '#22C55E',
  amber: '#F5B23D',
  orange: '#F97316',
  rose: '#F43F5E',
  violet: '#A855F7',
  slate: '#94A3B8',
};

export const ACCENT_PRESET_LABELS: Record<AccentPresetId, string> = {
  indigo: 'Indigo',
  teal: 'Teal',
  emerald: 'Emerald',
  amber: 'Amber',
  orange: 'Orange',
  rose: 'Rose',
  violet: 'Violet',
  slate: 'Slate',
};

/**
 * Resolves `user_settings.accent_color` ('default' | AccentPresetId) into the
 * five accent roles a component actually consumes. One place writes these —
 * see src/theme/ThemeProvider.tsx — so re-theming is one declaration, not a
 * per-screen choice.
 */
export function resolveAccent(accentColor: string, isDark: boolean): AccentRoles {
  if (accentColor === 'default' || !(accentColor in ACCENT_PRESETS)) {
    return defaultAccent(isDark);
  }
  const hex = ACCENT_PRESETS[accentColor as AccentPresetId];
  return {
    accent: hex,
    accentHover: hex,
    accentPress: hex,
    accentQuiet: hexToRgba(hex, 0.16),
    accentContrast: '#FFFFFF',
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
