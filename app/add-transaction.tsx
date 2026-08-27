// docs/USER_FLOWS.md Flow 2 (core, performance-critical). Draft state is
// preserved across a paywall interruption (contents just stay in this
// screen's state) — "draft entry must be preserved if the user dismisses
// the paywall".
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '@/hooks/useAppColors';
import { useCategories } from '@/hooks/useCategories';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useSettings } from '@/hooks/useSettings';
import { AmountInput } from '@/components/AmountInput';
import { CategoryPicker } from '@/components/CategoryPicker';
import { CurrencyPickerSheet } from '@/components/CurrencyPickerSheet';
import { DatePicker } from '@/components/DatePicker';
import { PaywallModal } from '@/components/PaywallModal';
import * as transactionRepository from '@/repositories/transactionRepository';
import { useRecentCategoriesStore } from '@/stores/useRecentCategoriesStore';
import { PaywallRequiredError } from '@/types/errors';
import { todayIsoDate } from '@/utils/date';
import { majorToMinor } from '@/utils/money';

export default function AddTransactionScreen() {
  const colors = useAppColors();
  const router = useRouter();
  const { settings } = useSettings();
  const { currencies } = useCurrencies();
  const markCategoryUsed = useRecentCategoriesStore((s) => s.markUsed);

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const { categories } = useCategories(type);
  const [amountText, setAmountText] = useState('');
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
    const amountMinor = majorToMinor(parseFloat(amountText) || 0, currency?.decimalDigits ?? 2);
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
          value={amountText}
          onChangeValue={setAmountText}
          symbol={currency?.symbol ?? '$'}
          decimalDigits={currency?.decimalDigits ?? 2}
        />

        <Text style={[styles.label, { color: colors.textMuted }]}>Currency</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowCurrencyPicker(true)}
          style={[styles.currencyRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={[styles.currencyTile, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{currency?.symbol ?? '$'}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.currencyCode, { color: colors.text }]}>{effectiveCurrencyCode}</Text>
            <Text style={[styles.currencySubtitle, { color: colors.textMuted }]} numberOfLines={1}>
              {currency?.name ?? effectiveCurrencyCode}
              {effectiveCurrencyCode === (settings?.baseCurrencyCode ?? 'USD') ? ' · your base currency' : ''}
            </Text>
          </View>
          <View style={styles.changeAffordance}>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>Change</Text>
            <Ionicons name="chevron-down" size={15} color={colors.primary} />
          </View>
        </Pressable>

        <Text style={[styles.label, { color: colors.textMuted }]}>Category</Text>
        <CategoryPicker categories={categories} selectedId={categoryId} onSelect={(c) => setCategoryId(c.id)} />

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 60 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  typeChip: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    minHeight: 56,
  },
  currencyTile: { width: 34, height: 34, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  currencyCode: { fontSize: 15, fontWeight: '700', lineHeight: 18 },
  currencySubtitle: { fontSize: 12, marginTop: 3 },
  changeAffordance: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8, marginTop: 8, opacity: 0.7 },
  noteInput: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, marginTop: 12, minHeight: 44 },
  noteToggle: { marginTop: 12, minHeight: 44, justifyContent: 'center' },
  saveButton: { marginTop: 24, paddingVertical: 16, borderRadius: 12, alignItems: 'center', minHeight: 44 },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
