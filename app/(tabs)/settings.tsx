// docs/USER_FLOWS.md Flow 7, 8; docs/UI_UX_GUIDELINES.md Design Principle
// #2 — deliberately no "connect your bank" option anywhere in this screen.
import { useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/hooks/useAppColors';
import { useSettings } from '@/hooks/useSettings';
import * as settingsRepository from '@/repositories/settingsRepository';
import * as biometrics from '@/services/biometrics';
import * as notifications from '@/services/notifications';
import * as purchases from '@/services/purchases';
import { exportTransactionsCsv, exportTransactionsPdf } from '@/services/export';
import { PaywallRequiredError } from '@/types/errors';

export default function SettingsScreen() {
  const colors = useAppColors();
  const router = useRouter();
  const { settings, refetch } = useSettings();
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  if (!settings) return null;

  async function toggleTheme(theme: 'system' | 'light' | 'dark') {
    await settingsRepository.update({ theme });
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.header, { color: colors.text }]}>Settings</Text>

        <Section title="Security" colorText={colors.text}>
          <Row label="Require Face ID / Fingerprint" color={colors.text}>
            <Switch value={settings.biometricLockEnabled} onValueChange={toggleBiometric} disabled={busy} />
          </Row>
        </Section>

        <Section title="Notifications" colorText={colors.text}>
          <Row label="Subscription renewal reminders" color={colors.text}>
            <Switch value={settings.notificationsEnabled} onValueChange={toggleNotifications} disabled={busy} />
          </Row>
        </Section>

        <Section title="Appearance" colorText={colors.text}>
          <View style={styles.themeRow}>
            {(['system', 'light', 'dark'] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => toggleTheme(t)}
                style={[
                  styles.themeChip,
                  {
                    borderColor: colors.border,
                    backgroundColor: settings.theme === t ? colors.primary : 'transparent',
                  },
                ]}
              >
                <Text style={{ color: settings.theme === t ? '#fff' : colors.text }}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title="Your Data" colorText={colors.text}>
          <Pressable onPress={() => handleExport('csv')} disabled={busy} style={styles.linkRow}>
            <Text style={[styles.link, { color: colors.primary }]}>Export as CSV</Text>
          </Pressable>
          <Pressable onPress={() => handleExport('pdf')} disabled={busy} style={styles.linkRow}>
            <Text style={[styles.link, { color: colors.primary }]}>Export as PDF</Text>
          </Pressable>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            All your data lives only on this device. Deleting the app deletes it — export first if you switch phones.
          </Text>
        </Section>

        <Section title="Pro" colorText={colors.text}>
          {settings.isPro ? (
            <Text style={{ color: colors.success }}>Pro unlocked ✓</Text>
          ) : (
            <Pressable onPress={() => router.push('/paywall')} style={styles.linkRow}>
              <Text style={[styles.link, { color: colors.primary }]}>Unlock Pro</Text>
            </Pressable>
          )}
          <Pressable onPress={handleRestore} disabled={busy} style={styles.linkRow}>
            <Text style={[styles.link, { color: colors.primary }]}>Restore Purchases</Text>
          </Pressable>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, colorText, children }: { title: string; colorText: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colorText }]}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 120 },
  header: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8, opacity: 0.7 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  rowLabel: { fontSize: 15, flex: 1, marginRight: 12 },
  themeRow: { flexDirection: 'row', gap: 8 },
  themeChip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  linkRow: { paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  link: { fontSize: 15, fontWeight: '600' },
  hint: { fontSize: 12, marginTop: 8 },
});
