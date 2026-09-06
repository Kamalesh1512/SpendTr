// SearchFilter — slides down over Home so the ledger stays visible and
// scroll position survives (docs/design_system/templates/spendtr-app/
// home.jsx `SearchFilterScreen`). Result count is on the confirm button, so
// the effect of a filter is legible before committing — computed live,
// client-side, against the already-loaded account-scoped list
// (src/utils/transactionFilters.ts).
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Button, CategoryIcon, Chip, Icon, SectionLabel } from './ds';
import {
  dateRangeForPreset,
  defaultSearchFilterState,
  matchesSearchFilterPreview,
  type DatePreset,
  type SearchFilterState,
} from '../utils/transactionFilters';
import type { Category } from '../repositories/categoryRepository';
import type { Transaction } from '../repositories/transactionRepository';
import { DatePicker } from './DatePicker';

interface SearchFilterPanelProps {
  visible: boolean;
  onClose: () => void;
  onApply: (state: SearchFilterState) => void;
  initial: SearchFilterState;
  categories: Category[];
  /** The account-scoped, otherwise-unfiltered list to compute the live preview count against. */
  previewTransactions: Transaction[];
  decimalDigits: number;
}

const TYPE_OPTIONS: { value: SearchFilterState['type']; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
];

const DATE_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: 'allTime', label: 'All time' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'last3Months', label: 'Last 3 months' },
  { value: 'thisYear', label: 'This year' },
  { value: 'custom', label: 'Custom range' },
];

