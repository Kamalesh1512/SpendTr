// Calm inline message (promoted from docs/design_system/templates/
// spendtr-app/kit.jsx `Note`). Never a red banner for an ordinary state —
// only for a real failure (docs/design_system/readme.md "Colour").
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';

interface NoteProps {
  tone?: 'info' | 'warn' | 'danger' | 'ok';
  icon?: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
}

export function Note({ tone = 'info', icon, children }: NoteProps) {
  const { colors, radius, space, font } = useTheme();

  const tones: Record<NonNullable<NoteProps['tone']>, { fg: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
    info: { fg: colors.textMuted, bg: colors.surfaceRaised, icon: icon ?? 'information-circle-outline' },
    warn: { fg: colors.warning, bg: `${colors.warning}1F`, icon: icon ?? 'warning-outline' },
    danger: { fg: colors.danger, bg: colors.dangerQuiet, icon: icon ?? 'alert-circle-outline' },
    ok: { fg: colors.success, bg: colors.successQuiet, icon: icon ?? 'checkmark-circle' },
  };
  const t = tones[tone];

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: t.bg, borderRadius: radius.md, padding: space[12], gap: space[8] },
      ]}
    >
      <Ionicons name={t.icon} size={16} color={t.fg} style={{ marginTop: 1 }} />
      <Text style={{ flex: 1, fontSize: font.size.xs, lineHeight: font.lineHeight.normal * font.size.xs, color: t.fg }}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
});
