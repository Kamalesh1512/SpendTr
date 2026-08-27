// Persistent FAB across the main tabs, opening Add Transaction directly
// (docs/UI_UX_GUIDELINES.md "Quick-Add FAB").
import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAppColors } from '@/hooks/useAppColors';

export default function TabsLayout() {
  const colors = useAppColors();
  const router = useRouter();
  const segments = useSegments();
  // Subscriptions already has its own "+" (Add Subscription) in its header,
  // so the global Add Transaction FAB is redundant — and confusing — there.
  const hideFab = segments[segments.length - 1] === 'subscriptions';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} /> }}
        />
        <Tabs.Screen
          name="subscriptions"
          options={{
            title: 'Subscriptions',
            tabBarIcon: ({ color, size }) => <Ionicons name="repeat" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'Reports',
            tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
          }}
        />
      </Tabs>

      {hideFab ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add transaction"
          onPress={() => router.push('/add-transaction')}
          style={[styles.fab, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 84,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
});
