// POPOVER — anchored, content-sized overlay (docs/design_system/templates/
// spendtr-app/kit.jsx `Popover`; used by AccountSwitcher). Unlike Sheet, the
// screen behind stays visible and undimmed — only a transparent Pressable
// catches the outside tap to dismiss. Reuses `shadow.fab` (the design's two
// shadows are `shadowFab` and `shadowSheet`; a compact floating card is
// closer in weight to a FAB than a full sheet, so no third shadow is added).
import type { ReactNode } from 'react';
import { Modal as RNModal, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface PopoverProps {
  visible: boolean;
  onClose: () => void;
  /** Position of the popover's top-left corner, in screen coordinates. */
  top: number;
  left: number;
  width: number;
  children: ReactNode;
}

export function Popover({ visible, onClose, top, left, width, children }: PopoverProps) {
  const { colors, radius, borderWidth, shadow } = useTheme();

  // Fully unmount rather than toggling RN Modal's own `visible` prop on an
  // always-mounted instance — see src/components/CurrencyPickerSheet.tsx
  // for why (Android/Fabric "child already has a parent" crash).
  if (!visible) return null;

  return (
    <RNModal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      <View
        style={[
          styles.card,
          {
            top,
            left,
            width,
            backgroundColor: colors.surfaceRaised,
            borderRadius: radius.lg,
            borderWidth: borderWidth.hairline,
            borderColor: colors.border,
            ...shadow.fab,
          },
        ]}
      >
        {children}
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  card: { position: 'absolute', overflow: 'hidden' },
});
