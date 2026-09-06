// The app's one action button, in the four skins its screens actually use
// (docs/design_system/components/core/Button.d.ts).
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';

export interface ButtonProps {
  /** Always plain text — a spinner swaps it in via `loading`, it never replaces it as a child. */
  children?: ReactNode;
  /** primary = filled accent (Save, Get Started, Unlock Pro); secondary =
   * hairline outline; link = accent text row (Export as CSV); quiet = muted
   * text row (Not now, Dismiss). */
  variant?: 'primary' | 'secondary' | 'link' | 'quiet';
  /** md = full-width form action (16px pad). sm = inline action inside an empty state. */
  size?: 'md' | 'sm';
  icon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  disabled?: boolean;
  /** Shows a spinner in place of the label; implies disabled. */
  loading?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth,
  disabled,
  loading,
  onPress,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const { colors, radius, space, font, hitMin, motion } = useTheme();

  const bg =
    variant === 'primary' ? colors.accent : variant === 'secondary' ? 'transparent' : 'transparent';
  const border = variant === 'secondary' ? colors.border : 'transparent';
  const textColor =
    variant === 'primary'
      ? colors.accentContrast
      : variant === 'link'
        ? colors.accent
        : variant === 'quiet'
          ? colors.textMuted
          : colors.text;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (typeof children === 'string' ? children : undefined)}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: border !== 'transparent' ? StyleSheet.hairlineWidth : 0,
          borderRadius: variant === 'link' || variant === 'quiet' ? 0 : radius.lg,
          paddingVertical: size === 'md' ? space[16] : space[10],
          paddingHorizontal: variant === 'link' || variant === 'quiet' ? 0 : space[20],
          minHeight: hitMin,
          width: fullWidth ? '100%' : undefined,
          opacity: disabled ? 0.45 : pressed ? motion.pressOpacity : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={textColor} style={{ marginRight: space[8] }} /> : null}
          <Text
            style={{
              color: textColor,
              fontSize: variant === 'link' || variant === 'quiet' ? font.size.body : font.size.md,
              fontWeight: variant === 'primary' ? '700' : variant === 'link' ? '600' : '500',
            }}
          >
            {children}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
