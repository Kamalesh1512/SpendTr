// Semantic color roles — ported verbatim from
// docs/design_system/tokens/colors.css. Dark is the primary/default theme;
// light is the opt-in alternative. Never hand-pick a color; always go
// through one of these two role maps (or ./accent.ts, ./categories.ts).
import { palette } from './palette';

export interface ColorRoles {
  bg: string;
  surface: string;
  surfaceRaised: string;
  surfaceSunken: string;
  surfaceSelected: string;

  border: string;
  borderStrong: string;

  text: string;
  textMuted: string;
  textOnBrand: string;

  brand: string;
  brandHover: string;
  brandPress: string;
  brandQuiet: string;

  success: string;
  danger: string;
  warning: string;
  successQuiet: string;
  dangerQuiet: string;

  scrim: string;
  skeleton: string;
}

export const darkColors: ColorRoles = {
  bg: palette.ink950,
  surface: palette.ink850,
  surfaceRaised: palette.ink800,
  surfaceSunken: palette.ink900,
  surfaceSelected: 'rgba(91, 95, 239, 0.14)',

  border: palette.ink700,
  borderStrong: palette.ink600,

  text: palette.inkTextDark,
  textMuted: palette.ink400,
  textOnBrand: '#FFFFFF',

  brand: palette.indigo500,
  brandHover: palette.indigo400,
  brandPress: palette.indigo600,
  brandQuiet: 'rgba(91, 95, 239, 0.16)',

  success: palette.greenDark,
  danger: palette.redDark,
  warning: palette.amberDark,
  successQuiet: 'rgba(61, 214, 140, 0.14)',
  dangerQuiet: 'rgba(255, 107, 107, 0.14)',

  scrim: 'rgba(0, 0, 0, 0.55)',
  skeleton: palette.ink800,
};

export const lightColors: ColorRoles = {
  bg: palette.ink50,
  surface: palette.ink0,
  surfaceRaised: palette.ink0,
  surfaceSunken: palette.ink100,
  surfaceSelected: 'rgba(74, 78, 219, 0.10)',

  border: palette.ink200,
  borderStrong: palette.ink300,

  text: palette.inkInk,
  textMuted: palette.ink500,
  textOnBrand: '#FFFFFF',

  // Light mode uses the darkened brand step so text/icons on white clear AA.
  brand: palette.indigo600,
  brandHover: palette.indigo500,
  brandPress: palette.indigo700,
  brandQuiet: 'rgba(74, 78, 219, 0.12)',

  success: palette.greenLight,
  danger: palette.redLight,
  warning: palette.amberLight,
  successQuiet: 'rgba(30, 158, 99, 0.12)',
  dangerQuiet: 'rgba(217, 56, 74, 0.12)',

  scrim: 'rgba(11, 15, 20, 0.42)',
  skeleton: palette.ink100,
};

// Static fallback for the brief window before user_settings can be read
// (DB not migrated yet). Dark is the default theme, so this is what the
// pre-DB boot screen (app/_layout.tsx LoadingScreen) renders against — do
// not reach for useTheme() there, it depends on settings being loaded.
export const bootColors = {
  bg: darkColors.bg,
  danger: darkColors.danger,
  accent: palette.indigo500, // defaultAccent's dark value, without importing accent.ts
};
