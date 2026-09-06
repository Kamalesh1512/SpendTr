// A tappable value row inside a form that opens a sheet or popover
// (promoted from docs/design_system/templates/spendtr-app/kit.jsx
// `PickerRow`). Used for account/currency/category selection rows.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { CategoryIcon } from './CategoryIcon';

interface PickerRowProps {
  icon?: keyof typeof Ionicons.glyphMap;
  /** When set, renders a CategoryIcon-style filled circle instead of a plain glyph. */
  iconColor?: string;
  label: string;
  value: string;
  onPress: () => void;
  accent?: boolean;
}

export function PickerRow({ icon, iconColor, label, value, onPress, accent }: PickerRowProps) {
  const { colors, radius, space, font, borderWidth } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.row,
        {
          gap: space[12],
          minHeight: 52,
          paddingHorizontal: space[14],
          paddingVertical: space[8],
          backgroundColor: colors.surfaceRaised,
          borderWidth: borderWidth.hairline,
          borderColor: colors.border,
          borderRadius: radius.md,
        },
      ]}
    >
      {icon ? (
        iconColor ? (
          <CategoryIcon icon={icon} color={iconColor} size={30} />
        ) : (
          <Ionicons name={icon} size={20} color={colors.textMuted} />
        )
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontSize: font.size['2xs'],
            color: colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: font.letterSpacing.label,
            fontWeight: '700',
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontSize: font.size.body,
            fontWeight: '600',
            color: accent ? colors.accent : colors.text,
            marginTop: 1,
          }}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', width: '100%' },
});
