// Backup (docs/design_system/templates/spendtr-app/data-mgmt.jsx
// `BackupScreen`, docs/USER_FLOWS.md Flow 14). A backup is a single
// encrypted file — the user picks where it goes via the OS share sheet;
// Spendtr never uploads it anywhere (docs/SECURITY.md §5).
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Field, Group, Icon, Input, Note, PrivacyLine, SectionLabel, SettingsRow, Track } from '@/components/ds';
import { createBackupSnapshot, getBackupPreviewCounts, writeBackupToUserLocation } from '@/services/backup';
import { PaywallRequiredError } from '@/types/errors';

const MONOSPACE = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

function strengthOf(passphrase: string): 0 | 1 | 2 | 3 | 4 {
  if (passphrase.length < 12) return passphrase.length === 0 ? 0 : 1;
  if (passphrase.length < 16) return 2;
  if (passphrase.length < 24) return 3;
  return 4;
}

export default function BackupScreen() {
  const { colors, space, font, radius, borderWidth } = useTheme();
  const router = useRouter();
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<{ entryCount: number; accountCount: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [filename, setFilename] = useState<string | null>(null);
  const [fileSizeBytes, setFileSizeBytes] = useState<number | null>(null);

  useEffect(() => {
    getBackupPreviewCounts()
      .then(setCounts)
      .catch(() => setCounts(null));
  }, []);

  const strength = strengthOf(passphrase);
  const tooShort = passphrase.length > 0 && passphrase.length < 12;
  const mismatch = confirm.length > 0 && confirm !== passphrase;
  const valid = passphrase.length >= 12 && confirm === passphrase && acknowledged;

  async function run() {
    if (!valid) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    setFilename(null);
    setFileSizeBytes(null);
    // No real byte-level progress signal from the KDF/cipher calls — this
    // ticks toward 90% over the KDF's expected ~1s so the screen isn't
    // static, then jumps to 100% the instant the real work finishes.
    const ticker = setInterval(() => setProgress((p) => Math.min(90, p + 9)), 100);
    try {
      const { encryptedBlob, filename: name } = await createBackupSnapshot(passphrase);
      clearInterval(ticker);
      setProgress(100);
      setFilename(name);
      setFileSizeBytes(encryptedBlob.length);
      await writeBackupToUserLocation(encryptedBlob, name);
      router.back();
    } catch (e) {
      clearInterval(ticker);
      if (e instanceof PaywallRequiredError) {
        router.replace({ pathname: '/paywall', params: { reason: e.reason } });
      } else {
        setError(e instanceof Error ? e.message : 'Could not create the backup.');
      }
    } finally {
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: space[32] }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.accentQuiet,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: space[16],
          }}
        >
          <Icon name="lock-closed-outline" size={26} color={colors.accent} />
        </View>
        <Text style={{ fontSize: font.size.lg, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
          Encrypting {counts?.entryCount ?? ''} {counts?.entryCount === 1 ? 'entry' : 'entries'}…
        </Text>
        <View style={{ width: '100%', marginTop: space[20] }}>
          <Track percent={progress} />
        </View>
        {filename ? (
          <Text style={{ fontSize: font.size.xs, color: colors.textMuted, marginTop: space[10] }}>
            {filename} · {fileSizeBytes != null ? `${Math.max(1, Math.round(fileSizeBytes / 1024))} KB` : ''}
          </Text>
        ) : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[12], paddingTop: space[8], paddingBottom: space[8] }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: font.size.lg, fontWeight: '700', color: colors.text }}>Back up</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: space[20] }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: font.size.bodySm, color: colors.textMuted, marginBottom: space[20], lineHeight: 20 }}>
          A backup is a single encrypted file. You choose where it goes — your phone&apos;s Files app, a USB drive, whatever
          your OS offers. Spendtr never uploads it anywhere.
        </Text>

        <Group>
          <SettingsRow
            icon={<Icon name="document-text-outline" size={18} color={colors.textMuted} />}
            label={counts ? `${counts.entryCount} ${counts.entryCount === 1 ? 'entry' : 'entries'} · ${counts.accountCount} ${counts.accountCount === 1 ? 'account' : 'accounts'}` : 'Loading…'}
            hint="Categories, budgets, goals, debts and recurring items included."
            last
          />
        </Group>

        <View style={{ marginTop: space[20] }}>
          <SectionLabel size="md">Passphrase</SectionLabel>
          <Field
            label="Choose a passphrase"
            error={tooShort ? 'Too short. Use at least 12 characters — four unrelated words works well.' : undefined}
            hint={tooShort ? undefined : 'Four unrelated words is stronger and easier to remember than symbols.'}
          >
            <View style={{ position: 'relative', justifyContent: 'center' }}>
              <Input
                value={passphrase}
                onChangeText={setPassphrase}
                placeholder="At least 12 characters"
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

          <View style={{ marginTop: -space[8], marginBottom: space[20] }}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: i < strength ? (strength <= 1 ? colors.danger : colors.success) : colors.border,
                  }}
                />
              ))}
            </View>
            {passphrase.length > 0 ? (
              <Text style={{ fontSize: 11, color: strength <= 1 ? colors.danger : colors.success, marginTop: space[6] }}>
                {strength <= 1 ? 'Weak' : strength === 2 ? 'Okay' : strength === 3 ? 'Strong' : 'Very strong'}
              </Text>
            ) : null}
          </View>

          <Field label="Confirm passphrase" error={mismatch ? "Doesn't match." : undefined}>
            <Input
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Type it again"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!reveal}
              style={{ fontFamily: MONOSPACE }}
            />
          </Field>
        </View>

        <View style={{ marginBottom: space[20] }}>
          <Note tone="warn">
            There is no recovery. The passphrase never leaves your phone and is not stored anywhere, so a lost passphrase
            means the backup file can never be opened — by us or by anyone. Write it down somewhere real.
          </Note>
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acknowledged }}
          onPress={() => setAcknowledged((a) => !a)}
          style={{ flexDirection: 'row', gap: space[10], alignItems: 'flex-start', marginBottom: space[20] }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              backgroundColor: acknowledged ? colors.accent : 'transparent',
              borderWidth: acknowledged ? 0 : borderWidth.thin,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 1,
            }}
          >
            {acknowledged ? <Icon name="checkmark" size={15} color={colors.accentContrast} /> : null}
          </View>
          <Text style={{ flex: 1, fontSize: font.size.bodySm, color: colors.text, lineHeight: 20 }}>
            I&apos;ve saved this passphrase somewhere I can find it.
          </Text>
        </Pressable>

        {error ? (
          <View style={{ marginBottom: space[12] }}>
            <Note tone="danger">{error}</Note>
          </View>
        ) : null}

        <Button variant="primary" fullWidth icon="cloud-upload-outline" disabled={!valid} loading={busy} onPress={run}>
          Encrypt and choose location
        </Button>
        <View style={{ marginTop: space[14] }}>
          <PrivacyLine>The next screen is your operating system&apos;s share sheet, not ours.</PrivacyLine>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
