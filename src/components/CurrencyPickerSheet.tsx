// Bottom-sheet currency picker (docs/UI_UX_GUIDELINES.md "Currency picker").
// Replaces the old full-screen currency picker: the currency control in
// Add Transaction / Add Subscription reads as a control that opens
// something, not a text field, so the picker now opens as a dimmed
// bottom sheet — tap a row to select and dismiss, no confirm button.
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '../hooks/useAppColors';
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
  const colors = useAppColors();
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close currency picker" />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={styles.grabberRow}>
            <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Currency</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: colors.background }]}
            >
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.searchWrap}>
            <View style={[styles.search, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="search" size={17} color={colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={`Search ${currencies.length} currencies`}
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInput, { color: colors.text }]}
                accessibilityLabel="Search currency"
              />
            </View>
          </View>

          {recent.length > 0 && !query.trim() ? (
            <View style={styles.recentWrap}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Recent</Text>
              <View style={styles.recentRow}>
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
                          borderColor: selected ? colors.primary : colors.border,
                          backgroundColor: selected ? colors.primary + '24' : 'transparent',
                        },
                      ]}
                    >
                      <Text style={{ color: colors.text, fontSize: 14, fontWeight: selected ? '700' : '600' }}>
                        {c.symbol} {c.code}
                      </Text>
                      {selected ? <Ionicons name="checkmark" size={15} color={colors.primary} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={[styles.listWrap, { borderTopColor: colors.border }]}>
            <Text style={[styles.sectionLabel, styles.listLabel, { color: colors.textMuted }]}>All currencies</Text>
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const selected = item.code === selectedCode;
                return (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => select(item)}
                    style={[styles.row, { borderColor: colors.border }]}
                  >
                    <View style={[styles.symbolTile, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{item.symbol}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.code, { color: colors.text }]}>{item.code}</Text>
                      <Text style={[styles.name, { color: colors.textMuted }]}>{item.name}</Text>
                    </View>
                    {selected ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
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
  sheet: { height: '74%', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  grabberRow: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  grabber: { width: 40, height: 4, borderRadius: 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  title: { fontSize: 18, fontWeight: '700' },
  closeButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { paddingHorizontal: 20, paddingBottom: 14 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, minHeight: 44 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 10 },
  recentWrap: { paddingHorizontal: 20, paddingBottom: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  recentRow: { flexDirection: 'row', gap: 8 },
  recentChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  listWrap: { flex: 1, borderTopWidth: StyleSheet.hairlineWidth },
  listLabel: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6, marginBottom: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 56 },
  symbolTile: { width: 34, height: 34, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  code: { fontSize: 15, fontWeight: '600' },
  name: { fontSize: 12, marginTop: 2 },
});
