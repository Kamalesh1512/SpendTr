// Budgets — designed by implementation (docs/design_system/templates/
// spendtr-app/planning.jsx has an "Add a budget" action and dashed
// unbudgeted-category chips, but no editor screen — see the implementation
// plan §4, "AddEditBudget"). Phase 1 ships one row per category via
// budgets.category_id (docs/DATABASE_SCHEMA.md); this screen additionally
// carries Phase 2's flexible periods and nested per-category limits under
// the overall budget, both Pro-gated (docs/MONETIZATION.md).
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useCategories } from '@/hooks/useCategories';
import { useSettings } from '@/hooks/useSettings';
import { useCurrencies } from '@/hooks/useCurrencies';
import { Amount, Button, CategoryIcon, Chip, EmptyState, Field, Icon, Input, Sheet, Track } from '@/components/ds';
import { DatePicker } from '@/components/DatePicker';
import * as budgetRepository from '@/repositories/budgetRepository';
import type { Budget, BudgetCategoryLimit } from '@/repositories/budgetRepository';
import { PaywallRequiredError } from '@/types/errors';
import { majorToMinor } from '@/utils/money';
import { todayIsoDate } from '@/utils/date';

interface Row {
  budget: Budget;
  spentBaseMinor: number;
}

const PERIODS = [
  { value: 'monthly' as const, label: 'Monthly' },
  { value: 'weekly' as const, label: 'Weekly' },
  { value: 'daily' as const, label: 'Daily' },
  { value: 'custom' as const, label: 'Custom' },
];

