// docs/USER_FLOWS.md Flow 3. Redrawn from docs/design_system/templates/
// spendtr-app/recurring.jsx `AddRecurringScreen` — a sheet-styled screen
// with tinted KindCards, an inline currency selector, and the two fields
// that were previously missing entirely: which account this is charged to
// (recurringTransactionRepository already required accountId; the UI just
// never asked) and reminder timing (reminderDaysBefore already existed in
// the schema/repository with a default of 3 — never collected here before).
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
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
import { Button, Chip, Field, Input, PickerRow, Sheet } from '@/components/ds';
import * as recurringTransactionRepository from '@/repositories/recurringTransactionRepository';
import type { RecurringTransaction } from '@/repositories/recurringTransactionRepository';
import { PaywallRequiredError } from '@/types/errors';
import { todayIsoDate, type BillingCycle } from '@/utils/date';
import { majorToMinor } from '@/utils/money';

const CYCLES: BillingCycle[] = ['weekly', 'monthly', 'quarterly', 'yearly'];

const KINDS: RecurringTransaction['kind'][] = ['subscription', 'bill', 'income'];
const KIND_META: Record<RecurringTransaction['kind'], { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  subscription: { label: 'Subscription', icon: 'repeat' },
  bill: { label: 'Bill', icon: 'receipt' },
  income: { label: 'Income', icon: 'trending-up' },
};

const REMINDER_OPTIONS: Array<{ label: string; days: number }> = [
  { label: 'Same day', days: 0 },
  { label: '1 day', days: 1 },
  { label: '3 days', days: 3 },
  { label: '7 days', days: 7 },
];

function kindColor(kind: RecurringTransaction['kind'], colors: ReturnType<typeof useTheme>['colors']): string {
  if (kind === 'bill') return colors.warning;
  if (kind === 'income') return colors.success;
  return colors.accent;
}

