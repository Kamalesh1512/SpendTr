// A settings-row container: flat surface, hairline border, rounded corners,
// no shadow — rows separate from each other with hairlines drawn by
// SettingsRow itself, not by gaps between Group instances (promoted from
// docs/design_system/templates/spendtr-app/kit.jsx `Group`).
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface GroupProps {
  children: ReactNode;
}

export function Group({ children }: GroupProps) {
  const { colors, radius, borderWidth } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: borderWidth.hairline,
        borderColor: colors.border,
        borderRadius: radius.lg,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );
}
