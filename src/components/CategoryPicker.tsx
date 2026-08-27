// Icon grid, most-recently-used first (docs/UI_UX_GUIDELINES.md "Category
// picker"). Search/filter is intentionally omitted for MVP — only appears
// once category count exceeds a screenful, which the default seed set
// doesn't reach.
//
// Renders as a plain flex-wrap grid rather than a FlatList: both call
// sites (Add Transaction, Add Subscription) already scroll the whole
// screen in an outer ScrollView, and nesting a VirtualizedList inside a
// ScrollView with the same (vertical) orientation breaks windowing and
// throws RN's "VirtualizedLists should never be nested" warning. The
// category count is always small (a screenful), so a FlatList's
// virtualization bought nothing here anyway.
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
    <View style={styles.grid}>
      {ordered.map((item) => {
        const selected = item.id === selectedId;
        return (
          <Pressable
            key={item.id}
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
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '25%', alignItems: 'center', paddingVertical: 10 },
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
