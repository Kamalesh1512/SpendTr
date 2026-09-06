// Searchable currency list, full-height (embedded in onboarding step 1 —
// docs/UI_UX_GUIDELINES.md "Currency picker"). Shares CurrencyPickerSheet's
// row treatment (symbol tile, checkmark) and token set so the two pickers
// read as the same control in two shells, not two different eras of the app.
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { Input } from './ds';
import type { Currency } from '../hooks/useCurrencies';

interface CurrencyPickerProps {
  currencies: Currency[];
  selectedCode: string | null;
  onSelect: (currency: Currency) => void;
}

export function CurrencyPicker({ currencies, selectedCode, onSelect }: CurrencyPickerProps) {
  const { colors, space, radius, font, borderWidth } = useTheme();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return currencies;
    return currencies.filter((c) => c.code.includes(q) || c.name.toUpperCase().includes(q));
  }, [currencies, query]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingBottom: space[14] }}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder={`Search ${currencies.length} currencies`}
          accessibilityLabel="Search currency"
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.code}
        renderItem={({ item }) => {
          const selected = item.code === selectedCode;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onSelect(item)}
              style={[
                styles.row,
                {
                  gap: space[12],
                  paddingHorizontal: space[4],
                  paddingVertical: space[10],
                  borderBottomColor: colors.border,
                  borderBottomWidth: borderWidth.hairline,
                  backgroundColor: selected ? colors.surfaceSelected : 'transparent',
                },
              ]}
            >
              <View
                style={[
                  styles.symbolTile,
                  { borderRadius: radius.sm, backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: borderWidth.hairline },
                ]}
              >
                <Text style={{ color: colors.text, fontSize: font.size.bodySm, fontWeight: '700' }}>{item.symbol}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: font.size.body, fontWeight: '600' }}>{item.code}</Text>
                <Text style={{ color: colors.textMuted, fontSize: font.size.xs, marginTop: 2 }}>{item.name}</Text>
              </View>
              {selected ? <Ionicons name="checkmark" size={20} color={colors.accent} /> : null}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  symbolTile: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
});