export function SearchFilterPanel({
  visible,
  onClose,
  onApply,
  initial,
  categories,
  previewTransactions,
  decimalDigits,
}: SearchFilterPanelProps) {
  const { colors, space, radius, font, borderWidth } = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<SearchFilterState>(initial);

  useEffect(() => {
    if (visible) setDraft(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const resultCount = useMemo(
    () =>
      previewTransactions.filter((t) =>
        matchesSearchFilterPreview(t, draft, t.categoryId ? categoryById.get(t.categoryId)?.name : undefined, decimalDigits),
      ).length,
    [previewTransactions, draft, categoryById, decimalDigits],
  );

  // Fully unmount rather than toggling RN Modal's own `visible` prop on an
  // always-mounted instance — see src/components/CurrencyPickerSheet.tsx
  // for why (Android/Fabric "child already has a parent" crash).
  if (!visible) return null;

  function reset() {
    setDraft(defaultSearchFilterState());
  }

  function confirm() {
    onApply(draft);
    onClose();
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]} onPress={onClose} accessibilityLabel="Close filters" />
        <View
          style={[
            styles.panel,
            {
              paddingTop: insets.top,
              backgroundColor: colors.surface,
              borderBottomLeftRadius: radius['2xl'],
              borderBottomRightRadius: radius['2xl'],
            },
          ]}
        >
          <View style={[styles.searchRow, { padding: space[14], gap: space[10] }]}>
            <View
              style={[
                styles.searchBox,
                { gap: space[8], backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: borderWidth.hairline, borderRadius: radius.md, paddingHorizontal: space[12] },
              ]}
            >
              <Icon name="search" size={17} color={colors.textMuted} />
              <TextInput
                value={draft.search}
                onChangeText={(search) => setDraft((d) => ({ ...d, search }))}
                placeholder="Search notes, categories, amounts"
                placeholderTextColor={colors.textMuted}
                style={{ flex: 1, color: colors.text, fontSize: font.size.body, paddingVertical: space[10] }}
              />
              {draft.search ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setDraft((d) => ({ ...d, search: '' }))}>
                  <Icon name="close-circle" size={17} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
            <Pressable accessibilityRole="button" onPress={onClose}>
              <Text style={{ color: colors.accent, fontSize: font.size.body, fontWeight: '600' }}>Done</Text>
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingHorizontal: space[20] }} keyboardShouldPersistTaps="handled">
            <View style={{ marginBottom: space[16] }}>
              <SectionLabel size="xs">Type</SectionLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[8] }}>
                {TYPE_OPTIONS.map((o) => (
                  <Chip key={o.value} label={o.label} selected={draft.type === o.value} onPress={() => setDraft((d) => ({ ...d, type: o.value }))} />
                ))}
              </View>
            </View>

            <View style={{ marginBottom: space[16] }}>
              <SectionLabel size="xs">Date</SectionLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[8] }}>
                {DATE_OPTIONS.map((o) => (
                  <Chip key={o.value} label={o.label} selected={draft.datePreset === o.value} onPress={() => setDraft((d) => ({ ...d, datePreset: o.value }))} />
                ))}
              </View>
              {draft.datePreset === 'custom' ? (
                <View style={{ marginTop: space[10], gap: space[10] }}>
                  <DatePicker value={draft.customFrom} onChange={(customFrom) => setDraft((d) => ({ ...d, customFrom }))} />
                  <DatePicker value={draft.customTo} onChange={(customTo) => setDraft((d) => ({ ...d, customTo }))} />
                </View>
              ) : null}
            </View>

            <View style={{ marginBottom: space[16] }}>
              <SectionLabel size="xs">Category</SectionLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[8] }}>
                <Chip label="All" selected={draft.categoryId === null} onPress={() => setDraft((d) => ({ ...d, categoryId: null }))} />
                {categories.slice(0, 8).map((c) => (
                  <Pressable
                    key={c.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: draft.categoryId === c.id }}
                    onPress={() => setDraft((d) => ({ ...d, categoryId: c.id }))}
                    style={[
                      styles.categoryChip,
                      {
                        gap: space[6],
                        borderRadius: radius.full,
                        borderWidth: borderWidth.hairline,
                        borderColor: draft.categoryId === c.id ? colors.accent : colors.border,
                        backgroundColor: draft.categoryId === c.id ? colors.accentQuiet : 'transparent',
                        paddingRight: space[10],
                      },
                    ]}
                  >
                    <CategoryIcon icon={c.icon} iconType={c.iconType} color={c.color} size={22} />
                    <Text style={{ fontSize: font.size.sm, color: colors.text }}>{c.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={{ marginBottom: space[20] }}>
              <SectionLabel size="xs">Amount</SectionLabel>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[10] }}>
                <TextInput
                  value={draft.amountMin}
                  onChangeText={(amountMin) => setDraft((d) => ({ ...d, amountMin }))}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.amountInput,
                    { color: colors.text, fontSize: font.size.body, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space[12] },
                  ]}
                />
                <Text style={{ color: colors.textMuted }}>to</Text>
                <TextInput
                  value={draft.amountMax}
                  onChangeText={(amountMax) => setDraft((d) => ({ ...d, amountMax }))}
                  keyboardType="decimal-pad"
                  placeholder="Any"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.amountInput,
                    { color: colors.text, fontSize: font.size.body, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space[12] },
                  ]}
                />
              </View>
            </View>
          </ScrollView>

          <View
            style={[
              styles.footer,
              { padding: space[16], paddingBottom: space[16] + insets.bottom, borderTopWidth: borderWidth.hairline, borderTopColor: colors.border, gap: space[10] },
            ]}
          >
            <Button variant="quiet" onPress={reset}>
              Reset
            </Button>
            <View style={{ flex: 1 }}>
              <Button variant="primary" fullWidth disabled={resultCount === 0} onPress={confirm}>
                {resultCount === 0 ? 'No matches' : `Show ${resultCount} result${resultCount === 1 ? '' : 's'}`}
              </Button>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  panel: { position: 'absolute', top: 0, left: 0, right: 0, maxHeight: '90%', overflow: 'hidden' },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingLeft: 4 },
  footer: { flexDirection: 'row', alignItems: 'center' },
  amountInput: { flex: 1, minHeight: 44, borderWidth: StyleSheet.hairlineWidth, fontVariant: ['tabular-nums'] },
});
