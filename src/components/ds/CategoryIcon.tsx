// A category's identity: its hue as a filled circle with a white glyph
// (docs/design_system/components/money/CategoryIcon.d.ts). Category hues
// are data, not theme — never accented, never replaced.
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';

export interface CategoryIconProps {
  /** Ionicons name from the category seed, or a single emoji when iconType is 'emoji'. */
  icon: string;
  iconType?: 'vector' | 'emoji';
  /** The category's hue. Never the accent, never a theme color. */
  color: string;
  /** 36 in list rows, 48 in the picker grid. */
  size?: number;
  /** Draws the 2px selection ring. */
  selected?: boolean;
}

export function CategoryIcon({ icon, iconType = 'vector', color, size = 36, selected }: CategoryIconProps) {
  const { colors, categoryGlyph, borderWidth } = useTheme();
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          borderWidth: selected ? borderWidth.selected : 0,
          borderColor: colors.text,
        },
      ]}
    >
      {iconType === 'emoji' ? (
        <Text style={{ fontSize: Math.round(size * 0.5) }}>{icon}</Text>
      ) : (
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={Math.round(size * 0.46)}
          color={categoryGlyph}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
});
