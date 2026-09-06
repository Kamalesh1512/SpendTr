// Thin wrapper over Ionicons (docs/design_system/components/core/Icon.d.ts).
// The web design system paints Ionicons SVGs as CSS masks; the native app
// already has the real equivalent (`@expo/vector-icons`'s Ionicons font),
// so this component's only job is to fix the sizing/color defaults the
// design system's cards assume, not to reimplement icon rendering.
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';

export interface IconProps {
  /** Ionicons glyph name, e.g. "restaurant", "chevron-down", "finger-print". */
  name: keyof typeof Ionicons.glyphMap;
  /** Square px size. The app uses 15-28; category circles use 22. */
  size?: number;
  /** Any color. Defaults to the theme's default text color. */
  color?: string;
}

export function Icon({ name, size = 20, color }: IconProps) {
  const { colors } = useTheme();
  return <Ionicons name={name} size={size} color={color ?? colors.text} />;
}
