// Date field: Today / Yesterday quick picks, with a calendar for anything
// else (docs/USER_FLOWS.md Flow 2 step 5). Previously a free-text
// "YYYY-MM-DD" field plus two quick-pick chips with no selected state —
// replaced with three chips (Today, Yesterday, Custom) so there's never
// more than one control, the active choice is always visually clear via
// the app's primary color, and a real calendar handles anything other
// than the last two days instead of growing more quick-pick buttons.
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { Platform, Pressable, Text, View } from 'react-native';
import { useTheme, type Theme } from '../theme/ThemeProvider';
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
  const { colors, space, radius, font, borderWidth, hitMin } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);

  const today = todayIsoDate();
  const yesterday = daysAgo(1);
  const isToday = value === today;
  const isYesterday = value === yesterday;
  const isCustom = !isToday && !isYesterday;

  function handleValueChange(_event: DateTimePickerChangeEvent, selected: Date) {
    if (Platform.OS === 'android') setPickerOpen(false);
    onChange(todayIsoDate(selected));
  }

  function handleDismiss() {
    if (Platform.OS === 'android') setPickerOpen(false);
  }

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: space[8] }}>
        <Chip label="Today" selected={isToday} theme={{ colors, space, radius, font, borderWidth, hitMin }} onPress={() => onChange(today)} />
        <Chip label="Yesterday" selected={isYesterday} theme={{ colors, space, radius, font, borderWidth, hitMin }} onPress={() => onChange(yesterday)} />
        <Chip
          label={isCustom ? formatDisplay(value) : 'Custom'}
          selected={isCustom}
          icon="calendar-outline"
          theme={{ colors, space, radius, font, borderWidth, hitMin }}
          onPress={() => setPickerOpen(true)}
        />
      </View>
      {pickerOpen ? (
        <DateTimePicker
          value={isValidDate(value) ? new Date(`${value}T00:00:00`) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onValueChange={handleValueChange}
          onDismiss={handleDismiss}
        />
      ) : null}
      {Platform.OS === 'ios' && pickerOpen ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setPickerOpen(false)}
          style={{ alignItems: 'flex-end', paddingVertical: space[10], minHeight: hitMin, justifyContent: 'center' }}
        >
          <Text style={{ color: colors.accent, fontWeight: '700' }}>Done</Text>
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
  theme,
  onPress,
  icon,
}: {
  label: string;
  selected: boolean;
  theme: Pick<Theme, 'colors' | 'space' | 'radius' | 'font' | 'borderWidth' | 'hitMin'>;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { colors, space, radius, font, borderWidth, hitMin } = theme;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: 1,
        flexBasis: 0,
        borderWidth: borderWidth.hairline,
        borderRadius: radius.sm,
        paddingHorizontal: space[10],
        paddingVertical: space[10],
        minHeight: hitMin,
        borderColor: selected ? colors.accent : colors.border,
        backgroundColor: selected ? colors.accent : 'transparent',
      }}
    >
      {icon ? (
        <Ionicons name={icon} size={14} color={selected ? colors.accentContrast : colors.text} style={{ marginRight: space[4] }} />
      ) : null}
      <Text
        numberOfLines={1}
        style={{ color: selected ? colors.accentContrast : colors.text, fontWeight: selected ? '700' : '500', fontSize: font.size.sm }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
