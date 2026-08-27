import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, type AppStateStatus, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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

  if (loading) return <LoadingScreen error={null} />;

  if (settings?.biometricLockEnabled && !authed) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.lockTitle, { color: colors.text }]}>Spendtr is locked</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => authenticate().then(setAuthed)}
          style={[styles.unlockButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.unlockButtonText}>Unlock</Text>
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
  lockTitle: { fontSize: 20, fontWeight: '700', marginBottom: 24 },
  unlockButton: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, minHeight: 44 },
  unlockButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
