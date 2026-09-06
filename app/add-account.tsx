// AddEditAccount — designed by implementation (Onboarding — Account covers
// only the first account; adding a second, Pro-gated account has no
// designed surface — see the implementation plan §4). Reuses the same
// quick-pick + name + starting-balance shape as onboarding's account step.
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/hooks/useSettings';
import { useCurrencies } from '@/hooks/useCurrencies';
import { CurrencyPickerSheet } from '@/components/CurrencyPickerSheet';
import { Button, Field, Input, Note, PickerRow, ScreenHeader } from '@/components/ds';
import * as accountRepository from '@/repositories/accountRepository';
import { PaywallRequiredError } from '@/types/errors';
import { majorToMinor, minorToMajor } from '@/utils/money';

const QUICK_PICKS: { name: string; icon: string; color: string }[] = [
  { name: 'Cash', icon: 'cash', color: '#22C55E' },
  { name: 'Bank', icon: 'card', color: '#5B5FEF' },
  { name: 'Savings', icon: 'wallet', color: '#F59E0B' },
  { name: 'Travel fund', icon: 'airplane', color: '#14B8A6' },
];

export default function AddAccountScreen() {
  const { colors, space } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;
  const { settings } = useSettings();
  const { currencies } = useCurrencies();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('card');
  const [color, setColor] = useState('#5B5FEF');
  const [currencyCode, setCurrencyCode] = useState<string | null>(null);
  const [balanceText, setBalanceText] = useState('');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!isEditing);

  useEffect(() => {
    if (!id) return;
    accountRepository.list().then((accounts) => {
      const existing = accounts.find((a) => a.id === id);
      if (existing) {
        setName(existing.name);
        setIcon(existing.icon);
        setColor(existing.color);
        setCurrencyCode(existing.currencyCode);
        setBalanceText(existing.initialBalanceMinor ? String(minorToMajor(existing.initialBalanceMinor, currencies.find((c) => c.code === existing.currencyCode)?.decimalDigits ?? 2)) : '');
      }
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const effectiveCurrencyCode = currencyCode ?? settings?.baseCurrencyCode ?? 'USD';
  const currency = currencies.find((c) => c.code === effectiveCurrencyCode);

  async function save() {
    if (!name.trim()) {
      Alert.alert('Enter a name');
      return;
    }
    setSaving(true);
    try {
      const initialBalanceMinor = balanceText
        ? majorToMinor(parseFloat(balanceText) || 0, currency?.decimalDigits ?? 2)
        : 0;
      if (isEditing && id) {
        await accountRepository.update(id, { name: name.trim(), icon, color, initialBalanceMinor });
      } else {
        await accountRepository.create({
          name: name.trim(),
          currencyCode: effectiveCurrencyCode,
          icon,
          color,
          initialBalanceMinor,
        });
      }
      router.back();
    } catch (e) {
      if (e instanceof PaywallRequiredError) {
        router.replace('/paywall');
      } else {
        Alert.alert('Could not save', e instanceof Error ? e.message : 'Unknown error');
      }
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={isEditing ? 'Edit account' : 'New account'} />
      <ScrollView contentContainerStyle={{ padding: space[20], paddingBottom: space[60] }}>
        <Field label="Icon and colour">
          <View style={{ flexDirection: 'row', gap: space[12], justifyContent: 'center' }}>
            {QUICK_PICKS.map((pick) => {
              const selected = pick.icon === icon && pick.color === color;
              return (
                <Pressable
                  key={pick.name}
                  accessibilityRole="button"
                  accessibilityLabel={pick.name}
                  onPress={() => {
                    setIcon(pick.icon);
                    setColor(pick.color);
                  }}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: pick.color,
                    borderWidth: 2,
                    borderColor: selected ? colors.text : 'transparent',
                  }}
                >
                  <Ionicons name={pick.icon as keyof typeof Ionicons.glyphMap} size={22} color="#FFFFFF" />
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label="Account name">
          <Input testID="account-name-input" value={name} onChangeText={setName} placeholder="e.g. Travel fund" />
        </Field>

        {isEditing ? (
          <View style={{ marginBottom: space[16] }}>
            <Note tone="info">Currency can&apos;t be changed after an account has entries — its existing transactions were already recorded in {effectiveCurrencyCode}.</Note>
          </View>
        ) : (
          <Field label="Currency">
            <PickerRow icon="cash-outline" label="Currency" value={effectiveCurrencyCode} onPress={() => setShowCurrencyPicker(true)} accent />
          </Field>
        )}

        <Field label="Starting balance — optional">
          <Input value={balanceText} onChangeText={setBalanceText} keyboardType="decimal-pad" placeholder="0" />
        </Field>

        <Button fullWidth loading={saving} onPress={save} icon={isEditing ? undefined : 'add'}>
          {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create account'}
        </Button>
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
