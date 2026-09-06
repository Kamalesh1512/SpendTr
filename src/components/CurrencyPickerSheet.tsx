// Bottom-sheet currency picker (docs/UI_UX_GUIDELINES.md "Currency picker").
// Replaces the old full-screen currency picker: the currency control in
// Add Transaction / Add Subscription reads as a control that opens
// something, not a text field, so the picker now opens as a dimmed
// bottom sheet — tap a row to select and dismiss, no confirm button.
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { useRecentCurrenciesStore } from '../stores/useRecentCurrenciesStore';
import type { Currency } from '../hooks/useCurrencies';

interface CurrencyPickerSheetProps {
  visible: boolean;
  currencies: Currency[];
  selectedCode: string | null;
  onSelect: (currency: Currency) => void;
  onClose: () => void;
}

export function CurrencyPickerSheet({
  visible,
  currencies,
  selectedCode,
  onSelect,
  onClose,
}: CurrencyPickerSheetProps) {
  const { colors, space, radius, font, borderWidth } = useTheme();
  const [query, setQuery] = useState('');
  const recentCodes = useRecentCurrenciesStore((s) => s.recentCodes);
  const markUsed = useRecentCurrenciesStore((s) => s.markUsed);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return currencies;
    return currencies.filter((c) => c.code.includes(q) || c.name.toUpperCase().includes(q));
  }, [currencies, query]);

  const recent = useMemo(
    () => recentCodes.map((code) => currencies.find((c) => c.code === code)).filter((c): c is Currency => !!c),
    [recentCodes, currencies],
  );

  function select(currency: Currency) {
    markUsed(currency.code);
    onSelect(currency);
    setQuery('');
  }

  // Fully unmount rather than toggling RN Modal's own `visible` prop on an
  // always-mounted instance: on Android/Fabric, a Modal left mounted with
  // visible flipping true/false can leave a stale native view registered,
  // which crashes ("addViewAt: ... child already has a parent") the next
  // time any Modal in the tree mounts.
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close currency picker" />
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'] }]}>
          <View style={[styles.grabberRow, { paddingTop: space[10], paddingBottom: space[4] }]}>
            <View style={[styles.grabber, { backgroundColor: colors.border, borderRadius: radius.sm - 6 }]} />
          </View>

          <View style={[styles.header, { paddingHorizontal: space[20], paddingTop: space[8], paddingBottom: space[14] }]}>
            <Text style={{ fontSize: font.size.lg, fontWeight: '700', color: colors.text }}>Currency</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: colors.bg, borderRadius: radius.full }]}
            >
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: space[20], paddingBottom: space[14] }}>
            <View style={[styles.search, { backgroundColor: colors.bg, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space[12], gap: space[8] }]}>
              <Ionicons name="search" size={17} color={colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={`Search ${currencies.length} currencies`}
                placeholderTextColor={colors.textMuted}
                style={{ flex: 1, fontSize: font.size.bodySm, paddingVertical: space[10], color: colors.text }}
                accessibilityLabel="Search currency"
              />
            </View>
          </View>

          {recent.length > 0 && !query.trim() ? (
            <View style={{ paddingHorizontal: space[20], paddingBottom: space[12] }}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted, marginBottom: space[8] }]}>Recent</Text>
              <View style={{ flexDirection: 'row', gap: space[8] }}>
                {recent.map((c) => {
                  const selected = c.code === selectedCode;
                  return (
                    <Pressable
                      key={c.code}
                      accessibilityRole="button"
                      onPress={() => select(c)}
                      style={[
                        styles.recentChip,
                        {
                          borderRadius: radius.sm,
                          paddingHorizontal: space[12],
                          paddingVertical: space[8],
                          gap: space[6],
                          borderColor: selected ? colors.accent : colors.border,
                          backgroundColor: selected ? colors.accent + '24' : 'transparent',
                        },
                      ]}
                    >
                      <Text style={{ color: colors.text, fontSize: font.size.xs, fontWeight: selected ? '700' : '600' }}>
                        {c.symbol} {c.code}
                      </Text>
                      {selected ? <Ionicons name="checkmark" size={15} color={colors.accent} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={{ flex: 1, borderTopWidth: borderWidth.hairline, borderTopColor: colors.border }}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted, paddingHorizontal: space[20], paddingTop: space[12], paddingBottom: space[6] }]}>
              All currencies
            </Text>
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const selected = item.code === selectedCode;
                return (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => select(item)}
                    style={[
                      styles.row,
                      { borderColor: colors.border, gap: space[12], paddingHorizontal: space[20], paddingVertical: space[12], borderBottomWidth: borderWidth.hairline },
                    ]}
                  >
                    <View style={[styles.symbolTile, { backgroundColor: colors.bg, borderColor: colors.border, borderRadius: radius.sm, borderWidth: borderWidth.hairline }]}>
                      <Text style={{ color: colors.text, fontSize: font.size.bodySm, fontWeight: '700' }}>{item.symbol}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: font.size.bodySm, fontWeight: '600', color: colors.text }}>{item.code}</Text>
                      <Text style={{ fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 }}>{item.name}</Text>
                    </View>
                    {selected ? <Ionicons name="checkmark" size={20} color={colors.accent} /> : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { height: '74%', overflow: 'hidden' },
  grabberRow: { alignItems: 'center' },
  grabber: { width: 40, height: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, minHeight: 44 },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  recentChip: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  symbolTile: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
});
