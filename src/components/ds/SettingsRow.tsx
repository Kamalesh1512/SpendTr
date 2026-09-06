// A labelled settings row with a control on the right
// (docs/design_system/components/lists/SettingsRow.d.ts).
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface SettingsRowProps {
  label: string;
  /** Optional second line explaining the consequence of the setting. */
  hint?: string;
  icon?: ReactNode;
  /** The control: a Toggle, a Chip row, or an Amount. */
  children?: ReactNode;
  onPress?: () => void;
  /** Omit the bottom hairline on the last row in a Group. */
  last?: boolean;
}

export function SettingsRow({ label, hint, icon, children, onPress, last }: SettingsRowProps) {
  const { colors, borderWidth, space, font } = useTheme();
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[12],
        minHeight: 52,
        paddingHorizontal: space[16],
        paddingVertical: space[10],
        borderBottomWidth: last ? 0 : borderWidth.hairline,
        borderBottomColor: colors.border,
      }}
    >
      {icon}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: font.size.body, color: colors.text }}>{label}</Text>
        {hint ? (
          <Text style={{ fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 }}>{hint}</Text>
        ) : null}
      </View>
      {children}
    </Pressable>
  );
}
