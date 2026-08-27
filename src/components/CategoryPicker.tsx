// Icon grid, most-recently-used first (docs/UI_UX_GUIDELINES.md "Category
// picker"). Search/filter is intentionally omitted for MVP — only appears
// once category count exceeds a screenful, which the default seed set
// doesn't reach.
import { Ionicons } from '@expo/vector-icons';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '../hooks/useAppColors';
import { useRecentCategoriesStore } from '../stores/useRecentCategoriesStore';
import type { Category } from '../repositories/categoryRepository';

interface CategoryPickerProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (category: Category) => void;
}

export function CategoryPicker({ categories, selectedId, onSelect }: CategoryPickerProps) {
  const colors = useAppColors();
  const recentIds = useRecentCategoriesStore((s) => s.recentIds);

  const ordered = [...categories].sort((a, b) => {
    const aIdx = recentIds.indexOf(a.id);
    const bIdx = recentIds.indexOf(b.id);
    if (aIdx === -1 && bIdx === -1) return a.sortOrder - b.sortOrder;
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  return (
    <FlatList
      data={ordered}
      keyExtractor={(item) => item.id}
      numColumns={4}
      renderItem={({ item }) => {
        const selected = item.id === selectedId;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.name}
            onPress={() => onSelect(item)}
            style={styles.cell}
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: item.color, borderColor: selected ? colors.primary : 'transparent' },
              ]}
            >
              <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={22} color="#fff" />
            </View>
            <Text numberOfLines={1} style={[styles.label, { color: colors.text }]}>
              {item.name}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1 / 4, alignItems: 'center', paddingVertical: 10 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  label: { fontSize: 11, marginTop: 4, maxWidth: 64, textAlign: 'center' },
});
