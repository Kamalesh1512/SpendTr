// Numeric-keypad-first entry (docs/design_system/templates/spendtr-app/
// kit.jsx `Keypad`). Digits are big and reachable; Save is a tall key in
// the right column so the happy path never leaves the keypad
// (docs/UI_UX_GUIDELINES.md "Amount input"). RN has no CSS grid-span, so
// the tall Save key is a right-hand column next to a 3-wide digit grid,
// rather than literally spanning grid rows — same reachable-target result.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';

interface KeypadProps {
  onDigit: (digit: string) => void;
  onDot: () => void;
  onBack: () => void;
  onSave: () => void;
  saveLabel?: string;
  saveDisabled?: boolean;
  /** 0 disables the decimal key (JPY, KRW, ... — docs/UI_UX_GUIDELINES.md). */
  decimals?: number;
}

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

export function Keypad({ onDigit, onDot, onBack, onSave, saveLabel = 'Save', saveDisabled, decimals = 2 }: KeypadProps) {
  const { colors, radius, font } = useTheme();
  const keyBg = colors.surfaceRaised;

  return (
    <View style={styles.container}>
      <View style={styles.digitColumn}>
        {ROWS.map((row) => (
          <View key={row.join()} style={styles.digitRow}>
            {row.map((d) => (
              <Pressable key={d} onPress={() => onDigit(d)} style={[styles.key, { backgroundColor: keyBg, borderRadius: radius.md }]}>
                <Text style={{ fontSize: 24, fontWeight: '500', color: colors.text, fontVariant: ['tabular-nums'] }}>{d}</Text>
              </Pressable>
            ))}
          </View>
        ))}
        <View style={styles.digitRow}>
          <Pressable
            onPress={decimals === 0 ? undefined : onDot}
            style={[styles.key, { backgroundColor: keyBg, borderRadius: radius.md, opacity: decimals === 0 ? 0.35 : 1 }]}
          >
            <Text style={{ fontSize: 24, color: colors.text }}>.</Text>
          </Pressable>
          <Pressable onPress={() => onDigit('0')} style={[styles.key, styles.zeroKey, { backgroundColor: keyBg, borderRadius: radius.md }]}>
            <Text style={{ fontSize: 24, fontWeight: '500', color: colors.text, fontVariant: ['tabular-nums'] }}>0</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.actionColumn}>
        <Pressable accessibilityLabel="Backspace" onPress={onBack} style={[styles.key, { backgroundColor: keyBg, borderRadius: radius.md }]}>
          <Ionicons name="backspace-outline" size={22} color={colors.text} />
        </Pressable>
        <Pressable
          disabled={saveDisabled}
          onPress={onSave}
          style={[
            styles.saveKey,
            { borderRadius: radius.md, backgroundColor: saveDisabled ? keyBg : colors.accent },
          ]}
        >
          <Text style={{ fontSize: font.size.body, fontWeight: '700', color: saveDisabled ? colors.textMuted : colors.accentContrast }}>
            {saveLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12 },
  digitColumn: { flex: 3, gap: 8 },
  digitRow: { flexDirection: 'row', gap: 8 },
  actionColumn: { flex: 1, gap: 8 },
  key: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  zeroKey: { flex: 2 },
  saveKey: { flex: 3, alignItems: 'center', justifyContent: 'center' },
});
