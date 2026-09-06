// docs/USER_FLOWS.md Flow 2 (core, performance-critical). Draft state is
// preserved across a paywall interruption (contents just stay in this
// screen's state) — "draft entry must be preserved if the user dismisses
// the paywall". Recently-used categories are inline
// (docs/design_system/templates/spendtr-app/README.md: "so the
// CategoryPicker sheet is the exception rather than the rule") — the full
// grid only opens via "More".
// Redrawn from docs/design_system/templates/spendtr-app/entry.jsx
// `AddTransactionScreen` — a sheet-styled screen with the numeric keypad
// already up (amount -> category -> Save, three taps, the OS keyboard is
// never shown for the amount), compact meta pills instead of stacked
// picker rows, and a live "at today's rate" conversion line for foreign
// currencies.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { type DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useSettings } from '@/hooks/useSettings';
import { AccountPickerSheet } from '@/components/AccountPickerSheet';
import { CategoryPicker } from '@/components/CategoryPicker';
import { CurrencyPickerSheet } from '@/components/CurrencyPickerSheet';
import { SplitTransactionSheet, type SplitRow } from '@/components/SplitTransactionSheet';
import { CategoryIcon, Field, Input, Keypad, Note, Sheet } from '@/components/ds';
import * as transactionRepository from '@/repositories/transactionRepository';
import { getDb } from '@/db/client';
import * as currencyService from '@/services/currency';
import { useRecentAccountStore } from '@/stores/useRecentAccountStore';
import { useRecentCategoriesStore } from '@/stores/useRecentCategoriesStore';
import { PaywallRequiredError } from '@/types/errors';
import { todayIsoDate } from '@/utils/date';
import { formatGroupedAmountMinor, majorToMinor } from '@/utils/money';

const INLINE_RECENT_COUNT = 4;

