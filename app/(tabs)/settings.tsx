// docs/USER_FLOWS.md Flow 7, 8; docs/UI_UX_GUIDELINES.md Design Principle
// #2 — deliberately no "connect your bank" option anywhere in this screen.
import { useEffect, useState } from 'react';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';
import Constants from 'expo-constants';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { ACCENT_PRESETS, ACCENT_PRESET_LABELS, type AccentPresetId } from '@/theme/accent';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useSettings } from '@/hooks/useSettings';
import { CurrencyPickerSheet } from '@/components/CurrencyPickerSheet';
import { Chip, Group, Icon, PrivacyLine, ScreenHeader, SectionLabel, SettingsRow, Toggle } from '@/components/ds';
import * as settingsRepository from '@/repositories/settingsRepository';
import * as biometrics from '@/services/biometrics';
import * as notifications from '@/services/notifications';
import * as purchases from '@/services/purchases';
import { exportTransactionsCsv, exportTransactionsPdf } from '@/services/export';
import * as currencyService from '@/services/currency';
import { getDb } from '@/db/client';
import { PaywallRequiredError } from '@/types/errors';

const ACCENT_IDS = Object.keys(ACCENT_PRESETS) as AccentPresetId[];

export default function SettingsScreen() {
  const { colors, space, font, radius } = useTheme();
  const router = useRouter();
  const { settings, refetch } = useSettings();
  const { currencies } = useCurrencies();
  const [busy, setBusy] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [ratesFetchedAt, setRatesFetchedAt] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  useEffect(() => {
    if (!settings?.baseCurrencyCode) return;
    currencyService.getLatestFetchTime(getDb(), settings.baseCurrencyCode).then(setRatesFetchedAt);
  }, [settings?.baseCurrencyCode]);

  if (!settings) return null;

  const baseCurrency = currencies.find((c) => c.code === settings.baseCurrencyCode);
  const ratesLabel = ratesFetchedAt
    ? new Date(ratesFetchedAt).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' })
    : 'Not fetched yet';
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  async function toggleTheme(theme: 'system' | 'light' | 'dark') {
    await settingsRepository.update({ theme });
    refetch();
  }

  async function setAccent(accentColor: string) {
    await settingsRepository.update({ accentColor });
    refetch();
  }

  async function toggleBiometric(enabled: boolean) {
    setBusy(true);
    try {
      await biometrics.setBiometricLockEnabled(enabled);
    } catch (e) {
      Alert.alert('Could not enable', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
      refetch();
    }
  }

  async function toggleHideAmounts(enabled: boolean) {
    await settingsRepository.update({ hideAmountsInSwitcher: enabled });
    refetch();
  }

  async function toggleNotifications(enabled: boolean) {
    setBusy(true);
    try {
      if (enabled) {
        const granted = await notifications.ensureNotificationPermission();
        if (!granted) {
          Alert.alert('Permission needed', 'Enable notifications for this app in your device settings.');
        }
      }
      await settingsRepository.update({ notificationsEnabled: enabled });
    } finally {
      setBusy(false);
      refetch();
    }
  }

  async function handleExport(format: 'csv' | 'pdf') {
    setBusy(true);
    try {
      if (format === 'csv') await exportTransactionsCsv();
      else await exportTransactionsPdf();
    } catch (e) {
      if (e instanceof PaywallRequiredError) {
        router.push('/paywall');
      } else {
        Alert.alert('Export failed', e instanceof Error ? e.message : 'Unknown error');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    setBusy(true);
    try {
      const isPro = await purchases.restorePurchases();
      Alert.alert(isPro ? 'Restored' : 'Nothing to restore', isPro ? 'Pro is now active.' : undefined);
    } catch (e) {
      Alert.alert('Restore failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
      refetch();
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: space[60] }}>
        <ScreenHeader title="Settings" />

        <Section title="Appearance">
          <Group>
            <View style={{ paddingHorizontal: space[16], paddingVertical: space[14], borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ flexDirection: 'row', gap: space[8], marginBottom: space[8] }}>
                {(['system', 'light', 'dark'] as const).map((t) => (
                  <Chip key={t} label={t} selected={settings.theme === t} onPress={() => toggleTheme(t)} />
                ))}
              </View>
              <Text style={{ fontSize: font.size.xs, color: colors.textMuted }}>Dark is the default. Light is fully supported.</Text>
            </View>

            <View style={{ paddingHorizontal: space[16], paddingVertical: space[14] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space[10] }}>
                <Text style={{ fontSize: font.size.body, color: colors.text }}>Accent colour</Text>
                <Text style={{ fontSize: font.size.xs, color: colors.textMuted }}>{ACCENT_PRESET_LABELS[settings.accentColor as AccentPresetId] ?? ''}</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[8] }}>
                {ACCENT_IDS.map((id) => {
                  const selected = settings.accentColor === id;
                  return (
                    <Pressable
                      key={id}
                      accessibilityRole="button"
                      accessibilityLabel={ACCENT_PRESET_LABELS[id]}
                      onPress={() => setAccent(id)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: radius.full,
                        backgroundColor: ACCENT_PRESETS[id],
                        borderWidth: 2,
                        borderColor: selected ? colors.text : 'transparent',
                      }}
                    />
                  );
                })}
              </View>
              <Text style={{ fontSize: font.size.xs, color: colors.textMuted, marginTop: space[10] }}>
                Recolours buttons, tabs and selection only. Category colours and the SpendTr mark never change.
              </Text>
            </View>
          </Group>
        </Section>

        <Section title="Security">
          <Group>
            <SettingsRow
              icon={<Icon name="finger-print" size={18} color={colors.textMuted} />}
              label="Require Face ID / Fingerprint"
              hint="Asks again after five idle minutes."
            >
              <Toggle checked={settings.biometricLockEnabled} onChange={toggleBiometric} disabled={busy} label="Require Face ID / Fingerprint" />
            </SettingsRow>
            <SettingsRow icon={<Icon name="eye-off-outline" size={18} color={colors.textMuted} />} label="Hide amounts in the app switcher" last>
              <Toggle checked={settings.hideAmountsInSwitcher} onChange={toggleHideAmounts} label="Hide amounts in the app switcher" />
            </SettingsRow>
          </Group>
        </Section>

        <Section title="Reminders">
          <Group>
            <SettingsRow
              icon={<Icon name="notifications-outline" size={18} color={colors.textMuted} />}
              label="Renewal reminders"
              hint="Scheduled locally. No push server exists."
              last
            >
              <Toggle checked={settings.notificationsEnabled} onChange={toggleNotifications} disabled={busy} label="Renewal reminders" />
            </SettingsRow>
          </Group>
        </Section>

        <Section title="Money">
          <Group>
            <SettingsRow
              icon={<Icon name="swap-horizontal" size={18} color={colors.textMuted} />}
              label="Base currency"
              onPress={() => setShowCurrencyPicker(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[6] }}>
                <Text style={{ color: colors.textMuted, fontSize: font.size.body }}>{baseCurrency?.code ?? settings.baseCurrencyCode}</Text>
                <Icon name="chevron-forward" size={15} color={colors.textMuted} />
              </View>
            </SettingsRow>
            <SettingsRow
              icon={<Icon name="refresh" size={18} color={colors.textMuted} />}
              label="Exchange rates"
              hint="Fetched once a day. Cached offline."
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[6] }}>
                <Text style={{ color: colors.textMuted, fontSize: font.size.xs }}>{ratesLabel}</Text>
              </View>
            </SettingsRow>
            <SettingsRow icon={<Icon name="pricetag-outline" size={18} color={colors.textMuted} />} label="Manage categories" onPress={() => router.push('/categories')} last>
              <Icon name="chevron-forward" size={16} color={colors.textMuted} />
            </SettingsRow>
          </Group>
        </Section>

        <Section title="Your data">
          <Group>
            <SettingsRow icon={<Icon name="cloud-upload-outline" size={18} color={colors.textMuted} />} label="Back up" hint="Encrypted with a passphrase you choose." onPress={() => router.push('/backup' as Href)}>
              <Icon name="chevron-forward" size={15} color={colors.textMuted} />
            </SettingsRow>
            <SettingsRow icon={<Icon name="cloud-download-outline" size={18} color={colors.textMuted} />} label="Restore from a backup" onPress={() => router.push('/restore' as Href)}>
              <Icon name="chevron-forward" size={15} color={colors.textMuted} />
            </SettingsRow>
            <SettingsRow icon={<Icon name="document-text-outline" size={18} color={colors.textMuted} />} label="Export as CSV" onPress={() => handleExport('csv')}>
              <Icon name="chevron-forward" size={15} color={colors.textMuted} />
            </SettingsRow>
            <SettingsRow icon={<Icon name="document-outline" size={18} color={colors.textMuted} />} label="Export as PDF" onPress={() => handleExport('pdf')}>
              <Icon name="chevron-forward" size={15} color={colors.textMuted} />
            </SettingsRow>
            <SettingsRow icon={<Icon name="folder-open-outline" size={18} color={colors.textMuted} />} label="Import a CSV" onPress={() => router.push('/import-csv' as Href)} last>
              <Icon name="chevron-forward" size={15} color={colors.textMuted} />
            </SettingsRow>
          </Group>
          <Text style={{ fontSize: font.size.xs, color: colors.textMuted, marginTop: space[8] }}>
            All your data lives only on this device. Deleting the app deletes it — export first if you switch phones.
          </Text>
        </Section>

        <Section title="SpendTr Pro">
          <Group>
            {settings.isPro ? (
              <SettingsRow icon={<Icon name="checkmark-circle" size={18} color={colors.success} />} label="Pro is unlocked" hint="One-time purchase · thank you" />
            ) : (
              <SettingsRow icon={<Icon name="pricetag" size={18} color={colors.textMuted} />} label="Unlock Pro" hint="One payment, no subscription." onPress={() => router.push('/paywall')}>
                <Icon name="chevron-forward" size={16} color={colors.textMuted} />
              </SettingsRow>
            )}
            <SettingsRow icon={<Icon name="refresh" size={18} color={colors.textMuted} />} label="Restore purchases" onPress={handleRestore}>
              <Icon name="chevron-forward" size={16} color={colors.textMuted} />
            </SettingsRow>
            <SettingsRow
              icon={<Icon name="mail-outline" size={18} color={colors.textMuted} />}
              label="Use Pro on another device"
              hint="A one-time link. Still not an account."
              onPress={() => router.push('/link-pro' as Href)}
              last
            >
              <Icon name="chevron-forward" size={16} color={colors.textMuted} />
            </SettingsRow>
          </Group>
        </Section>

        <Section title="About">
          <Group>
            <SettingsRow label="Version" last>
              <Text style={{ fontSize: font.size.bodySm, color: colors.textMuted, fontVariant: ['tabular-nums'] }}>{appVersion}</Text>
            </SettingsRow>
          </Group>
        </Section>

        <View style={{ paddingHorizontal: space[20], marginTop: space[8] }}>
          <PrivacyLine>SpendTr has no server, no account and no bank connection. Everything you see lives in a database on this phone.</PrivacyLine>
        </View>
      </ScrollView>

      <CurrencyPickerSheet
        visible={showCurrencyPicker}
        currencies={currencies}
        selectedCode={settings.baseCurrencyCode}
        onSelect={async (c) => {
          await settingsRepository.update({ baseCurrencyCode: c.code });
          setShowCurrencyPicker(false);
          refetch();
        }}
        onClose={() => setShowCurrencyPicker(false)}
      />
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors, space, font } = useTheme();
  return (
    <View style={{ paddingHorizontal: space[20], marginBottom: space[28] }}>
      <Text style={{ fontSize: font.size.sm, fontWeight: '700', textTransform: 'uppercase', color: colors.textMuted, marginBottom: space[8] }}>
        {title}
      </Text>
      {children}
    </View>
  );
}
