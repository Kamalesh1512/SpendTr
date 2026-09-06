// Plain text input, token-styled (promoted from docs/design_system/
// templates/spendtr-app/kit.jsx `inputStyle`).
import { forwardRef } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

export const Input = forwardRef<TextInput, TextInputProps>(function Input(props, ref) {
  const { colors, radius, space, font, hitMin } = useTheme();
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.textMuted}
      {...props}
      style={[
        styles.base,
        {
          minHeight: hitMin,
          paddingHorizontal: space[14],
          paddingVertical: space[10],
          backgroundColor: colors.surfaceRaised,
          color: colors.text,
          borderColor: colors.border,
          borderRadius: radius.md,
          fontSize: font.size.body,
        },
        props.style,
      ]}
    />
  );
});

const styles = StyleSheet.create({
  base: { borderWidth: StyleSheet.hairlineWidth, width: '100%' },
});
