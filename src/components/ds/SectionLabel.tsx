// Uppercase micro-label above a form field or settings group
// (docs/design_system/components/core/SectionLabel.d.ts). Used exactly
// once as a typographic device — nowhere else in the app is uppercase text
// used for copy (docs/design_system/readme.md "Content fundamentals").
import type { ReactNode } from 'react';
import { Text } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface SectionLabelProps {
  children?: ReactNode;
  /** xs = inside a bottom sheet (11px). sm = form field label (12px). md = settings group (13px). */
  size?: 'xs' | 'sm' | 'md';
}

export function SectionLabel({ children, size = 'sm' }: SectionLabelProps) {
  const { colors, font } = useTheme();
  const fontSize = size === 'xs' ? font.size['2xs'] : size === 'md' ? font.size.sm : font.size.xs;
  return (
    <Text
      style={{
        fontSize,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: font.letterSpacing.label,
        color: colors.textMuted,
      }}
    >
      {children}
    </Text>
  );
}
