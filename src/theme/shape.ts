// Radii, borders, elevation — ported verbatim from
// docs/design_system/tokens/shape.css.
import { StyleSheet } from 'react-native';

export const radius = {
  sm: 8, // chips, small tiles, search field
  md: 10, // inputs, rows, secondary buttons
  lg: 12, // cards, primary buttons
  xl: 16,
  '2xl': 20, // bottom sheet top corners
  full: 999,
} as const;

// The single most characteristic detail of this design system: almost every
// divider and outline is drawn at hairline weight. At 1px the same layout
// reads noticeably heavier and stops looking like the app.
export const borderWidth = {
  hairline: StyleSheet.hairlineWidth,
  thin: 1,
  selected: 2, // category circle selection ring
} as const;

// Exactly two shadows exist in the whole system. If a screen needs a third,
// the layout is wrong — use a hairline border on a flat surface instead.
export const shadow = {
  fab: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  sheet: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 12,
  },
} as const;