function MetaPill({
  icon,
  label,
  accent,
  dashed,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  accent?: boolean;
  dashed?: boolean;
  onPress: () => void;
}) {
  const { colors, space, radius, font, borderWidth } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: space[10],
        paddingVertical: 7,
        borderRadius: radius.full,
        borderWidth: borderWidth.hairline,
        borderStyle: dashed ? 'dashed' : 'solid',
        borderColor: colors.border,
        backgroundColor: colors.surfaceRaised,
      }}
    >
      <Ionicons name={icon} size={14} color={accent ? colors.accent : colors.textMuted} />
      <Text style={{ fontSize: font.size.sm, fontWeight: '500', color: accent ? colors.accent : colors.text }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function formatDateLabel(iso: string): string {
  const today = todayIsoDate();
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yesterday = todayIsoDate(d);
  if (iso === today) return 'Today';
  if (iso === yesterday) return 'Yesterday';
  const dt = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function AddTransactionScreen() {
  const { colors, space, radius, font } = useTheme();
  const router = useRouter();
  const { settings } = useSettings();
  const { currencies } = useCurrencies();
  const { accounts } = useAccounts();
  const recentCategoryIds = useRecentCategoriesStore((s) => s.recentIds);
  const markCategoryUsed = useRecentCategoriesStore((s) => s.markUsed);
  const lastUsedAccountId = useRecentAccountStore((s) => s.lastUsedAccountId);
  const markAccountUsed = useRecentAccountStore((s) => s.markUsed);

  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const { categories } = useCategories(kind);
  const [amountText, setAmountText] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [currencyCode, setCurrencyCode] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [occurredAt, setOccurredAt] = useState(todayIsoDate());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [showSplitSheet, setShowSplitSheet] = useState(false);
  const [splits, setSplits] = useState<SplitRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [baseAmountMinor, setBaseAmountMinor] = useState<number | null>(null);

  const effectiveCurrencyCode = currencyCode ?? settings?.baseCurrencyCode ?? 'USD';
  const currency = useMemo(
    () => currencies.find((c) => c.code === effectiveCurrencyCode),
    [currencies, effectiveCurrencyCode],
  );
  const decimalDigits = currency?.decimalDigits ?? 2;
  const isForeign = effectiveCurrencyCode !== (settings?.baseCurrencyCode ?? effectiveCurrencyCode);

  // Defaults to the most-recently-used account; falls back to the default
  // account, then the first account (docs/USER_FLOWS.md Flow 2). Free-tier
  // users only ever have one account, so this stays invisible for them
  // (docs/UI_UX_GUIDELINES.md "Account switcher").
  const effectiveAccountId =
    accountId ??
    (accounts.find((a) => a.id === lastUsedAccountId)?.id ||
      accounts.find((a) => a.isDefault)?.id ||
      accounts[0]?.id ||
      null);
  const account = useMemo(() => accounts.find((a) => a.id === effectiveAccountId), [accounts, effectiveAccountId]);
  const selectedCategory = useMemo(() => categories.find((c) => c.id === categoryId), [categories, categoryId]);

  const inlineCategories = useMemo(() => {
    const recent = recentCategoryIds
      .map((id) => categories.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => !!c);
    const rest = categories.filter((c) => !recentCategoryIds.includes(c.id));
    return [...recent, ...rest].slice(0, INLINE_RECENT_COUNT);
  }, [categories, recentCategoryIds]);

  const amountMinor = majorToMinor(parseFloat(amountText) || 0, decimalDigits);
  const isEmpty = amountMinor === 0;

  // Live "≈ converted amount at today's rate" line — display only, debounced
  // so it doesn't hit the DB on every keystroke. The persisted conversion
  // happens inside transactionRepository.create, independently.
  const conversionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (conversionTimer.current) clearTimeout(conversionTimer.current);
    if (!isForeign || !settings?.baseCurrencyCode || amountMinor === 0) {
      setBaseAmountMinor(null);
      return;
    }
    conversionTimer.current = setTimeout(async () => {
      try {
        const result = await currencyService.convertToBase(getDb(), amountMinor, effectiveCurrencyCode, settings.baseCurrencyCode);
        setBaseAmountMinor(result.baseAmountMinor);
      } catch {
        setBaseAmountMinor(null);
      }
    }, 250);
    return () => {
      if (conversionTimer.current) clearTimeout(conversionTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amountMinor, effectiveCurrencyCode, isForeign, settings?.baseCurrencyCode]);

  function digit(d: string) {
    setValidationError(null);
    setAmountText((t) => (t + d).replace(/^0(?=\d)/, ''));
  }
  function dot() {
    setValidationError(null);
    setAmountText((t) => (t.includes('.') ? t : t === '' ? '0.' : `${t}.`));
  }
  function back() {
    setAmountText((t) => t.slice(0, -1));
  }

  function handleDateChange(_event: DateTimePickerChangeEvent, selected: Date) {
    if (Platform.OS === 'android') setDatePickerOpen(false);
    setOccurredAt(todayIsoDate(selected));
  }

  async function save() {
    if (!amountMinor) {
      setValidationError('Enter an amount before saving. Everything else already has a sensible default.');
      return;
    }
    if (!effectiveAccountId) {
      Alert.alert('No account yet', 'Finish onboarding to create your first account.');
      return;
    }
    const isSplit = splits.length >= 2;
    if (isSplit && splits.reduce((sum, s) => sum + s.amountMinor, 0) !== amountMinor) {
      Alert.alert('Split doesn’t match the amount', 'Reopen Split and allocate the full amount before saving.');
      return;
    }
    setSaving(true);
    try {
      await transactionRepository.create({
        accountId: effectiveAccountId,
        type: kind,
        amountMinor,
        currencyCode: effectiveCurrencyCode,
        categoryId: isSplit ? undefined : (categoryId ?? undefined),
        splits: isSplit ? splits : undefined,
        note: note || undefined,
        occurredAt,
      });
      if (!isSplit && categoryId) markCategoryUsed(categoryId);
      markAccountUsed(effectiveAccountId);
      router.back();
    } catch (e) {
      if (e instanceof PaywallRequiredError) {
        router.push({ pathname: '/paywall', params: { reason: e.reason } });
      } else {
        Alert.alert('Could not save', e instanceof Error ? e.message : 'Unknown error');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={[styles.grabberRow]}>
        <View style={[styles.grabber, { backgroundColor: colors.borderStrong }]} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[10], paddingHorizontal: space[14], paddingBottom: space[10] }}>
        <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.surfaceRaised, borderRadius: radius.full, padding: 3 }}>
          {(['expense', 'income'] as const).map((t) => (
            <Pressable
              key={t}
              accessibilityRole="button"
              accessibilityState={{ selected: kind === t }}
              onPress={() => {
                setKind(t);
                setCategoryId(null);
              }}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 7,
                borderRadius: radius.full,
                backgroundColor: kind === t ? colors.accent : 'transparent',
              }}
            >
              <Text style={{ fontSize: font.size.sm, fontWeight: '700', color: kind === t ? colors.accentContrast : colors.textMuted, textTransform: 'capitalize' }}>
                {t}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised }}
        >
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: space[20], paddingBottom: space[12] }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
          <Text style={{ fontSize: 30, fontWeight: '700', color: isEmpty ? colors.textMuted : colors.text }}>
            {currency?.symbol ?? '$'}
          </Text>
          <Text
            style={{
              fontSize: 46,
              fontWeight: '700',
              fontVariant: ['tabular-nums'],
              letterSpacing: -0.5,
              color: validationError ? colors.danger : isEmpty ? colors.textMuted : colors.text,
            }}
          >
            {amountText === '' ? (decimalDigits > 0 ? '0.00' : '0') : amountText}
          </Text>
          <View style={{ width: 2, height: 34, backgroundColor: colors.accent, borderRadius: 1, marginLeft: 2 }} />
        </View>
        {baseAmountMinor != null ? (
          <Text style={{ textAlign: 'center', marginTop: space[6], fontSize: font.size.xs, color: colors.textMuted, fontVariant: ['tabular-nums'] }}>
            ≈{' '}
            {formatGroupedAmountMinor(baseAmountMinor, {
              symbol: currencies.find((c) => c.code === settings?.baseCurrencyCode)?.symbol ?? '$',
              decimalDigits: currencies.find((c) => c.code === settings?.baseCurrencyCode)?.decimalDigits ?? 2,
              currencyCode: settings?.baseCurrencyCode ?? 'USD',
            })}{' '}
            at today&apos;s rate
          </Text>
        ) : null}
      </View>

      {validationError ? (
        <View style={{ paddingHorizontal: space[20], paddingBottom: space[12] }}>
          <Note tone="danger">{validationError}</Note>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={{ flexDirection: 'row', gap: space[6], paddingHorizontal: space[14], paddingBottom: space[12] }}>
          {inlineCategories.map((c) => (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityLabel={c.name}
              accessibilityState={{ selected: c.id === categoryId }}
              onPress={() => setCategoryId(c.id)}
              style={{ flex: 1, alignItems: 'center', gap: 5 }}
            >
              <CategoryIcon icon={c.icon} iconType={c.iconType} color={c.color} size={44} selected={c.id === categoryId} />
              <Text numberOfLines={1} style={{ fontSize: 9.5, color: c.id === categoryId ? colors.text : colors.textMuted, textAlign: 'center' }}>
                {c.name.split(' ')[0]}
              </Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="All categories"
            onPress={() => setShowCategorySheet(true)}
            style={{ flex: 1, alignItems: 'center', gap: 5 }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: colors.borderStrong,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
            </View>
            <Text style={{ fontSize: 9.5, color: colors.textMuted }}>All {categories.length}</Text>
          </Pressable>
        </View>
        {selectedCategory && !inlineCategories.some((c) => c.id === selectedCategory.id) ? (
          <Text style={{ color: colors.textMuted, fontSize: 11, paddingHorizontal: space[14], marginTop: -6, marginBottom: 10 }}>
            Selected: {selectedCategory.name}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: space[14], paddingBottom: space[4] }}>
          {accounts.length > 1 ? (
            <MetaPill icon="wallet" label={account?.name ?? 'Account'} onPress={() => setShowAccountPicker(true)} />
          ) : null}
          <MetaPill icon="calendar-outline" label={formatDateLabel(occurredAt)} onPress={() => setDatePickerOpen(true)} />
          <MetaPill icon="swap-horizontal" label={effectiveCurrencyCode} onPress={() => setShowCurrencyPicker(true)} />
          <MetaPill
            icon="create-outline"
            label={note ? note : 'Note'}
            dashed
            accent
            onPress={() => setNoteOpen((v) => !v)}
          />
          {categories.length >= 2 ? (
            <MetaPill
              icon="pie-chart"
              label={splits.length >= 2 ? `Split · ${splits.length}` : 'Split'}
              dashed
              accent
              onPress={() => setShowSplitSheet(true)}
            />
          ) : null}
        </View>

        {noteOpen ? (
          <View style={{ paddingHorizontal: space[20], paddingTop: space[8] }}>
            <Field>
              <Input value={note} onChangeText={setNote} placeholder="Note" maxLength={280} autoFocus />
            </Field>
          </View>
        ) : null}

        {datePickerOpen ? (
          <View style={{ paddingHorizontal: space[20] }}>
            <DateTimePicker
              value={new Date(`${occurredAt}T00:00:00`)}
              mode="date"
              maximumDate={new Date()}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onValueChange={handleDateChange}
              onDismiss={() => setDatePickerOpen(false)}
            />
            {Platform.OS === 'ios' ? (
              <Pressable accessibilityRole="button" onPress={() => setDatePickerOpen(false)} style={{ alignItems: 'flex-end', paddingVertical: space[10] }}>
                <Text style={{ color: colors.accent, fontWeight: '700' }}>Done</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <Keypad
        onDigit={digit}
        onDot={dot}
        onBack={back}
        onSave={save}
        saveLabel={saving ? 'Saving…' : 'Save'}
        saveDisabled={isEmpty || saving}
        decimals={decimalDigits}
      />

      <CurrencyPickerSheet
        visible={showCurrencyPicker}
        currencies={currencies}
        selectedCode={effectiveCurrencyCode}
        onSelect={(c) => {
          setCurrencyCode(c.code);
          setShowCurrencyPicker(false);
        }}
        onClose={() => setShowCurrencyPicker(false)}
      />

      <AccountPickerSheet
        visible={showAccountPicker}
        accounts={accounts}
        selectedId={effectiveAccountId}
        onSelect={(a) => {
          setAccountId(a.id);
          setShowAccountPicker(false);
        }}
        onClose={() => setShowAccountPicker(false)}
      />

      <Sheet visible={showCategorySheet} title="Category" onClose={() => setShowCategorySheet(false)} nested>
        <View style={{ padding: space[20], flex: 1 }}>
          <CategoryPicker
            categories={categories}
            selectedId={categoryId}
            onSelect={(c) => {
              setCategoryId(c.id);
              setShowCategorySheet(false);
            }}
            height={480}
          />
        </View>
      </Sheet>

      <SplitTransactionSheet
        visible={showSplitSheet}
        onClose={() => setShowSplitSheet(false)}
        onSave={(rows) => {
          setSplits(rows);
          setCategoryId(null);
          setShowSplitSheet(false);
        }}
        totalMinor={amountMinor}
        currencyCode={effectiveCurrencyCode}
        decimalDigits={decimalDigits}
        symbol={currency?.symbol ?? '$'}
        categories={categories}
        initialSplits={splits}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  grabberRow: { alignItems: 'center', paddingTop: 8, paddingBottom: 2 },
  grabber: { width: 40, height: 4, borderRadius: 2 },
});
