// Cross-Platform Pro Restore (docs/USER_FLOWS.md Flow 15, Gap #4 fix).
// Redrawn from the design's magic-link email flow — that needs a mail
// service, a token store, and a link handler (i.e. a backend), which breaks
// "no backend" and "the raw email never leaves the device"
// (see the implementation plan §8, deviation #1). This version keeps the
// same tokens, voice, and the "This is not an account" box, but the email
// is hashed on-device and passed straight to Purchases.logIn() — there is
// no email sent, no link, and no 24-hour expiry to talk about.
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Field, Icon, Input, PrivacyLine } from '@/components/ds';
import * as purchases from '@/services/purchases';

export default function LinkProScreen() {
  const { colors, space, font, radius, borderWidth } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<'unlocked' | 'linked' | null>(null);

  const validEmail = /\S+@\S+\.\S+/.test(email.trim());

  async function link() {
    if (!validEmail) return;
    setBusy(true);
    setError(null);
    try {
      const isPro = await purchases.linkProToEmail(email.trim());
      setResult(isPro ? 'unlocked' : 'linked');
    } catch (e) {
      setError(e instanceof Error ? e.message : "That address couldn't be linked. Check the spelling and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[16], paddingTop: space[8], paddingBottom: space[8] }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={22} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: font.size.lg, fontWeight: '700', color: colors.text, marginLeft: space[4] }}>Use Pro elsewhere</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: space[24], paddingTop: space[12] }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', gap: space[12] }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: result ? colors.successQuiet : colors.surfaceRaised,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={result ? 'checkmark-circle' : 'mail-outline'} size={24} color={result ? colors.success : colors.accent} />
          </View>
          <Text style={{ fontSize: font.size['2xl'], fontWeight: '700', color: colors.text, textAlign: 'center' }}>
            {result === 'unlocked'
              ? 'Pro linked and active'
              : result === 'linked'
                ? 'Email linked'
                : 'Moving Pro to another device?'}
          </Text>
          <Text style={{ fontSize: font.size.bodySm, color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
            {result === 'unlocked'
              ? 'Pro is now active on this device too.'
              : result === 'linked'
                ? "This device is linked to that email. If Pro was purchased under it elsewhere, it'll unlock automatically the next time you're online — otherwise, enter this same email on your other device once you buy Pro there."
                : "App Store purchases don't carry to Google Play, and vice versa. Enter your email once and Spendtr links your purchase to it — nothing is emailed, nothing is uploaded."}
          </Text>
        </View>

        <View
          style={{
            marginTop: space[20],
            padding: space[14],
            borderRadius: radius.lg,
            borderWidth: borderWidth.thin,
            borderColor: colors.accent,
            backgroundColor: colors.accentQuiet,
          }}
        >
          <View style={{ flexDirection: 'row', gap: space[10] }}>
            <Icon name="information-circle-outline" size={17} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: font.size.bodySm, fontWeight: '700', color: colors.text }}>This is not an account</Text>
              <Text style={{ fontSize: font.size.xs, color: colors.textMuted, marginTop: space[4], lineHeight: 18 }}>
                No password, no sign-in, nothing to log into. Your email is hashed on this phone before it&apos;s used to link
                the purchase — Spendtr never sees or stores the address itself. Your transactions are never uploaded; moving
                your data is a Backup file, a separate thing.
              </Text>
            </View>
          </View>
        </View>

        {!result ? (
          <View style={{ marginTop: space[20] }}>
            <Field label="Email" error={error ?? undefined} hint={error ? undefined : 'Only used to link this purchase across devices.'}>
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
            </Field>
          </View>
        ) : null}

        <View style={{ marginTop: space[8], paddingBottom: space[10] }}>
          <PrivacyLine>Skipping this changes nothing on this phone.</PrivacyLine>
        </View>
      </ScrollView>

      <View style={{ padding: space[16], borderTopWidth: borderWidth.hairline, borderTopColor: colors.border }}>
        {result ? (
          <Button variant="primary" fullWidth onPress={() => router.back()}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="primary" fullWidth disabled={!validEmail} loading={busy} onPress={link}>
              Link this purchase
            </Button>
            <View style={{ marginTop: space[4] }}>
              <Button variant="quiet" fullWidth onPress={() => router.back()}>
                Cancel
              </Button>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
