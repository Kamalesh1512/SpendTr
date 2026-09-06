// docs/USER_FLOWS.md Flow 1. No account/login step exists anywhere here —
// step 2 creates a local *wallet* (docs/DATABASE_SCHEMA.md `accounts`), not
// a user account.
import { useEffect, useMemo, useState } from 'react';
import * as Localization from 'expo-localization';
import { useRouter, type Href } from 'expo-router';
import { Alert, BackHandler, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { CurrencyPicker } from '@/components/CurrencyPicker';
import { Ionicons } from '@expo/vector-icons';
import { Button, CategoryIcon, Icon, PrivacyLine, Toggle, Track } from '@/components/ds';
import { SpendTrLockup } from '@/components/brand/SpendTrLockup';
import * as accountRepository from '@/repositories/accountRepository';
import * as settingsRepository from '@/repositories/settingsRepository';
import * as biometrics from '@/services/biometrics';
import { ensureNotificationPermission } from '@/services/notifications';
import { majorToMinor } from '@/utils/money';

const LAST_STEP = 3;

// Each quick pick sets the name *and* its icon/color together — a person
// choosing "Bank" from a list of suggestions expects the bank icon to just
// appear, not to have to also visit a separate icon grid.
type IconName = keyof typeof Ionicons.glyphMap;

const ACCOUNT_NAME_PICKS: { name: string; icon: IconName; color: string }[] = [
  { name: 'Cash', icon: 'cash', color: '#22C55E' },
  { name: 'Bank', icon: 'business', color: '#5B5FEF' },
  { name: 'Card', icon: 'card', color: '#6366F1' },
  { name: 'Revolut', icon: 'card', color: '#6366F1' },
  { name: 'Savings', icon: 'briefcase', color: '#14B8A6' },
];

// A typed name that doesn't match a quick pick still gets a sensible icon
// rather than staying on whatever was last selected — matched by keyword so
// "My Revolut account" or "hdfc bank" still resolve correctly. Falls back to
// a neutral placeholder for anything unrecognized.
const ACCOUNT_ICON_KEYWORDS: { keywords: string[]; icon: IconName; color: string }[] = [
  { keywords: ['cash', 'wallet'], icon: 'cash', color: '#22C55E' },
  { keywords: ['bank', 'hdfc', 'chase', 'boa', 'wells fargo'], icon: 'business', color: '#5B5FEF' },
  { keywords: ['card', 'credit', 'debit', 'visa', 'mastercard'], icon: 'card', color: '#6366F1' },
  { keywords: ['revolut', 'paypal', 'venmo', 'wise'], icon: 'card', color: '#6366F1' },
  { keywords: ['saving', 'savings'], icon: 'briefcase', color: '#14B8A6' },
  { keywords: ['store', 'shop'], icon: 'storefront', color: '#F59E0B' },
  { keywords: ['home', 'house'], icon: 'home', color: '#8B5CF6' },
];
const DEFAULT_ACCOUNT_ICON: { icon: IconName; color: string } = { icon: 'wallet-outline', color: '#94A3B8' };

function guessAccountIcon(name: string): { icon: IconName; color: string } {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return DEFAULT_ACCOUNT_ICON;
  const match = ACCOUNT_ICON_KEYWORDS.find((entry) => entry.keywords.some((kw) => normalized.includes(kw)));
  return match ?? DEFAULT_ACCOUNT_ICON;
}

export default function OnboardingScreen() {
  const { colors, space } = useTheme();
  const router = useRouter();
  const { currencies } = useCurrencies();
  const store = useOnboardingStore();
  const [saving, setSaving] = useState(false);
  const [accountNameTouched, setAccountNameTouched] = useState(false);

  const deviceCurrency = useMemo(() => {
    try {
      return Localization.getLocales()[0]?.currencyCode ?? 'USD';
    } catch {
      return 'USD';
    }
  }, []);

  const selectedCode = store.baseCurrencyCode ?? deviceCurrency;
  const selectedCurrency = currencies.find((c) => c.code === selectedCode);

  // Android hardware back moves one onboarding step back instead of leaving
  // the screen (there is no previous route to return to — this is the
  // wizard's root screen) so a user can always correct an earlier choice,
  // matching the in-app back chevron below.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (store.step > 0) {
        store.setStep(store.step - 1);
        return true;
      }
      return false;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.step]);

  function goBack() {
    store.setStep(store.step - 1);
  }

  function pickAccountName(name: string) {
    setAccountNameTouched(true);
    store.setAccountName(name);
    const guess = guessAccountIcon(name);
    store.setAccountIcon(guess.icon);
    store.setAccountColor(guess.color);
  }

  function StepHeader() {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[12], marginBottom: space[20] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={goBack}
          style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginLeft: -6 }}
        >
          <Icon name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Track percent={(store.step / LAST_STEP) * 100} />
        </View>
      </View>
    );
  }

  async function finish() {
    if (!store.accountName.trim()) {
      Alert.alert('Name your account', 'Give your first account a name, e.g. "Cash".');
      return;
    }
    setSaving(true);
    try {
      await settingsRepository.update({
        baseCurrencyCode: selectedCode,
      });
      await accountRepository.create({
        name: store.accountName.trim(),
        currencyCode: selectedCode,
        icon: store.accountIcon,
        color: store.accountColor,
        initialBalanceMinor: store.accountInitialBalanceText
          ? majorToMinor(parseFloat(store.accountInitialBalanceText) || 0, selectedCurrency?.decimalDigits ?? 2)
          : 0,
      });
      await settingsRepository.update({ onboardingComplete: true });
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

  // Step 1 renders CurrencyPicker's own FlatList as the screen's only
  // scrollable element (flex:1, no ScrollView ancestor): nesting that
  // FlatList inside the same outer ScrollView used by other steps broke
  // windowing and threw RN's "VirtualizedLists should never be nested"
  // warning. Other steps have no list of their own, so they keep the plain
  // ScrollView (useful on short screens where their content might not fit).
  if (store.step === 1) {
    const detectedCodes = [...new Set([deviceCurrency, 'USD', 'EUR', 'GBP'])].slice(0, 3);
    const detectedChips = detectedCodes
      .map((code) => currencies.find((c) => c.code === code))
      .filter((c): c is NonNullable<typeof c> => !!c);
    return (
      <View style={[styles.stepOneContainer, { backgroundColor: colors.bg }]}>
        <StepHeader />
        <Text style={[styles.heading, { color: colors.text }]}>Choose your base currency</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Reports and totals will convert into this currency. You can change it later in Settings.
        </Text>
        {detectedChips.length > 0 ? (
          <View style={{ flexDirection: 'row', gap: space[8], justifyContent: 'center', marginBottom: space[16] }}>
            {detectedChips.map((c) => {
              const selected = c.code === selectedCode;
              return (
                <Pressable
                  key={c.code}
                  accessibilityRole="button"
                  onPress={() => store.setBaseCurrencyCode(c.code)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: selected ? colors.accent : colors.border,
                    backgroundColor: selected ? colors.accentQuiet : 'transparent',
                  }}
                >
                  <Text style={{ fontWeight: '600', color: selected ? colors.accent : colors.text }}>{c.symbol}</Text>
                  <Text style={{ color: selected ? colors.accent : colors.text }}>{c.code}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <CurrencyPicker
            currencies={currencies}
            selectedCode={selectedCode}
            onSelect={(c) => store.setBaseCurrencyCode(c.code)}
          />
        </View>
        <View style={{ marginTop: space[24] }}>
          <Button fullWidth onPress={() => store.setStep(2)}>
            Continue with {selectedCode}
          </Button>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
      {store.step === 0 && (
        <View>
          <View style={styles.welcomeLockup}>
            <SpendTrLockup markSize={56} tagline />
          </View>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Track spending in any currency. Nothing ever leaves your phone.
          </Text>
          <View style={{ gap: space[14], marginBottom: space[8] }}>
            {(
              [
                ['phone-portrait-outline', 'Everything stays on this phone'],
                ['swap-horizontal', 'Multi-currency support built-in'],
                ['person', 'No account, no email, no password'],
              ] as const
            ).map(([icon, label]) => (
              <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: space[10] }}>
                <Icon name={icon} size={17} color={colors.accent} />
                <Text style={{ flex: 1, fontSize: 14, color: colors.text }}>{label}</Text>
              </View>
            ))}
          </View>
          <View style={{ marginTop: space[24] }}>
            <Button fullWidth onPress={() => store.setStep(1)}>
              Get Started
            </Button>
            <View style={{ marginTop: space[8] }}>
              <Button variant="quiet" fullWidth onPress={() => router.push('/restore' as Href)}>
                I have a SpendTr backup file
              </Button>
            </View>
          </View>
        </View>
      )}

      {store.step === 2 && (
        <View>
          <StepHeader />
          <Text style={[styles.heading, { color: colors.text }]}>Name your first account</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            An account is just a pot you spend from. Most people start with Cash and add more later.
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[14], marginBottom: space[20] }}>
            <CategoryIcon icon={store.accountIcon} color={store.accountColor} size={52} />
            <TextInput
              testID="account-name-input"
              value={store.accountName}
              onChangeText={(v) => {
                setAccountNameTouched(true);
                store.setAccountName(v);
                const guess = guessAccountIcon(v);
                store.setAccountIcon(guess.icon);
                store.setAccountColor(guess.color);
              }}
              placeholder="Account name"
              placeholderTextColor={colors.textMuted}
              style={[styles.nameInput, { flex: 1, marginBottom: 0, fontSize: 18, fontWeight: '600', color: colors.text, borderColor: colors.border }]}
            />
          </View>

          <Text style={[styles.label, { color: colors.textMuted }]}>Quick picks</Text>
          <View style={[styles.quickPickRow, { justifyContent: 'flex-start', flexWrap: 'wrap' }]}>
            {ACCOUNT_NAME_PICKS.map((pick) => {
              const selected = !accountNameTouched ? pick.name === 'Cash' : pick.name === store.accountName;
              return (
                <Pressable
                  key={pick.name}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => pickAccountName(pick.name)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: selected ? colors.accent : colors.border,
                    backgroundColor: selected ? colors.accentQuiet : 'transparent',
                  }}
                >
                  <Icon name={pick.icon} size={14} color={selected ? colors.accent : pick.color} />
                  <Text style={{ color: selected ? colors.accent : colors.text, fontWeight: selected ? '700' : '500' }}>{pick.name}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: colors.textMuted }]}>Starting balance — optional</Text>
          <TextInput
            testID="account-balance-input"
            value={store.accountInitialBalanceText}
            onChangeText={store.setAccountInitialBalanceText}
            placeholder={`0${selectedCurrency ? selectedCurrency.symbol : ''}`}
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={[styles.nameInput, { color: colors.text, borderColor: colors.border }]}
          />
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Leave blank if you&apos;d rather start from zero and just log from today.
          </Text>

          <View style={{ marginTop: space[24] }}>
            <Button fullWidth onPress={() => store.setStep(3)}>
              Continue
            </Button>
          </View>
        </View>
      )}

      {store.step === 3 && (
        <View>
          <StepHeader />
          <Text style={[styles.heading, { color: colors.text }]}>Two optional extras</Text>

          {(
            [
              {
                icon: 'finger-print' as const,
                label: 'Require Face ID / Fingerprint',
                description: 'Asks after five idle minutes.',
                checked: store.biometricLockEnabled,
                onChange: store.setBiometricLockEnabled,
              },
              {
                icon: 'notifications-outline' as const,
                label: 'Renewal reminders',
                description: 'Scheduled on your phone. No push server.',
                checked: store.notificationsEnabled,
                onChange: store.setNotificationsEnabled,
              },
            ]
          ).map((row) => (
            <View key={row.label} style={[styles.permissionRow, { borderColor: colors.border }]}>
              <View style={[styles.permissionIcon, { backgroundColor: colors.surfaceRaised }]}>
                <Icon name={row.icon} size={18} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{row.label}</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{row.description}</Text>
              </View>
              <Toggle checked={row.checked} onChange={row.onChange} label={row.label} />
            </View>
          ))}

          <View style={{ marginTop: space[16], marginBottom: space[8] }}>
            <PrivacyLine>Both can be turned on or off later in Settings.</PrivacyLine>
          </View>

          <View style={{ marginTop: space[8] }}>
            <Button fullWidth loading={saving} onPress={finish}>
              Start Tracking
            </Button>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  stepOneContainer: { flex: 1, padding: 24, paddingTop: 60 },
  welcomeLockup: { alignItems: 'center', marginBottom: 24 },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowLabel: { fontSize: 15, flex: 1, marginRight: 12 },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  permissionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  quickPickRow: { flexDirection: 'row', gap: 12, marginBottom: 20, justifyContent: 'center' },
  quickPickTile: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8, marginTop: 4, opacity: 0.7 },
  nameInput: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, marginBottom: 4, minHeight: 44 },
  hint: { fontSize: 12, marginTop: 6 },
});
