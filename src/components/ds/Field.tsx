// Label + control + hint/error (promoted from docs/design_system/templates
// /spendtr-app/kit.jsx `Field`). Wraps any input-shaped control in a form.
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { SectionLabel } from './SectionLabel';

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function Field({ label, hint, error, children }: FieldProps) {
  const { colors, font, space } = useTheme();
  return (
    <View style={{ marginBottom: space[16] }}>
      {label ? (
        <View style={{ marginBottom: space[8] }}>
          <SectionLabel size="sm">{label}</SectionLabel>
        </View>
      ) : null}
      {children}
      {error ? (
        <View style={[styles.hintRow, { marginTop: space[6] }]}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.danger} />
          <Text style={{ color: colors.danger, fontSize: font.size.xs }}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={{ color: colors.textMuted, fontSize: font.size.xs, marginTop: space[6] }}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
