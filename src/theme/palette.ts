// Raw palette — ported verbatim from docs/design_system/tokens/palette.css.
//
// Never reference these directly in a component. Use the semantic roles in
// ./colors.ts, the accent in ./accent.ts, or the category hues in
// ./categories.ts. This module exists so the ramps have one home and the
// semantic layer has something to alias.

export const palette = {
  // Brand — deep indigo. Fixed; the user-selectable accent overrides its
  // *usage*, never this value (see ./accent.ts).
  indigo50: '#EEEFFE',
  indigo100: '#DDDEFD',
  indigo200: '#BCBEFB',
  indigo300: '#9A9DF7',
  indigo400: '#7A7DF3',
  indigo500: '#5B5FEF', // brand
  indigo600: '#4A4EDB',
  indigo700: '#3B3FB8',
  indigo800: '#2C2F8A',
  indigo900: '#1E2060',

  // Neutrals — dark-first ink ramp, extended for elevation.
  ink950: '#0B0F14', // app background, dark
  ink900: '#12171E',
  ink850: '#161B22', // surface, dark
  ink800: '#1D242E', // raised surface / sheet, dark
  ink700: '#2A313C', // border, dark
  ink600: '#3A424F',
  ink500: '#5C6672', // muted text, light
  ink400: '#9AA4B2', // muted text, dark
  ink300: '#C3CAD3',
  ink200: '#E3E6EA', // border, light
  ink100: '#EFF1F4',
  ink50: '#F7F8FA', // app background, light
  ink0: '#FFFFFF', // surface, light
  inkInk: '#111417', // text, light
  inkTextDark: '#F2F4F7', // text, dark

  // Semantic hues — dark-mode value first, light-mode value second.
  greenDark: '#3DD68C',
  greenLight: '#1E9E63',
  redDark: '#FF6B6B',
  redLight: '#D9384A',
  amberDark: '#F5B23D',
  amberLight: '#B4780C',
} as const;

export type PaletteToken = keyof typeof palette;
