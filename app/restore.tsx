// Restore (docs/design_system/templates/spendtr-app/data-mgmt.jsx
// `RestoreScreen`). Restoring replaces everything currently on this phone —
// a full replace, not a merge (see src/services/backup.ts header for why).
// A wrong passphrase is stated plainly with "nothing has been changed",
// with deliberately no attempt limit or lockout.
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Field, Group, Icon, Input, Note, SettingsRow } from '@/components/ds';
import { listLocalBackups, pickBackupFile, readLocalBackup, restoreFromFile, WrongPassphraseError, type LocalBackupFile } from '@/services/backup';
import * as purchases from '@/services/purchases';
import { PaywallRequiredError } from '@/types/errors';

const MONOSPACE = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

export default function RestoreScreen() {
  const { colors, space, font, radius, borderWidth } = useTheme();
  const router = useRouter();
  const [file, setFile] = useState<{ name: string; content: string } | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [localBackups, setLocalBackups] = useState<LocalBackupFile[]>([]);

  useEffect(() => {
    try {
      setLocalBackups(listLocalBackups());
    } catch {
      setLocalBackups([]);
    }
  }, []);

  async function choose() {
    const picked = await pickBackupFile();
    if (!picked) return;
    setFile(picked);
    setPassphrase('');
    setAttempts(0);
    setError(null);
  }

  async function chooseLocal(name: string) {
    const content = await readLocalBackup(name);
    setFile({ name, content });
    setPassphrase('');
    setAttempts(0);
    setError(null);
  }

  function confirmRestore() {
    Alert.alert(
      'Replace everything on this phone?',
      'This overwrites all current accounts, transactions, budgets, goals and debts with the contents of this file. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', style: 'destructive', onPress: run },
      ],
    );
  }

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await restoreFromFile(file.content, passphrase);
      await purchases.reconcileProEntitlement();
      Alert.alert('Restored', 'Your data has been replaced with the contents of the backup.', [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (e) {
      if (e instanceof PaywallRequiredError) {
        router.replace({ pathname: '/paywall', params: { reason: e.reason } });
      } else if (e instanceof WrongPassphraseError) {
        setAttempts((a) => a + 1);
        setError(e.message);
      } else {
        setError(e instanceof Error ? e.message : 'Could not restore this backup.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[12], paddingTop: space[8], paddingBottom: space[8] }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: font.size.lg, fontWeight: '700', color: colors.text }}>Restore</Text>
      </View>

      {!file ? (
        <ScrollView contentContainerStyle={{ padding: space[20] }}>
          <Text style={{ fontSize: font.size.bodySm, color: colors.textMuted, marginBottom: space[20], lineHeight: 20 }}>
            Pick a .stbak file. Restoring replaces everything currently on this phone.
          </Text>
          {localBackups.length > 0 ? (
            <View style={{ marginBottom: space[20] }}>
              <Text style={{ fontSize: font.size.xs, color: colors.textMuted, marginBottom: space[8], textTransform: 'uppercase', letterSpacing: font.letterSpacing.label, fontWeight: '700' }}>
                Found on this device
              </Text>
              <Group>
                {localBackups.map((b, i) => (
                  <SettingsRow
                    key={b.name}
                    icon={<Icon name="document-text-outline" size={18} color={colors.textMuted} />}
                    label={b.name}
                    hint={`${Math.max(1, Math.round(b.sizeBytes / 1024))} KB`}
                    onPress={() => chooseLocal(b.name)}
                    last={i === localBackups.length - 1}
                  />
                ))}
              </Group>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={choose}
            style={{
              alignItems: 'center',
              gap: space[10],
              padding: space[24],
              borderRadius: radius.lg,
              borderWidth: borderWidth.thin,
              borderStyle: 'dashed',
              borderColor: colors.borderStrong,
              marginBottom: space[20],
            }}
          >
            <Icon name="folder-open-outline" size={26} color={colors.accent} />
            <Text style={{ fontSize: font.size.body, fontWeight: '600', color: colors.accent }}>Choose a backup file</Text>
            <Text style={{ fontSize: font.size.xs, color: colors.textMuted }}>Opens your phone&apos;s file picker</Text>
          </Pressable>
          <Note tone="warn">Restoring overwrites everything already on this phone. Back that up first if you might want it.</Note>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: space[20] }} keyboardShouldPersistTaps="handled">
          <Group>
            <SettingsRow icon={<Icon name="document-text-outline" size={18} color={colors.textMuted} />} label={file.name} hint="Encrypted Spendtr backup" last />
          </Group>

          <View style={{ marginTop: space[20] }}>
            <Field
              label="Passphrase"
              error={error ?? undefined}
              hint={error ? undefined : 'The one you chose when the backup was made.'}
            >
              <View style={{ position: 'relative', justifyContent: 'center' }}>
                <Input
                  value={passphrase}
                  onChangeText={(t) => {
                    setPassphrase(t);
                    setError(null);
                  }}
                  placeholder="Your backup passphrase"
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!reveal}
                  style={{ fontFamily: MONOSPACE, paddingRight: space[40] }}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={reveal ? 'Hide passphrase' : 'Show passphrase'}
                  onPress={() => setReveal((v) => !v)}
                  style={{ position: 'absolute', right: space[12], height: 24, width: 24, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name={reveal ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            </Field>
            {attempts > 0 ? (
              <View style={{ marginTop: -space[8], marginBottom: space[8] }}>
                <Note tone="info">
                  Attempt {attempts + 1}. There&apos;s no limit and no lockout — keep trying, or double-check the passphrase you wrote down.
                </Note>
              </View>
            ) : null}
          </View>

          <View style={{ marginBottom: space[20] }}>
            <Note tone="warn">This replaces everything on this phone with the contents of the file. It cannot be undone.</Note>
          </View>

          <Button variant="primary" fullWidth icon="cloud-download-outline" disabled={!passphrase || busy} loading={busy} onPress={confirmRestore}>
            Decrypt and restore
          </Button>
          <View style={{ marginTop: space[10] }}>
            <Button variant="quiet" fullWidth onPress={() => setFile(null)}>
              Choose a different file
            </Button>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
