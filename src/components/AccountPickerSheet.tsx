// Bottom-sheet account picker for the Add Transaction entry flow
// (docs/USER_FLOWS.md Flow 2: "one tap to change if the user has more than
// one [account]"). Mirrors CurrencyPickerSheet's shape: tap a row to select
// and dismiss, no confirm button.
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import type { Account } from '../repositories/accountRepository';

interface AccountPickerSheetProps {
  visible: boolean;
  accounts: Account[];
  selectedId: string | null;
  onSelect: (account: Account) => void;
  onClose: () => void;
}

export function AccountPickerSheet({ visible, accounts, selectedId, onSelect, onClose }: AccountPickerSheetProps) {
  const { colors, space, radius, font, borderWidth } = useTheme();

  // Fully unmount rather than toggling RN Modal's own `visible` prop on an
  // always-mounted instance — see CurrencyPickerSheet.tsx for why.
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close account picker" />
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'] }]}>
          <View style={[styles.grabberRow, { paddingTop: space[10], paddingBottom: space[4] }]}>
            <View style={[styles.grabber, { backgroundColor: colors.border, borderRadius: radius.sm - 6 }]} />
          </View>
          <View style={[styles.header, { paddingHorizontal: space[20], paddingTop: space[8], paddingBottom: space[14] }]}>
            <Text style={{ fontSize: font.size.lg, fontWeight: '700', color: colors.text }}>Account</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: colors.bg, borderRadius: radius.full }]}
            >
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
          <FlatList
            data={accounts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const selected = item.id === selectedId;
              return (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onSelect(item)}
                  style={[
                    styles.row,
                    { borderColor: colors.border, gap: space[12], paddingHorizontal: space[20], paddingVertical: space[12], borderBottomWidth: borderWidth.hairline },
                  ]}
                >
                  <View style={[styles.iconTile, { backgroundColor: item.color, borderRadius: radius.full }]}>
                    <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={17} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: font.size.bodySm, fontWeight: '600', color: colors.text }}>{item.name}</Text>
                    <Text style={{ fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 }}>{item.currencyCode}</Text>
                  </View>
                  {selected ? <Ionicons name="checkmark" size={20} color={colors.accent} /> : null}
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { maxHeight: '60%', overflow: 'hidden' },
  grabberRow: { alignItems: 'center' },
  grabber: { width: 40, height: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  iconTile: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
});
