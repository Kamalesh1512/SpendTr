// Searchable currency list (docs/UI_UX_GUIDELINES.md "Currency picker").
// Recent-currency surfacing is left for a follow-up; the free-tier
// paywall trigger for a 2nd non-base currency lives in the calling screen
// (Add Transaction), not here — this component is presentation-only.
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppColors } from '../hooks/useAppColors';
import type { Currency } from '../hooks/useCurrencies';

interface CurrencyPickerProps {
  currencies: Currency[];
  selectedCode: string | null;
  onSelect: (currency: Currency) => void;
}

export function CurrencyPicker({ currencies, selectedCode, onSelect }: CurrencyPickerProps) {
  const colors = useAppColors();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return currencies;
    return currencies.filter((c) => c.code.includes(q) || c.name.toUpperCase().includes(q));
  }, [currencies, query]);

  return (
    <View style={{ flex: 1 }}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search currency"
        placeholderTextColor={colors.textMuted}
        style={[styles.search, { color: colors.text, borderColor: colors.border }]}
        accessibilityLabel="Search currency"
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.code}
        renderItem={({ item }) => {
          const selected = item.code === selectedCode;
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => onSelect(item)}
              style={[styles.row, { borderColor: colors.border, backgroundColor: selected ? colors.surface : 'transparent' }]}
            >
              <Text style={[styles.symbol, { color: colors.text }]}>{item.symbol}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.code, { color: colors.text }]}>{item.code}</Text>
                <Text style={[styles.name, { color: colors.textMuted }]}>{item.name}</Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    margin: 12,
    minHeight: 44,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  symbol: { fontSize: 18, width: 32, textAlign: 'center' },
  code: { fontSize: 15, fontWeight: '600' },
  name: { fontSize: 12 },
});
