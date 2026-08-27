// Date field: Today / Yesterday quick picks, with a calendar for anything
// else (docs/USER_FLOWS.md Flow 2 step 5). Previously a free-text
// "YYYY-MM-DD" field plus two quick-pick chips with no selected state —
// replaced with three chips (Today, Yesterday, Custom) so there's never
// more than one control, the active choice is always visually clear via
// the app's primary color, and a real calendar handles anything other
// than the last two days instead of growing more quick-pick buttons.
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '../hooks/useAppColors';
import type { Palette } from '../theme/colors';
import { todayIsoDate } from '../utils/date';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return todayIsoDate(d);
}

function formatDisplay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  const colors = useAppColors();
  const [pickerOpen, setPickerOpen] = useState(false);

  const today = todayIsoDate();
  const yesterday = daysAgo(1);
  const isToday = value === today;
  const isYesterday = value === yesterday;
  const isCustom = !isToday && !isYesterday;

  function handlePickerChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setPickerOpen(false);
    if (event.type === 'dismissed' || !selected) return;
    onChange(todayIsoDate(selected));
  }

  return (
    <View>
      <View style={styles.row}>
        <Chip label="Today" selected={isToday} colors={colors} onPress={() => onChange(today)} />
        <Chip label="Yesterday" selected={isYesterday} colors={colors} onPress={() => onChange(yesterday)} />
        <Chip
          label={isCustom ? formatDisplay(value) : 'Custom'}
          selected={isCustom}
          icon="calendar-outline"
          colors={colors}
          onPress={() => setPickerOpen(true)}
        />
      </View>
      {pickerOpen ? (
        <DateTimePicker
          value={isValidDate(value) ? new Date(`${value}T00:00:00`) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handlePickerChange}
        />
      ) : null}
      {Platform.OS === 'ios' && pickerOpen ? (
        <Pressable accessibilityRole="button" onPress={() => setPickerOpen(false)} style={styles.doneRow}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Done</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function isValidDate(iso: string): boolean {
  return !Number.isNaN(new Date(`${iso}T00:00:00`).getTime());
}

function Chip({
  label,
  selected,
  colors,
  onPress,
  icon,
}: {
  label: string;
  selected: boolean;
  colors: Palette;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : 'transparent' },
      ]}
    >
      {icon ? <Ionicons name={icon} size={14} color={selected ? '#fff' : colors.text} style={styles.chipIcon} /> : null}
      <Text numberOfLines={1} style={{ color: selected ? '#fff' : colors.text, fontWeight: selected ? '700' : '500', fontSize: 13 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    flexBasis: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 44,
  },
  chipIcon: { marginRight: 4 },
  doneRow: { alignItems: 'flex-end', paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
});
