// docs/USER_FLOWS.md Flow 3.
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
import * as subscriptionRepository from '@/repositories/subscriptionRepository';
import { PaywallRequiredError } from '@/types/errors';
import { todayIsoDate, type BillingCycle } from '@/utils/date';

const CYCLES: BillingCycle[] = ['weekly', 'monthly', 'quarterly', 'yearly'];

export default function AddSubscriptionScreen() {
  const colors = useAppColors();
  const router = useRouter();
  const { settings } = useSettings();
  const { currencies } = useCurrencies();
  const { categories } = useCategories('expense');

  const [name, setName] = useState('');
  const [amountDigits, setAmountDigits] = useState('');
  const [currencyCode, setCurrencyCode] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [nextRenewalDate, setNextRenewalDate] = useState(todayIsoDate());
  const [categoryId, setCategoryId] = useState<string | null>(null);
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
    if (!name.trim()) {
      Alert.alert('Enter a name');
      return;
    }
    if (!amountMinor) {
      Alert.alert('Enter an amount');
      return;
    }
    setSaving(true);
    try {
      await subscriptionRepository.create({
        name: name.trim(),
        amountMinor,
        currencyCode: effectiveCurrencyCode,
        billingCycle,
        nextRenewalDate,
        categoryId: categoryId ?? undefined,
      });
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
        reason="subscription_limit"
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
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Subscription name (e.g. Netflix)"
          placeholderTextColor={colors.textMuted}
          style={[styles.nameInput, { color: colors.text, borderColor: colors.border }]}
        />

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

        <Text style={[styles.label, { color: colors.textMuted }]}>Billing Cycle</Text>
        <View style={styles.cycleRow}>
          {CYCLES.map((c) => (
            <Pressable
              key={c}
              onPress={() => setBillingCycle(c)}
              style={[
                styles.cycleChip,
                { borderColor: colors.border, backgroundColor: billingCycle === c ? colors.primary : 'transparent' },
              ]}
            >
              <Text style={{ color: billingCycle === c ? '#fff' : colors.text }}>{c}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.textMuted }]}>Next renewal date</Text>
        <DatePicker value={nextRenewalDate} onChange={setNextRenewalDate} />

        <Text style={[styles.label, { color: colors.textMuted }]}>Category (optional)</Text>
        <View style={{ height: 200 }}>
          <CategoryPicker categories={categories} selectedId={categoryId} onSelect={(c) => setCategoryId(c.id)} />
        </View>

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
  nameInput: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, marginBottom: 8, minHeight: 44 },
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
  cycleRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  cycleChip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  backRow: { padding: 16, minHeight: 44, justifyContent: 'center' },
  saveButton: { marginTop: 24, paddingVertical: 16, borderRadius: 12, alignItems: 'center', minHeight: 44 },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
