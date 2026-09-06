// The privacy story, made visible (promoted from docs/design_system/
// templates/spendtr-app/kit.jsx `PrivacyLine`). Used on onboarding,
// settings, and the account/data screens — a small, honest signal that the
// local-only architecture is real, not just claimed
// (docs/UI_UX_GUIDELINES.md Design Principle #2).
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';

interface PrivacyLineProps {
  children: ReactNode;
}

export function PrivacyLine({ children }: PrivacyLineProps) {
  const { colors, font, space } = useTheme();
  return (
    <View style={[styles.row, { gap: space[6] }]}>
      <Ionicons name="phone-portrait-outline" size={14} color={colors.textMuted} />
      <Text style={{ color: colors.textMuted, fontSize: font.size.xs }}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
