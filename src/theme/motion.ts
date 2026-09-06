// Motion — ported verbatim from docs/design_system/tokens/motion.css.
// Motion explains where a surface came from; it never performs. No bounce,
// no spring overshoot, no attention-seeking loops, no confetti.
//
// Deliberately reanimated-agnostic: these are plain cubic-bezier control
// points, not `Easing.bezier(...)` instances. react-native-reanimated's
// native worklets module throws when required under Jest (no native
// runtime is mocked), and ThemeProvider is imported transitively by nearly
// every component test — pulling reanimated into the pure token layer took
// the whole suite down. A component that actually animates converts these
// four numbers into `Easing.bezier(...easingCurve.standard)` itself, at the
// point of use, where reanimated is already required.

export const duration = {
  instant: 90, // press feedback
  fast: 140, // chip/tab state
  base: 220, // sheet + modal slide
  slow: 320, // screen transition
} as const;

export type CubicBezier = readonly [number, number, number, number];

export const easingCurve = {
  standard: [0.2, 0, 0.2, 1] as CubicBezier,
  out: [0, 0, 0.2, 1] as CubicBezier,
  in: [0.4, 0, 1, 1] as CubicBezier,
} as const;

export const pressScale = 0.98;
export const pressOpacity = 0.7; // RN Pressable's default feedback
