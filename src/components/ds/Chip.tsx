// A selectable pill — filled accent when selected, hairline outline when
// not (docs/design_system/components/core/Chip.d.ts).
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';

export interface ChipProps {
  label?: string;
  children?: ReactNode;
  selected?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  /** sm = compact row (theme, billing cycle, recent currency). md = segment-style (expense/income). field = 44px-tall date chip. */
  size?: 'sm' | 'md' | 'field';
  /** Stretch to fill an equal share of its flex row. */
  grow?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function Chip({ label, children, selected, icon, size = 'sm', grow, onPress, accessibilityLabel }: ChipProps) {
  const { colors, radius, space, font, hitMin } = useTheme();
  const tall = size === 'field';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[
        styles.base,
        {
          flex: grow ? 1 : undefined,
          minHeight: tall ? hitMin : undefined,
          paddingVertical: size === 'md' ? space[8] : space[8],
          paddingHorizontal: space[10],
          borderRadius: radius.sm,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: selected ? colors.accent : colors.border,
          backgroundColor: selected ? colors.accent : 'transparent',
        },
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={selected ? colors.accentContrast : colors.text}
          style={{ marginRight: space[6] }}
        />
      ) : null}
      {label ? (
        <Text
          style={{
            color: selected ? colors.accentContrast : colors.text,
            fontSize: font.size.sm,
            fontWeight: selected ? '700' : '500',
          }}
        >
          {label}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
