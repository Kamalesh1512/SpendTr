// CategoryManagement — designed by implementation (no screen and no
// Settings row exist in the design bundle, despite custom categories being
// a documented Pro feature — see the implementation plan §4). Vector icons
// come from the design's suggested-category list
// (docs/design_system/tokens/categories.css); a custom category may also
// use a single emoji (docs/DATABASE_SCHEMA.md `categories.icon_type`) —
// the design's "Emoji: never" rule governs shipped chrome and the 15
// defaults, not what a Pro user can pick for their own category.
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, CategoryIcon, Chip, EmptyState, Field, Icon, Input, ScreenHeader, Sheet } from '@/components/ds';
import * as categoryRepository from '@/repositories/categoryRepository';
import type { Category } from '@/repositories/categoryRepository';
import { CATEGORY_SUGGESTIONS } from '@/db/seedData/categories';
import { PaywallRequiredError } from '@/types/errors';

export default function CategoriesScreen() {
  const { colors, space, font, borderWidth } = useTheme();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [name, setName] = useState('');
  const [useEmoji, setUseEmoji] = useState(false);
  const [emoji, setEmoji] = useState('');
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  const refetch = useCallback(async () => {
    setLoading(true);
    setCategories(await categoryRepository.list());
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const suggestionsForType = CATEGORY_SUGGESTIONS.filter((s) => s.type === type);
  const activeSuggestion = suggestionsForType[suggestionIndex % Math.max(1, suggestionsForType.length)];

  async function save() {
    if (!name.trim()) {
      Alert.alert('Enter a name');
      return;
    }
    if (useEmoji && !emoji.trim()) {
      Alert.alert('Pick an emoji');
      return;
    }
    try {
      await categoryRepository.create({
        name: name.trim(),
        icon: useEmoji ? emoji.trim() : (activeSuggestion?.icon ?? 'ellipsis-horizontal'),
        iconType: useEmoji ? 'emoji' : 'vector',
        color: useEmoji ? '#6B7280' : (activeSuggestion?.color ?? '#6B7280'),
        type,
      });
      setAdding(false);
      setName('');
      setEmoji('');
      refetch();
    } catch (e) {
      if (e instanceof PaywallRequiredError) {
        setAdding(false);
        router.push('/paywall');
      } else {
        Alert.alert('Could not save', e instanceof Error ? e.message : 'Unknown error');
      }
    }
  }

  async function remove(category: Category) {
    try {
      await categoryRepository.delete(category.id);
      refetch();
    } catch (e) {
      Alert.alert('Could not delete', e instanceof Error ? e.message : 'Unknown error');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScreenHeader title="Categories" actionIcon="add" actionLabel="Add category" onAction={() => setAdding(true)} />

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: space[20], paddingBottom: space[60] }}
        ListEmptyComponent={loading ? null : <EmptyState title="No categories" message="Something went wrong seeding categories." />}
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space[12],
              paddingVertical: space[10],
              borderBottomWidth: borderWidth.hairline,
              borderBottomColor: colors.border,
            }}
          >
            <CategoryIcon icon={item.icon} iconType={item.iconType} color={item.color} size={34} />
            <Text style={{ fontSize: font.size.body, fontWeight: '600', color: colors.text, flex: 1 }}>{item.name}</Text>
            {item.isDefault ? (
              <Text style={{ color: colors.textMuted, fontSize: font.size.xs }}>Default</Text>
            ) : (
              <Pressable accessibilityRole="button" accessibilityLabel="Delete category" onPress={() => remove(item)}>
                <Icon name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            )}
          </View>
        )}
      />

      <Sheet
        visible={adding}
        title="New category"
        onClose={() => setAdding(false)}
        height={0.62}
        footer={
          <Button fullWidth onPress={save}>
            Save
          </Button>
        }
      >
        <View style={{ paddingHorizontal: space[20], paddingTop: space[8] }}>
          <View style={{ flexDirection: 'row', gap: space[8], marginBottom: space[16] }}>
            {(['expense', 'income'] as const).map((t) => (
              <Chip
                key={t}
                label={t}
                grow
                selected={type === t}
                onPress={() => {
                  setType(t);
                  setSuggestionIndex(0);
                }}
              />
            ))}
          </View>

          <Field label="Category name">
            <Input value={name} onChangeText={setName} placeholder="Category name" />
          </Field>

          <View style={{ flexDirection: 'row', gap: space[8], marginBottom: space[12] }}>
            <Chip label="Icon" grow selected={!useEmoji} onPress={() => setUseEmoji(false)} />
            <Chip label="Emoji" grow selected={useEmoji} onPress={() => setUseEmoji(true)} />
          </View>

          {useEmoji ? (
            <Input
              value={emoji}
              onChangeText={setEmoji}
              maxLength={8}
              placeholder="🐾"
              style={{ fontSize: font.size['2xl'], textAlign: 'center' }}
            />
          ) : (
            <FlatList
              horizontal
              data={suggestionsForType}
              keyExtractor={(item) => item.name}
              contentContainerStyle={{ gap: space[8], paddingVertical: space[4] }}
              renderItem={({ item, index }) => {
                const selected = index === suggestionIndex % Math.max(1, suggestionsForType.length);
                return (
                  <Pressable onPress={() => setSuggestionIndex(index)}>
                    <CategoryIcon icon={item.icon} color={item.color} size={40} selected={selected} />
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </Sheet>
    </SafeAreaView>
  );
}
