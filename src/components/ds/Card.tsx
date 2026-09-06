// Card, concretely (docs/design_system/readme.md "Shape, borders,
// elevation"): --surface fill, 0.5px hairline border, 12px radius, 16px
// padding, no shadow.
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface CardProps {
  children: ReactNode;
  padding?: number;
}

export function Card({ children, padding }: CardProps) {
  const { colors, radius, borderWidth, space } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: borderWidth.hairline,
          borderRadius: radius.lg,
          padding: padding ?? space[16],
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {},
});
