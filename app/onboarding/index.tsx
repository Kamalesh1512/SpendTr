// docs/USER_FLOWS.md Flow 1. No account creation step exists anywhere here.
import { useMemo, useState } from 'react';
import * as Localization from 'expo-localization';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useAppColors } from '@/hooks/useAppColors';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { CurrencyPicker } from '@/components/CurrencyPicker';
import * as settingsRepository from '@/repositories/settingsRepository';
import * as biometrics from '@/services/biometrics';
import { ensureNotificationPermission } from '@/services/notifications';

export default function OnboardingScreen() {
  const colors = useAppColors();
  const router = useRouter();
  const { currencies } = useCurrencies();
  const store = useOnboardingStore();
  const [saving, setSaving] = useState(false);

  const deviceCurrency = useMemo(() => {
    try {
      return Localization.getLocales()[0]?.currencyCode ?? 'USD';
    } catch {
      return 'USD';
    }
  }, []);

  const selectedCode = store.baseCurrencyCode ?? deviceCurrency;

  async function finish() {
    setSaving(true);
    try {
      await settingsRepository.update({
        baseCurrencyCode: selectedCode,
        onboardingComplete: true,
      });
      if (store.notificationsEnabled) {
        await ensureNotificationPermission();
        await settingsRepository.update({ notificationsEnabled: true });
      }
      if (store.biometricLockEnabled) {
        try {
          await biometrics.setBiometricLockEnabled(true);
        } catch {
          // Hardware unavailable or user declined — proceed without it, per
          // docs/USER_FLOWS.md step 3 ("can be skipped, enabled later").
        }
      }
      store.reset();
      router.replace('/(tabs)');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      {store.step === 0 && (
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Spendtr</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Track spending in any currency. Nothing ever leaves your phone.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => store.setStep(1)}
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </Pressable>
        </View>
      )}

      {store.step === 1 && (
        <View style={{ flex: 1 }}>
          <Text style={[styles.heading, { color: colors.text }]}>Choose your base currency</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Reports and totals will convert into this currency. You can change it later in Settings.
          </Text>
          <View style={{ height: 320 }}>
            <CurrencyPicker
              currencies={currencies}
              selectedCode={selectedCode}
              onSelect={(c) => store.setBaseCurrencyCode(c.code)}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => store.setStep(2)}
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </Pressable>
        </View>
      )}

      {store.step === 2 && (
        <View>
          <Text style={[styles.heading, { color: colors.text }]}>A couple of optional things</Text>

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Require Face ID / Fingerprint</Text>
            <Switch value={store.biometricLockEnabled} onValueChange={store.setBiometricLockEnabled} />
          </View>

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Subscription renewal reminders</Text>
            <Switch value={store.notificationsEnabled} onValueChange={store.setNotificationsEnabled} />
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={finish}
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Start Tracking'}</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 36, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 24 },
  primaryButton: { marginTop: 24, paddingVertical: 16, borderRadius: 12, alignItems: 'center', minHeight: 44 },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowLabel: { fontSize: 15, flex: 1, marginRight: 12 },
});
