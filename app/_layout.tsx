import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, type AppStateStatus, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Archivo_800ExtraBold } from '@expo-google-fonts/archivo';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useDatabaseReady } from '@/hooks/useDatabaseReady';
import { useSettings } from '@/hooks/useSettings';
import { bootColors } from '@/theme/colors';
import { initNotifications } from '@/services/notifications';
import { configurePurchases, reconcileProEntitlement } from '@/services/purchases';
import { authenticate, LOCK_IDLE_TIMEOUT_MS } from '@/services/biometrics';
import { SpendTrLockup } from '@/components/brand/SpendTrLockup';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

export default function RootLayout() {
  const { ready, error } = useDatabaseReady();
  const [fontsLoaded] = useFonts({ Archivo_800ExtraBold });
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      {ready && fontsLoaded ? (
        <ThemeProvider>
          <AppShell />
        </ThemeProvider>
      ) : (
        <LoadingScreen error={error} />
      )}
    </GestureHandlerRootView>
  );
}

// Uses static colors, not useTheme(): the DB isn't migrated yet at this
// point, and useTheme -> useSettings reads user_settings.
function LoadingScreen({ error }: { error: Error | null }) {
  return (
    <View style={[styles.center, { backgroundColor: bootColors.bg }]}>
      {error ? (
        <Text style={{ color: bootColors.danger, textAlign: 'center', padding: 24 }}>
          Something went wrong setting up local storage.{'\n'}
          {error.message}
        </Text>
      ) : (
        <ActivityIndicator color={bootColors.accent} />
      )}
    </View>
  );
}

function AppShell() {
  const { settings, loading } = useSettings();
  const { colors } = useTheme();
  const router = useRouter();
  const segments = useSegments();

  const [authed, setAuthed] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    initNotifications();
    configurePurchases();
    reconcileProEntitlement();
  }, []);

  // Notification-tap deep link (docs/USER_FLOWS.md Flow 4,
  // docs/CODING_STANDARDS.md "Navigation"): tapping a renewal reminder
  // opens that recurring item's detail screen directly.
  useEffect(() => {
    function goToRecurringItem(recurringId: unknown) {
      if (typeof recurringId === 'string') {
        router.push(`/recurring/${recurringId}`);
      }
    }

    Notifications.getLastNotificationResponseAsync().then((response) => {
      goToRecurringItem(response?.notification.request.content.data?.subscriptionId);
    });

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      goToRecurringItem(response.notification.request.content.data?.subscriptionId);
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Onboarding gate (docs/USER_FLOWS.md Flow 1): redirect based on
  // user_settings.onboarding_complete rather than a static initial route.
  // "restore" is exempt: the welcome screen's "I have a SpendTr backup
  // file" button pushes there before onboarding is complete, and without
  // this exemption this effect fired on that route change and bounced the
  // user straight back to /onboarding before RestoreScreen ever rendered.
  useEffect(() => {
    if (loading) return;
    const inOnboarding = segments[0] === 'onboarding';
    const exemptFromGate = segments[0] === 'restore';
    if (!settings?.onboardingComplete && !inOnboarding && !exemptFromGate) {
      router.replace('/onboarding');
    } else if (settings?.onboardingComplete && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [loading, settings?.onboardingComplete, segments, router]);

  // Biometric app lock: cold start + resume-from-background after the idle
  // timeout (docs/SECURITY.md §1).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current === 'active' && next.match(/inactive|background/)) {
        backgroundedAt.current = Date.now();
      }
      if (next === 'active' && backgroundedAt.current !== null) {
        const elapsed = Date.now() - backgroundedAt.current;
        if (elapsed > LOCK_IDLE_TIMEOUT_MS && settings?.biometricLockEnabled) {
          setAuthed(false);
        }
        backgroundedAt.current = null;
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [settings?.biometricLockEnabled]);

  useEffect(() => {
    if (loading) return;
    if (!settings?.biometricLockEnabled) {
      // `authed` can only be derived once `settings` has loaded (async,
      // after mount), so this can't move to useState's initializer.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthed(true);
      return;
    }
    if (!authed) {
      authenticate().then(setAuthed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, settings?.biometricLockEnabled]);

  // Gate on settings being null (never fetched yet), not on `loading`:
  // `loading` is a shared flag on the useSettings() store now (fixing the
  // Settings screen's theme-not-applying bug made every useSettings()
  // consumer app-wide share one loading flag). Every screen that mounts
  // after unlock (Tabs, Home, ...) calls useTheme() -> useSettings()
  // itself and flips that shared `loading` true again for its own
  // refetch — gating here on `loading` tore the whole <Stack> down to
  // this loading screen every time any descendant mounted, which
  // remounted those same descendants, which flipped `loading` again: an
  // infinite mount/unmount loop that looked like the app freezing right
  // after biometric unlock. `settings` itself stays non-null across every
  // background refetch once it's first loaded, so it only gates the true
  // initial load.
  if (loading && !settings) return <LoadingScreen error={null} />;

  if (settings?.biometricLockEnabled && !authed) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <View style={styles.lockLockup}>
          <SpendTrLockup markSize={56} />
        </View>
        <Text style={[styles.lockTitle, { color: colors.textMuted }]}>Locked</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Use biometric"
          onPress={() => authenticate().then(setAuthed)}
          style={[styles.unlockButton, { backgroundColor: colors.accent }]}
        >
          <Ionicons name="finger-print" size={20} color="#fff" />
          <Text style={styles.unlockButtonText}>Use biometric</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding/index" />
      <Stack.Screen name="add-transaction" options={{ presentation: 'modal' }} />
      <Stack.Screen name="add-recurring" options={{ presentation: 'modal' }} />
      <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
      <Stack.Screen name="recurring/[id]" />
      <Stack.Screen name="account/[id]" />
      <Stack.Screen name="budgets" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="goal/[id]" />
      <Stack.Screen name="debts" />
      <Stack.Screen name="debt/[id]" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="add-account" options={{ presentation: 'modal' }} />
      <Stack.Screen name="import-csv" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="link-pro" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="backup" />
      <Stack.Screen name="restore" />
      <Stack.Screen name="transaction/[id]" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  lockLockup: { marginBottom: 20 },
  lockTitle: { fontSize: 14, fontWeight: '600', marginBottom: 24, textTransform: 'uppercase', letterSpacing: 1 },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    minHeight: 44,
  },
  unlockButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
