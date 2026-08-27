// Simple date field: defaults to today, one tap to change
// (docs/USER_FLOWS.md Flow 2 step 5). No native date-picker dependency is
// installed in this project yet (not in package.json /
// THIRD_PARTY_INTEGRATIONS.md), so this ships as a text field plus
// Today/Yesterday quick picks rather than pulling in a new native module
// mid-build — flag to the developer if a full calendar picker UI is wanted.
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppColors } from '../hooks/useAppColors';
import { isValidIsoDateString, todayIsoDate } from '../utils/date';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  const colors = useAppColors();
  const valid = isValidIsoDateString(value);

  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          { color: colors.text, borderColor: valid ? colors.border : colors.danger },
        ]}
        accessibilityLabel="Transaction date"
      />
      <View style={styles.quickRow}>
        <Pressable onPress={() => onChange(todayIsoDate())} style={[styles.chip, { borderColor: colors.border }]}>
          <Text style={{ color: colors.text }}>Today</Text>
        </Pressable>
        <Pressable onPress={() => onChange(daysAgo(1))} style={[styles.chip, { borderColor: colors.border }]}>
          <Text style={{ color: colors.text }}>Yesterday</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, minHeight: 44 },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
});
