// Icon grid, most-recently-used first (docs/UI_UX_GUIDELINES.md "Category
// picker": "Must use a virtualized grid ... once category count is large
// and especially once emoji-type icons are mixed in — this is the direct
// UI-level fix for the reported animation-lag pattern in a competing app;
// do not render all categories unconditionally regardless of count").
//
// FlashList in a fixed-height wrapper, not a flex-wrap View: a bounded-
// height virtualized list nested inside an outer vertical ScrollView (all
// three call sites scroll the rest of their screen in one) scrolls inside
// its own box without triggering RN's "VirtualizedLists should never be
// nested" warning — that warning is about an unbounded-height inner list,
// not any list inside any ScrollView.
//
// Search + a "Recent" row sit above the grid (docs/design_system/templates/
// spendtr-app/entry.jsx `CategoryPickerScreen`). The design also shows the
// grid split into "Your categories" / "Suggested" sections, but its own
// note on the same screen says the grid must stay "one flat, evenly-sized
// grid ... a single virtualizable list with no nested scroll areas" —
// that performance constraint (docs/UI_UX_GUIDELINES.md, this file's own
// header comment) wins over the section split, so ordering (recent, then
// sortOrder) carries the same information without a second scroll area.
import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useTheme } from '../theme/ThemeProvider';
import { useRecentCategoriesStore } from '../stores/useRecentCategoriesStore';
import { CategoryIcon, SectionLabel } from './ds';
import type { Category } from '../repositories/categoryRepository';

interface CategoryPickerProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (category: Category) => void;
  /** Visible height of the grid. Defaults to roughly 4 rows. */
  height?: number;
}

const COLUMNS = 4;
const RECENT_CHIP_COUNT = 6;

export function CategoryPicker({ categories, selectedId, onSelect, height = 240 }: CategoryPickerProps) {
  const { colors, space, radius, font, borderWidth } = useTheme();
  const recentIds = useRecentCategoriesStore((s) => s.recentIds);
  const [query, setQuery] = useState('');

  const ordered = useMemo(
    () =>
      [...categories].sort((a, b) => {
        const aIdx = recentIds.indexOf(a.id);
        const bIdx = recentIds.indexOf(b.id);
        if (aIdx === -1 && bIdx === -1) return a.sortOrder - b.sortOrder;
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      }),
    [categories, recentIds],
  );

  const recentCategories = useMemo(
    () =>
      recentIds
        .map((id) => categories.find((c) => c.id === id))
        .filter((c): c is Category => !!c)
        .slice(0, RECENT_CHIP_COUNT),
    [categories, recentIds],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter((c) => c.name.toLowerCase().includes(q));
  }, [ordered, query]);

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space[8],
          backgroundColor: colors.bg,
          borderWidth: borderWidth.hairline,
          borderColor: colors.border,
          borderRadius: radius.md,
          paddingHorizontal: space[12],
          marginBottom: space[12],
        }}
      >
        <Ionicons name="search" size={17} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search categories"
          placeholderTextColor={colors.textMuted}
          style={{ flex: 1, paddingVertical: space[10], color: colors.text, fontSize: font.size.body }}
        />
      </View>

      {!query && recentCategories.length > 0 ? (
        <View style={{ marginBottom: space[12] }}>
          <SectionLabel size="xs">Recent</SectionLabel>
          <View style={{ flexDirection: 'row', gap: space[8], marginTop: space[6], flexWrap: 'wrap' }}>
            {recentCategories.map((c) => {
              const selected = c.id === selectedId;
              return (
                <Pressable
                  key={c.id}
                  accessibilityRole="button"
                  accessibilityLabel={c.name}
                  onPress={() => onSelect(c)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space[6],
                    paddingRight: space[10],
                    paddingLeft: 3,
                    paddingVertical: 3,
                    borderRadius: radius.full,
                    borderWidth: borderWidth.hairline,
                    borderColor: selected ? colors.accent : colors.border,
                    backgroundColor: selected ? colors.accentQuiet : 'transparent',
                  }}
                >
                  <CategoryIcon icon={c.icon} iconType={c.iconType} color={c.color} size={22} />
                  <Text style={{ fontSize: font.size.sm, color: colors.text }}>{c.name.split(' ')[0]}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {filtered.length === 0 ? (
        <View style={{ height, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[24] }}>
          <Text style={{ fontSize: font.size.body, fontWeight: '600', color: colors.text, textAlign: 'center' }}>
            No category called &ldquo;{query}&rdquo;
          </Text>
          <Text style={{ fontSize: font.size.bodySm, color: colors.textMuted, textAlign: 'center', marginTop: space[6] }}>
            Try a different word, or manage categories from Settings.
          </Text>
        </View>
      ) : (
        <View style={{ height }}>
          <FlashList
            data={filtered}
            numColumns={COLUMNS}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const selected = item.id === selectedId;
              return (
                <Pressable
                  style={{ flex: 1, alignItems: 'center', paddingVertical: space[10] }}
                  accessibilityRole="button"
                  accessibilityLabel={item.name}
                  onPress={() => onSelect(item)}
                >
                  <CategoryIcon icon={item.icon} iconType={item.iconType} color={item.color} size={48} selected={selected} />
                  <Text numberOfLines={1} style={{ fontSize: 11, marginTop: 4, maxWidth: 64, textAlign: 'center', color: colors.text }}>
                    {item.name}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      )}
    </View>
  );
}
