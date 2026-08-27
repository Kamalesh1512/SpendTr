// docs/USER_FLOWS.md Flow 2 (core, performance-critical). Draft state is
// preserved across a paywall interruption (contents just stay in this
// screen's state) — "draft entry must be preserved if the user dismisses
// the paywall".
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/hooks/useAppColors';
import { useCategories } from '@/hooks/useCategories';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useSettings } from '@/hooks/useSettings';
import { AmountInput } from '@/components/AmountInput';
import { CategoryPicker } from '@/components/CategoryPicker';
import { CurrencyPicker } from '@/components/CurrencyPicker';
import { DatePicker } from '@/components/DatePicker';
import { PaywallModal } from '@/components/PaywallModal';
import * as transactionRepository from '@/repositories/transactionRepository';
import { useRecentCategoriesStore } from '@/stores/useRecentCategoriesStore';
import { PaywallRequiredError } from '@/types/errors';
import { todayIsoDate } from '@/utils/date';

export default function AddTransactionScreen() {
  const colors = useAppColors();
  const router = useRouter();
  const { settings } = useSettings();
  const { currencies } = useCurrencies();
  const markCategoryUsed = useRecentCategoriesStore((s) => s.markUsed);

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const { categories } = useCategories(type);
  const [amountDigits, setAmountDigits] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [currencyCode, setCurrencyCode] = useState<string | null>(null);
  const [occurredAt, setOccurredAt] = useState(todayIsoDate());
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  const effectiveCurrencyCode = currencyCode ?? settings?.baseCurrencyCode ?? 'USD';
  const currency = useMemo(
    () => currencies.find((c) => c.code === effectiveCurrencyCode),
    [currencies, effectiveCurrencyCode],
  );

  async function save() {
    const amountMinor = parseInt(amountDigits || '0', 10);
    if (!amountMinor) {
      Alert.alert('Enter an amount');
      return;
    }
    setSaving(true);
    try {
      await transactionRepository.create({
        type,
        amountMinor,
        currencyCode: effectiveCurrencyCode,
        categoryId: categoryId ?? undefined,
        note: note || undefined,
        occurredAt,
      });
      if (categoryId) markCategoryUsed(categoryId);
      router.back();
    } catch (e) {
      if (e instanceof PaywallRequiredError) {
        setPaywallVisible(true);
      } else {
        Alert.alert('Could not save', e instanceof Error ? e.message : 'Unknown error');
      }
    } finally {
      setSaving(false);
    }
  }

  if (paywallVisible) {
    return (
      <PaywallModal
        reason="multi_currency"
        onPurchased={() => {
          setPaywallVisible(false);
          save();
        }}
        onClose={() => setPaywallVisible(false)}
      />
    );
  }

  if (showCurrencyPicker) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Pressable onPress={() => setShowCurrencyPicker(false)} style={styles.backRow}>
          <Text style={{ color: colors.primary }}>‹ Back</Text>
        </Pressable>
        <CurrencyPicker
          currencies={currencies}
          selectedCode={effectiveCurrencyCode}
          onSelect={(c) => {
            setCurrencyCode(c.code);
            setShowCurrencyPicker(false);
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.typeRow}>
          {(['expense', 'income'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setType(t)}
              style={[
                styles.typeChip,
                { borderColor: colors.border, backgroundColor: type === t ? colors.primary : 'transparent' },
              ]}
            >
              <Text style={{ color: type === t ? '#fff' : colors.text, fontWeight: '600' }}>{t}</Text>
            </Pressable>
          ))}
        </View>

        <AmountInput
          digits={amountDigits}
          onChangeDigits={setAmountDigits}
          symbol={currency?.symbol ?? '$'}
          decimalDigits={currency?.decimalDigits ?? 2}
        />

        <Pressable onPress={() => setShowCurrencyPicker(true)} style={[styles.fieldButton, { borderColor: colors.border }]}>
          <Text style={{ color: colors.textMuted }}>Currency</Text>
          <Text style={{ color: colors.text, fontWeight: '600' }}>{effectiveCurrencyCode}</Text>
        </Pressable>

        <Text style={[styles.label, { color: colors.textMuted }]}>Category</Text>
        <View style={{ height: 200 }}>
          <CategoryPicker categories={categories} selectedId={categoryId} onSelect={(c) => setCategoryId(c.id)} />
        </View>

        <Text style={[styles.label, { color: colors.textMuted }]}>Date</Text>
        <DatePicker value={occurredAt} onChange={setOccurredAt} />

        {noteOpen ? (
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Note"
            placeholderTextColor={colors.textMuted}
            maxLength={280}
            style={[styles.noteInput, { color: colors.text, borderColor: colors.border }]}
          />
        ) : (
          <Pressable onPress={() => setNoteOpen(true)} style={styles.noteToggle}>
            <Text style={{ color: colors.primary }}>+ Add note</Text>
          </Pressable>
        )}

        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={save}
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 60 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  typeChip: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  fieldButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    minHeight: 44,
  },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8, marginTop: 8, opacity: 0.7 },
  noteInput: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, marginTop: 12, minHeight: 44 },
  noteToggle: { marginTop: 12, minHeight: 44, justifyContent: 'center' },
  backRow: { padding: 16, minHeight: 44, justifyContent: 'center' },
  saveButton: { marginTop: 24, paddingVertical: 16, borderRadius: 12, alignItems: 'center', minHeight: 44 },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
