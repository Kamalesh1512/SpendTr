// Binary setting switch (docs/design_system/components/core/Toggle.d.ts) —
// the design system's web stand-in for RN's native <Switch>, tinted with
// the user's accent so it re-themes with everything else.
import { Switch } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface ToggleProps {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export function Toggle({ checked, onChange, disabled, label }: ToggleProps) {
  const { colors } = useTheme();
  return (
    <Switch
      value={!!checked}
      onValueChange={onChange}
      disabled={disabled}
      accessibilityLabel={label}
      trackColor={{ true: colors.accent, false: colors.border }}
      thumbColor="#FFFFFF"
    />
  );
}
