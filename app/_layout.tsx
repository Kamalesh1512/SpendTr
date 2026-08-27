import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, type AppStateStatus, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useDatabaseReady } from '@/hooks/useDatabaseReady';
import { useSettings } from '@/hooks/useSettings';
import { useAppColors } from '@/hooks/useAppColors';
import { darkPalette } from '@/theme/colors';
import { initNotifications } from '@/services/notifications';
import { configurePurchases, reconcileProEntitlement } from '@/services/purchases';
import { authenticate, LOCK_IDLE_TIMEOUT_MS } from '@/services/biometrics';

export default function RootLayout() {
  const { ready, error } = useDatabaseReady();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      {ready ? <AppShell /> : <LoadingScreen error={error} />}
    </GestureHandlerRootView>
  );
}

// Uses static colors, not useAppColors(): the DB isn't migrated yet at this
// point, and useAppColors -> useSettings reads user_settings.
function LoadingScreen({ error }: { error: Error | null }) {
  return (
    <View style={[styles.center, { backgroundColor: darkPalette.background }]}>
      {error ? (
        <Text style={{ color: darkPalette.danger, textAlign: 'center', padding: 24 }}>
          Something went wrong setting up local storage.{'\n'}
          {error.message}
        </Text>
      ) : (
        <ActivityIndicator color={darkPalette.primary} />
      )}
    </View>
  );
}

function AppShell() {
  const { settings, loading } = useSettings();
  const colors = useAppColors();
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
  // opens that subscription's detail screen directly.
  useEffect(() => {
    function goToSubscription(subscriptionId: unknown) {
      if (typeof subscriptionId === 'string') {
        router.push(`/subscription/${subscriptionId}`);
      }
    }

    Notifications.getLastNotificationResponseAsync().then((response) => {
      goToSubscription(response?.notification.request.content.data?.subscriptionId);
    });

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      goToSubscription(response.notification.request.content.data?.subscriptionId);
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Onboarding gate (docs/USER_FLOWS.md Flow 1): redirect based on
  // user_settings.onboarding_complete rather than a static initial route.
  useEffect(() => {
    if (loading) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (!settings?.onboardingComplete && !inOnboarding) {
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
  // after unlock (Tabs, Home, ...) calls useAppColors() -> useSettings()
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
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <View style={[styles.lockIconCircle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="finger-print" size={40} color={colors.primary} />
        </View>
        <Text style={[styles.lockTitle, { color: colors.text }]}>Spendtr is locked</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Use biometric"
          onPress={() => authenticate().then(setAuthed)}
          style={[styles.unlockButton, { backgroundColor: colors.primary }]}
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
      <Stack.Screen name="add-subscription" options={{ presentation: 'modal' }} />
      <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
      <Stack.Screen name="subscription/[id]" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  lockIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  lockTitle: { fontSize: 20, fontWeight: '700', marginBottom: 24 },
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
