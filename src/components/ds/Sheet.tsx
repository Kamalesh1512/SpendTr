// BOTTOM SHEET — slides up over the current screen (docs/design_system/
// templates/spendtr-app/kit.jsx `Sheet`). Drag handle + dimmed backdrop are
// mandatory; tapping a row in a picker selects AND dismisses — never add a
// confirm button. `nested` swaps the close X for a back chevron so a
// sheet-over-sheet (e.g. SplitTransaction) reads as still-parented.
import type { ReactNode } from 'react';
import { Modal as RNModal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';

interface SheetProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Fraction of screen height, 0-1. */
  height?: number;
  nested?: boolean;
}

export function Sheet({ visible, title, subtitle, onClose, children, footer, height = 0.72, nested }: SheetProps) {
  const { colors, radius, space, font, shadow, borderWidth } = useTheme();

  // Fully unmount rather than toggling RN Modal's own `visible` prop on an
  // always-mounted instance — see src/components/CurrencyPickerSheet.tsx
  // for why (Android/Fabric "child already has a parent" crash).
  if (!visible) return null;

  return (
    <RNModal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View
          style={[
            styles.sheet,
            {
              height: `${height * 100}%`,
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius['2xl'],
              borderTopRightRadius: radius['2xl'],
              ...shadow.sheet,
            },
          ]}
        >
          <View style={styles.grabberRow}>
            <View style={[styles.grabber, { backgroundColor: colors.borderStrong }]} />
          </View>

          {title ? (
            <View style={[styles.header, { gap: space[12], paddingHorizontal: space[20], paddingBottom: space[12] }]}>
              {nested ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onClose} style={[styles.roundBtn, { backgroundColor: colors.surfaceRaised }]}>
                  <Ionicons name="chevron-back" size={18} color={colors.text} />
                </Pressable>
              ) : null}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: font.size.lg, fontWeight: '700', color: colors.text }}>{title}</Text>
                {subtitle ? (
                  <Text style={{ fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 }}>{subtitle}</Text>
                ) : null}
              </View>
              {!nested ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={[styles.roundBtn, { backgroundColor: colors.surfaceRaised }]}>
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <View style={styles.body}>{children}</View>

          {footer ? (
            <View
              style={{
                paddingHorizontal: space[20],
                paddingTop: space[12],
                paddingBottom: space[20],
                borderTopWidth: borderWidth.hairline,
                borderTopColor: colors.border,
              }}
            >
              {footer}
            </View>
          ) : null}
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { overflow: 'hidden' },
  grabberRow: { alignItems: 'center', paddingTop: 10, paddingBottom: 2 },
  grabber: { width: 40, height: 4, borderRadius: 2 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 8 },
  roundBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
});