export default function BudgetsScreen() {
  const { colors, space, font } = useTheme();
  const router = useRouter();
  const { categories } = useCategories('expense');
  const { settings } = useSettings();
  const { currencies } = useCurrencies();
  const [rows, setRows] = useState<Row[]>([]);
  const [overallRow, setOverallRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);

  const [editorCategoryId, setEditorCategoryId] = useState<string | null | undefined>(undefined);
  const [amountText, setAmountText] = useState('');
  const [saving, setSaving] = useState(false);

  const [overallEditorOpen, setOverallEditorOpen] = useState(false);
  const [overallAmountText, setOverallAmountText] = useState('');
  const [overallPeriod, setOverallPeriod] = useState<'monthly' | 'weekly' | 'daily' | 'custom'>('monthly');
  const [overallCustomStart, setOverallCustomStart] = useState(todayIsoDate());
  const [overallCustomEnd, setOverallCustomEnd] = useState(todayIsoDate());

  const [limitsOpen, setLimitsOpen] = useState(false);
  const [limits, setLimits] = useState<{ limit: BudgetCategoryLimit; spentBaseMinor: number }[]>([]);
  const [limitEditorCategoryId, setLimitEditorCategoryId] = useState<string | null | undefined>(undefined);
  const [limitAmountText, setLimitAmountText] = useState('');

  const baseCurrency = currencies.find((c) => c.code === (settings?.baseCurrencyCode ?? 'USD'));
  const decimalDigits = baseCurrency?.decimalDigits ?? 2;
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const isPro = settings?.isPro ?? false;

  const refetch = useCallback(async () => {
    setLoading(true);
    const data = await budgetRepository.getWithProgress(todayIsoDate());
    setRows(data.filter((r) => r.budget.categoryId !== null));
    setOverallRow(data.find((r) => r.budget.categoryId === null) ?? null);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  async function refetchLimits(budgetId: string) {
    setLimits(await budgetRepository.getCategoryLimitsWithProgress(budgetId));
  }

  const budgetedCategoryIds = new Set(rows.map((r) => r.budget.categoryId));
  const unbudgetedCategories = categories.filter((c) => !budgetedCategoryIds.has(c.id));
  const editorCategory = editorCategoryId ? categoryById.get(editorCategoryId) : undefined;

  function openEditor(categoryId: string, existingAmountMinor?: number) {
    setEditorCategoryId(categoryId);
    setAmountText(existingAmountMinor != null ? String(existingAmountMinor / 10 ** decimalDigits) : '');
  }

  async function saveBudget() {
    if (!editorCategoryId) return;
    const amountMinor = majorToMinor(parseFloat(amountText) || 0, decimalDigits);
    if (!amountMinor) {
      Alert.alert('Enter an amount');
      return;
    }
    setSaving(true);
    try {
      await budgetRepository.upsert({ categoryId: editorCategoryId, amountMinor });
      setEditorCategoryId(undefined);
      refetch();
    } finally {
      setSaving(false);
    }
  }

  async function removeBudget(id: string) {
    await budgetRepository.delete(id);
    refetch();
  }

  function openOverallEditor() {
    setOverallAmountText(overallRow ? String(overallRow.budget.amountMinor / 10 ** decimalDigits) : '');
    setOverallPeriod(overallRow?.budget.period ?? 'monthly');
    setOverallCustomStart(overallRow?.budget.customStartDate ?? todayIsoDate());
    setOverallCustomEnd(overallRow?.budget.customEndDate ?? todayIsoDate());
    setOverallEditorOpen(true);
  }

  function selectPeriod(period: (typeof PERIODS)[number]['value']) {
    if (period !== 'monthly' && !isPro) {
      setOverallEditorOpen(false);
      router.push({ pathname: '/paywall', params: { reason: 'flexible_budget_periods' } });
      return;
    }
    setOverallPeriod(period);
  }

  async function saveOverall() {
    const amountMinor = majorToMinor(parseFloat(overallAmountText) || 0, decimalDigits);
    if (!amountMinor) {
      Alert.alert('Enter an amount');
      return;
    }
    setSaving(true);
    try {
      await budgetRepository.upsert({
        amountMinor,
        period: overallPeriod,
        customStartDate: overallPeriod === 'custom' ? overallCustomStart : undefined,
        customEndDate: overallPeriod === 'custom' ? overallCustomEnd : undefined,
      });
      setOverallEditorOpen(false);
      refetch();
    } catch (e) {
      if (e instanceof PaywallRequiredError) {
        setOverallEditorOpen(false);
        router.push({ pathname: '/paywall', params: { reason: e.reason } });
      } else {
        Alert.alert('Could not save', e instanceof Error ? e.message : 'Unknown error');
      }
    } finally {
      setSaving(false);
    }
  }

  async function removeOverall() {
    if (!overallRow) return;
    await budgetRepository.delete(overallRow.budget.id);
    setOverallEditorOpen(false);
    refetch();
  }

  function openLimitsManager() {
    if (!isPro) {
      router.push({ pathname: '/paywall', params: { reason: 'flexible_budget_periods' } });
      return;
    }
    if (!overallRow) return;
    refetchLimits(overallRow.budget.id);
    setLimitsOpen(true);
  }

  function openLimitEditor(categoryId: string, existingAmountMinor?: number) {
    setLimitEditorCategoryId(categoryId);
    setLimitAmountText(existingAmountMinor != null ? String(existingAmountMinor / 10 ** decimalDigits) : '');
  }

  async function saveLimit() {
    if (!overallRow || !limitEditorCategoryId) return;
    const amountMinor = majorToMinor(parseFloat(limitAmountText) || 0, decimalDigits);
    if (!amountMinor) {
      Alert.alert('Enter an amount');
      return;
    }
    setSaving(true);
    try {
      await budgetRepository.setCategoryLimit(overallRow.budget.id, limitEditorCategoryId, amountMinor);
      setLimitEditorCategoryId(undefined);
      await refetchLimits(overallRow.budget.id);
    } finally {
      setSaving(false);
    }
  }

  async function removeLimit(categoryId: string) {
    if (!overallRow) return;
    await budgetRepository.removeCategoryLimit(overallRow.budget.id, categoryId);
    await refetchLimits(overallRow.budget.id);
  }

  const limitedCategoryIds = new Set(limits.map((l) => l.limit.categoryId));
  const unlimitedCategories = categories.filter((c) => !limitedCategoryIds.has(c.id));
  const limitEditorCategory = limitEditorCategoryId ? categoryById.get(limitEditorCategoryId) : undefined;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[12], paddingTop: space[8], paddingBottom: space[8] }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: font.size.lg, fontWeight: '700', color: colors.text }}>Budgets</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: space[20], paddingBottom: space[60] }}>
        <Pressable
          onPress={openOverallEditor}
          style={{
            marginTop: space[8],
            marginBottom: space[20],
            padding: space[14],
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          {overallRow ? (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={{ fontSize: font.size.sm, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }}>
                  Overall · {PERIODS.find((p) => p.value === overallRow.budget.period)?.label}
                </Text>
                <Amount amountMinor={overallRow.spentBaseMinor} currencyCode={baseCurrency?.code} decimalDigits={decimalDigits} showCode={false} size="lg" />
              </View>
              <View style={{ marginTop: space[8] }}>
                <Track
                  percent={overallRow.budget.amountMinor > 0 ? (overallRow.spentBaseMinor / overallRow.budget.amountMinor) * 100 : 0}
                  color={overallRow.spentBaseMinor > overallRow.budget.amountMinor ? colors.warning : colors.accent}
                />
              </View>
              <Text style={{ fontSize: font.size.xs, color: colors.textMuted, marginTop: space[6] }}>
                of {(overallRow.budget.amountMinor / 10 ** decimalDigits).toFixed(decimalDigits)}
              </Text>
            </>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[8] }}>
              <Icon name="add-circle-outline" size={20} color={colors.accent} />
              <Text style={{ color: colors.accent, fontWeight: '600', fontSize: font.size.body }}>Set an overall budget</Text>
            </View>
          )}
        </Pressable>

        {overallRow ? (
          <Pressable
            onPress={openLimitsManager}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space[8], marginTop: -space[8], marginBottom: space[20] }}
          >
            <Icon name={isPro ? 'options-outline' : 'lock-closed-outline'} size={16} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>Category limits within this budget{isPro ? '' : ' (Pro)'}</Text>
          </Pressable>
        ) : null}

        {!loading && rows.length === 0 && !overallRow ? (
          <EmptyState
            icon="pie-chart-outline"
            title="No budgets yet"
            message="Set a monthly limit on a category below to track what's left to spend."
          />
        ) : (
          rows.map((item) => {
            const category = item.budget.categoryId ? categoryById.get(item.budget.categoryId) : undefined;
            const percent = item.budget.amountMinor > 0 ? (item.spentBaseMinor / item.budget.amountMinor) * 100 : 0;
            const over = percent > 100;
            return (
              <Pressable
                key={item.budget.id}
                onPress={() => item.budget.categoryId && openEditor(item.budget.categoryId, item.budget.amountMinor)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[12] }}
              >
                <CategoryIcon icon={category?.icon ?? 'ellipsis-horizontal'} color={category?.color ?? colors.textMuted} size={36} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: space[6] }}>
                    <Text style={{ fontSize: font.size.body, fontWeight: '600', color: colors.text }}>{category?.name ?? 'Category'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: font.size.xs, fontVariant: ['tabular-nums'], color: over ? colors.warning : colors.text }}>
                        {(item.spentBaseMinor / 10 ** decimalDigits).toLocaleString(undefined, {
                          minimumFractionDigits: decimalDigits,
                          maximumFractionDigits: decimalDigits,
                        })}
                      </Text>
                      <Text style={{ fontSize: font.size.xs, color: colors.textMuted }}> / </Text>
                      <Amount amountMinor={item.budget.amountMinor} currencyCode={baseCurrency?.code ?? 'USD'} decimalDigits={decimalDigits} showCode={false} size="xs" tone="muted" />
                    </View>
                  </View>
                  <Track percent={percent} color={over ? colors.warning : colors.accent} />
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Remove budget" onPress={() => removeBudget(item.budget.id)} style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="close" size={16} color={colors.textMuted} />
                </Pressable>
              </Pressable>
            );
          })
        )}

        {unbudgetedCategories.length > 0 ? (
          <View style={{ marginTop: space[16] }}>
            <Text style={{ fontSize: font.size.sm, fontWeight: '700', textTransform: 'uppercase', color: colors.textMuted, marginBottom: space[10] }}>
              Add a budget
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[8] }}>
              {unbudgetedCategories.map((c) => (
                <Chip key={c.id} icon={c.icon as never} label={c.name} onPress={() => openEditor(c.id)} />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Sheet
        visible={editorCategoryId !== undefined}
        title={editorCategory ? `${editorCategory.name} — monthly limit` : 'Budget'}
        onClose={() => setEditorCategoryId(undefined)}
        height={0.4}
        footer={
          <Button fullWidth loading={saving} onPress={saveBudget}>
            Save
          </Button>
        }
      >
        <View style={{ paddingHorizontal: space[20], paddingTop: space[8] }}>
          <Field label="Monthly limit">
            <Input value={amountText} onChangeText={setAmountText} keyboardType="decimal-pad" placeholder="0.00" autoFocus />
          </Field>
        </View>
      </Sheet>

      <Sheet
        visible={overallEditorOpen}
        title="Overall budget"
        onClose={() => setOverallEditorOpen(false)}
        height={0.65}
        footer={
          <>
            <Button fullWidth loading={saving} onPress={saveOverall}>
              Save
            </Button>
            {overallRow ? (
              <View style={{ marginTop: space[4] }}>
                <Button variant="quiet" fullWidth onPress={removeOverall}>
                  Remove overall budget
                </Button>
              </View>
            ) : null}
          </>
        }
      >
        <ScrollView contentContainerStyle={{ paddingHorizontal: space[20], paddingTop: space[8] }} keyboardShouldPersistTaps="handled">
          <Field label="Amount">
            <Input value={overallAmountText} onChangeText={setOverallAmountText} keyboardType="decimal-pad" placeholder="0.00" autoFocus />
          </Field>

          <Field label="Period" hint={isPro ? undefined : 'Weekly, daily, and custom ranges require Pro.'}>
            <View style={{ flexDirection: 'row', gap: space[8] }}>
              {PERIODS.map((p) => (
                <Chip
                  key={p.value}
                  label={p.label}
                  selected={overallPeriod === p.value}
                  icon={p.value !== 'monthly' && !isPro ? 'lock-closed-outline' : undefined}
                  onPress={() => selectPeriod(p.value)}
                />
              ))}
            </View>
          </Field>

          {overallPeriod === 'custom' ? (
            <>
              <Field label="Start date">
                <DatePicker value={overallCustomStart} onChange={setOverallCustomStart} />
              </Field>
              <Field label="End date">
                <DatePicker value={overallCustomEnd} onChange={setOverallCustomEnd} />
              </Field>
            </>
          ) : null}
        </ScrollView>
      </Sheet>

      <Sheet visible={limitsOpen} title="Category limits" subtitle="Within your overall budget" onClose={() => setLimitsOpen(false)} height={0.75}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: space[20], paddingTop: space[8], paddingBottom: space[20] }}>
          {limits.map(({ limit, spentBaseMinor }) => {
            const category = categoryById.get(limit.categoryId);
            const percent = limit.amountMinor > 0 ? (spentBaseMinor / limit.amountMinor) * 100 : 0;
            const over = percent > 100;
            return (
              <Pressable
                key={limit.id}
                onPress={() => openLimitEditor(limit.categoryId, limit.amountMinor)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[12] }}
              >
                <CategoryIcon icon={category?.icon ?? 'ellipsis-horizontal'} color={category?.color ?? colors.textMuted} size={32} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: space[6] }}>
                    <Text style={{ fontSize: font.size.bodySm, fontWeight: '600', color: colors.text }}>{category?.name ?? 'Category'}</Text>
                    <Amount amountMinor={limit.amountMinor} currencyCode={baseCurrency?.code} decimalDigits={decimalDigits} showCode={false} size="xs" tone="muted" />
                  </View>
                  <Track percent={percent} color={over ? colors.warning : colors.accent} height={4} />
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Remove limit" onPress={() => removeLimit(limit.categoryId)} style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="close" size={14} color={colors.textMuted} />
                </Pressable>
              </Pressable>
            );
          })}

          {unlimitedCategories.length > 0 ? (
            <View style={{ marginTop: space[12] }}>
              <Text style={{ fontSize: font.size.sm, fontWeight: '700', textTransform: 'uppercase', color: colors.textMuted, marginBottom: space[10] }}>
                Add a category limit
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[8] }}>
                {unlimitedCategories.map((c) => (
                  <Chip key={c.id} icon={c.icon as never} label={c.name} onPress={() => openLimitEditor(c.id)} />
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>

        <Sheet
          visible={limitEditorCategoryId !== undefined}
          nested
          title={limitEditorCategory ? `${limitEditorCategory.name} limit` : 'Category limit'}
          onClose={() => setLimitEditorCategoryId(undefined)}
          height={0.4}
          footer={
            <Button fullWidth loading={saving} onPress={saveLimit}>
              Save
            </Button>
          }
        >
          <View style={{ paddingHorizontal: space[20], paddingTop: space[8] }}>
            <Field label="Limit">
              <Input value={limitAmountText} onChangeText={setLimitAmountText} keyboardType="decimal-pad" placeholder="0.00" autoFocus />
            </Field>
          </View>
        </Sheet>
      </Sheet>
    </SafeAreaView>
  );
}
