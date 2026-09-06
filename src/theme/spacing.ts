// Spacing scale — ported verbatim from docs/design_system/tokens/spacing.css.
// Named by px value. 10 and 14 are real steps (chip padding is 10, list-row
// padding is 14) — do not snap these to an 8pt grid.

export const space = {
  2: 2,
  3: 3,
  4: 4,
  6: 6,
  8: 8,
  10: 10,
  12: 12,
  14: 14,
  16: 16,
  20: 20,
  24: 24,
  28: 28,
  32: 32,
  40: 40,
  48: 48,
  60: 60,
} as const;

export const gutterScreen = space[20];
export const gutterList = space[16];
export const gutterModal = space[24];
export const listBottomInset = 120; // clears the tab bar + quick-add pill

export const hitMin = 44; // absolute floor for anything tappable
export const tabBarHeight = 56;
export const fabSize = 56;
export const fabOffsetBottom = 84;
export const fabOffsetRight = 20;