export default function AddRecurringScreen() {
  const { colors, space, radius, font, borderWidth } = useTheme();
  const router = useRouter();
  const { settings } = useSettings();
  const { currencies } = useCurrencies();
  const { accounts } = useAccounts();
  const [kind, setKind] = useState<RecurringTransaction['kind']>('subscription');
  const { categories } = useCategories(kind === 'income' ? 'income' : 'expense');

  const [name, setName] = useState('');
  const [amountText, setAmountText] = useState('');
  const [currencyCode, setCurrencyCode] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [nextRenewalDate, setNextRenewalDate] = useState(todayIsoDate());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [reminderDaysBefore, setReminderDaysBefore] = useState<number | null>(3);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [saving, setSaving] = useState(false);

  const effectiveAccountId = accountId ?? accounts.find((a) => a.isDefault)?.id ?? accounts[0]?.id ?? null;
  const account = useMemo(() => accounts.find((a) => a.id === effectiveAccountId), [accounts, effectiveAccountId]);
  const selectedCategory = useMemo(() => categories.find((c) => c.id === categoryId), [categories, categoryId]);

  const effectiveCurrencyCode = currencyCode ?? settings?.baseCurrencyCode ?? 'USD';
  const currency = useMemo(
    () => currencies.find((c) => c.code === effectiveCurrencyCode),
    [currencies, effectiveCurrencyCode],
  );

  function formatDate(iso: string): string {
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function handleDateChange(_event: DateTimePickerChangeEvent, selected: Date) {
    if (Platform.OS === 'android') setDatePickerOpen(false);
    setNextRenewalDate(todayIsoDate(selected));
  }

  async function save() {
    const amountMinor = majorToMinor(parseFloat(amountText) || 0, currency?.decimalDigits ?? 2);
    if (!name.trim()) {
      Alert.alert('Enter a name');
      return;
    }
    if (!amountMinor) {
      Alert.alert('Enter an amount');
      return;
    }
    if (!categoryId) {
      Alert.alert('Choose a category');
      return;
    }
    if (!effectiveAccountId) {
      Alert.alert('No account yet', 'Finish onboarding to create your first account.');
      return;
    }
    setSaving(true);
    try {
      await recurringTransactionRepository.create({
        kind,
        name: name.trim(),
        accountId: effectiveAccountId,
        amountMinor,
        currencyCode: effectiveCurrencyCode,
        billingCycle,
        nextRenewalDate,
        categoryId,
        reminderDaysBefore: reminderDaysBefore ?? 0,
      });
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 2 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[20], paddingTop: space[8], paddingBottom: space[4] }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: font.size.lg, fontWeight: '700', color: colors.text }}>New recurring</Text>
          <Text style={{ fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 }}>Kind first — it decides what the rest of the form asks</Text>
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

      <ScrollView contentContainerStyle={{ padding: space[20] }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', gap: space[8], marginBottom: space[16] }}>
          {KINDS.map((k) => {
            const on = kind === k;
            const color = kindColor(k, colors);
            return (
              <Pressable
                key={k}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setKind(k)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  gap: 7,
                  paddingVertical: space[12],
                  borderRadius: radius.md,
                  borderWidth: borderWidth.thin,
                  borderColor: on ? color : colors.border,
                  backgroundColor: on ? `${color}24` : colors.surfaceRaised,
                }}
              >
                <Ionicons name={KIND_META[k].icon} size={21} color={on ? color : colors.textMuted} />
                <Text style={{ fontSize: font.size.sm, fontWeight: on ? '700' : '500', color: on ? colors.text : colors.textMuted }}>
                  {KIND_META[k].label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Field label="Name">
          <Input
            testID="recurring-name-input"
            value={name}
            onChangeText={setName}
            placeholder={
              kind === 'subscription'
                ? 'Subscription name (e.g. Netflix)'
                : kind === 'bill'
                  ? 'Bill name (e.g. Rent)'
                  : 'Income name (e.g. Salary)'
            }
          />
        </Field>

        <Field label="Amount">
          <View style={{ flexDirection: 'row', gap: space[10] }}>
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: space[8],
                borderWidth: borderWidth.hairline,
                borderColor: colors.border,
                borderRadius: radius.md,
                backgroundColor: colors.surfaceRaised,
                paddingHorizontal: space[12],
              }}
            >
              <Text style={{ fontSize: font.size.lg, fontWeight: '700', color: colors.textMuted }}>{currency?.symbol ?? '$'}</Text>
              <Input
                value={amountText}
                onChangeText={setAmountText}
                keyboardType="decimal-pad"
                placeholder="0.00"
                style={{ flex: 1, borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 0, fontWeight: '700', fontVariant: ['tabular-nums'] }}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowCurrencyPicker(true)}
              style={{
                width: 92,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderWidth: borderWidth.hairline,
                borderColor: colors.border,
                borderRadius: radius.md,
                backgroundColor: colors.surfaceRaised,
                paddingHorizontal: space[12],
                paddingVertical: space[12],
              }}
            >
              <Text style={{ fontSize: font.size.body, fontWeight: '600', color: colors.text }}>{effectiveCurrencyCode}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
            </Pressable>
          </View>
        </Field>

        <Field label="Billing cycle">
          <View style={{ flexDirection: 'row', gap: space[6], flexWrap: 'wrap' }}>
            {CYCLES.map((c) => (
              <Chip key={c} label={c} selected={billingCycle === c} onPress={() => setBillingCycle(c)} />
            ))}
          </View>
        </Field>

        <Field label="Next date">
          <PickerRow icon="calendar-outline" label="Next charge" value={formatDate(nextRenewalDate)} onPress={() => setDatePickerOpen(true)} />
        </Field>
        {datePickerOpen ? (
          <View style={{ marginTop: -space[8], marginBottom: space[16] }}>
            <DateTimePicker
              value={new Date(`${nextRenewalDate}T00:00:00`)}
              mode="date"
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

        <Field label="Account">
          <PickerRow
            icon={(account?.icon as never) ?? 'wallet'}
            iconColor={account?.color ?? colors.accent}
            label="Charged to"
            value={account ? `${account.name} · ${account.currencyCode}` : 'Select account'}
            onPress={() => setShowAccountPicker(true)}
          />
        </Field>

        <Field label="Category">
          <PickerRow
            icon={(selectedCategory?.icon as never) ?? 'pricetag'}
            iconColor={selectedCategory?.color}
            label="Files under"
            value={selectedCategory?.name ?? 'Select category'}
            onPress={() => setShowCategorySheet(true)}
          />
        </Field>

        <Field label="Remind me" hint="A local notification, scheduled on this phone.">
          <View style={{ flexDirection: 'row', gap: space[6], flexWrap: 'wrap' }}>
            {REMINDER_OPTIONS.map((r) => (
              <Chip key={r.label} label={r.label} selected={reminderDaysBefore === r.days} onPress={() => setReminderDaysBefore(r.days)} />
            ))}
            <Chip label="Never" selected={reminderDaysBefore === null} onPress={() => setReminderDaysBefore(null)} />
          </View>
        </Field>
      </ScrollView>

      <View style={{ paddingHorizontal: space[20], paddingTop: space[12], paddingBottom: space[20], borderTopWidth: borderWidth.hairline, borderTopColor: colors.border }}>
        <Button variant="primary" fullWidth loading={saving} onPress={save} testID="save-recurring">
          Save recurring
        </Button>
      </View>

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
    </SafeAreaView>
  );
}
