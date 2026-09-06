// Nested bottom sheet for allocating one transaction's amount across
// multiple categories (docs/design_system/templates/spendtr-app/entry.jsx
// `SplitScreen`). Splitting keeps one entry in the ledger and one amount
// per category in Reports/Budgets — TransactionRepository enforces the
// split amounts sum exactly to the parent amount (docs/CLAUDE.md §10); this
// sheet is only a convenience over that guarantee, so Save stays disabled
// until the remaining figure is exactly zero.
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Button, CategoryIcon, Icon, Note, Sheet, Track } from './ds';
import { CategoryPicker } from './CategoryPicker';
import { formatGroupedAmountMinor, majorToMinor, minorToMajor } from '../utils/money';
import type { Category } from '../repositories/categoryRepository';

export interface SplitRow {
  categoryId?: string;
  amountMinor: number;
}

interface SplitTransactionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (splits: SplitRow[]) => void;
  totalMinor: number;
  currencyCode: string;
  decimalDigits: number;
  symbol: string;
  categories: Category[];
  initialSplits?: SplitRow[];
}

export function SplitTransactionSheet({
  visible,
  onClose,
  onSave,
  totalMinor,
  currencyCode,
  decimalDigits,
  symbol,
  categories,
  initialSplits,
}: SplitTransactionSheetProps) {
  const { colors, space, font, radius } = useTheme();
  const [rows, setRows] = useState<SplitRow[]>(initialSplits && initialSplits.length >= 2 ? initialSplits : []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [amountDraft, setAmountDraft] = useState('');

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const allocated = rows.reduce((sum, r) => sum + r.amountMinor, 0);
  const remaining = totalMinor - allocated;
  const toneColor = remaining === 0 ? colors.success : remaining < 0 ? colors.danger : colors.warning;

  function money(amountMinor: number): string {
    return formatGroupedAmountMinor(Math.abs(amountMinor), { symbol, decimalDigits, currencyCode });
  }

  function addCategory(category: Category) {
    setPickerOpen(false);
    // Prefill with whatever's left to allocate so a quick two-way split is
    // one tap plus one number edit, matching the design's remaining-figure
    // shortcut.
    setRows((prev) => [...prev, { categoryId: category.id, amountMinor: Math.max(remaining, 0) }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function startEditingAmount(index: number) {
    setEditingIndex(index);
    setAmountDraft(rows[index]!.amountMinor ? String(minorToMajor(rows[index]!.amountMinor, decimalDigits)) : '');
  }

  function commitAmount() {
    if (editingIndex === null) return;
    const nextMinor = majorToMinor(parseFloat(amountDraft) || 0, decimalDigits);
    setRows((prev) => prev.map((r, i) => (i === editingIndex ? { ...r, amountMinor: nextMinor } : r)));
    setEditingIndex(null);
  }

  function save() {
    if (remaining !== 0 || rows.length < 2) return;
    onSave(rows);
  }

  return (
    <Sheet
      visible={visible}
      nested
      title={`Split ${money(totalMinor)}`}
      onClose={onClose}
      height={0.86}
      footer={
        <>
          <Button variant="primary" fullWidth disabled={remaining !== 0 || rows.length < 2} onPress={save}>
            {remaining === 0
              ? 'Save split'
              : remaining > 0
                ? `Allocate ${money(remaining)} to continue`
                : `Remove ${money(remaining)} to continue`}
          </Button>
          <Text style={{ textAlign: 'center', marginTop: space[8], fontSize: font.size.xs, color: colors.textMuted }}>
            Splitting keeps one entry in the ledger and one amount per category in Reports.
          </Text>
        </>
      }
    >
      <View style={{ padding: space[20], paddingBottom: space[14] }}>
        <View
          style={{
            backgroundColor: remaining === 0 ? colors.successQuiet : remaining < 0 ? colors.dangerQuiet : `${colors.warning}1F`,
            borderRadius: radius.md,
            padding: space[14],
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: font.size.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, color: toneColor }}>
              {remaining === 0 ? 'Fully allocated' : remaining < 0 ? 'Over-allocated' : 'Remaining to allocate'}
            </Text>
            <Text style={{ fontSize: font.size.xl, fontWeight: '700', fontVariant: ['tabular-nums'], color: toneColor }}>
              {money(remaining)}
            </Text>
          </View>
          <View style={{ marginTop: space[10] }}>
            <Track percent={totalMinor > 0 ? (allocated / totalMinor) * 100 : 0} color={toneColor} height={5} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space[6] }}>
            <Text style={{ fontSize: 10, color: colors.textMuted, fontVariant: ['tabular-nums'] }}>
              {money(allocated)} allocated
            </Text>
            <Text style={{ fontSize: 10, color: colors.textMuted, fontVariant: ['tabular-nums'] }}>
              of {money(totalMinor)}
            </Text>
          </View>
        </View>
      </View>

      {rows.map((row, i) => {
        const category = row.categoryId ? categoryById.get(row.categoryId) : undefined;
        const isEditing = editingIndex === i;
        return (
          <View
            key={`${row.categoryId ?? 'uncategorized'}-${i}`}
            style={[
              styles.row,
              { gap: space[12], paddingVertical: space[8], paddingHorizontal: space[20], borderBottomWidth: 1, borderBottomColor: colors.border },
            ]}
          >
            <CategoryIcon icon={category?.icon ?? 'ellipsis-horizontal'} iconType={category?.iconType} color={category?.color ?? colors.textMuted} size={34} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontSize: font.size.body, fontWeight: '600', color: colors.text }}>
                {category?.name ?? 'Uncategorized'}
              </Text>
              <Text style={{ fontSize: 10, color: colors.textMuted }}>
                {totalMinor > 0 ? Math.round((row.amountMinor / totalMinor) * 100) : 0}% of the entry
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit amount for ${category?.name ?? 'row'}`}
              onPress={() => startEditingAmount(i)}
              style={{ minWidth: 96, paddingVertical: space[8], paddingHorizontal: space[10], borderRadius: radius.sm, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border }}
            >
              <Text style={{ textAlign: 'right', fontSize: font.size.body, fontWeight: '700', fontVariant: ['tabular-nums'], color: colors.text }}>
                {isEditing ? (amountDraft || '0') : money(row.amountMinor)}
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Remove row" onPress={() => removeRow(i)}>
              <Icon name="remove-circle-outline" size={20} color={colors.textMuted} />
            </Pressable>
          </View>
        );
      })}

      {editingIndex !== null ? (
        <View style={{ padding: space[20] }}>
          <View style={{ flexDirection: 'row', gap: space[8], flexWrap: 'wrap' }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.', 'back'].map((k) => (
              <Pressable
                key={k}
                accessibilityRole="button"
                onPress={() => {
                  if (k === 'back') setAmountDraft((t) => t.slice(0, -1));
                  else if (k === '.') setAmountDraft((t) => (t.includes('.') ? t : t === '' ? '0.' : `${t}.`));
                  else setAmountDraft((t) => (t + k).replace(/^0(?=\d)/, ''));
                }}
                style={{ width: 48, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.surfaceRaised }}
              >
                {k === 'back' ? <Icon name="backspace-outline" size={16} color={colors.text} /> : (
                  <Text style={{ fontSize: font.size.body, color: colors.text }}>{k}</Text>
                )}
              </Pressable>
            ))}
          </View>
          <View style={{ marginTop: space[10] }}>
            <Button fullWidth onPress={commitAmount}>
              Done
            </Button>
          </View>
        </View>
      ) : (
        <View style={{ padding: space[20], paddingTop: space[12] }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setPickerOpen(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: space[8],
              minHeight: 44,
              borderRadius: radius.md,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: colors.borderStrong,
            }}
          >
            <Icon name="add" size={18} color={colors.accent} />
            <Text style={{ color: colors.accent, fontSize: font.size.body, fontWeight: '600' }}>Add a category</Text>
          </Pressable>
          {remaining > 0 && rows.length > 0 ? (
            <View style={{ marginTop: space[12] }}>
              <Note tone="warn">
                Tap a row&apos;s amount to edit it — the last row can absorb the rest in one go.
              </Note>
            </View>
          ) : null}
        </View>
      )}

      <Sheet visible={pickerOpen} nested title="Category" onClose={() => setPickerOpen(false)}>
        <View style={{ padding: space[20], flex: 1 }}>
          <CategoryPicker categories={categories} selectedId={null} onSelect={addCategory} height={480} />
        </View>
      </Sheet>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
