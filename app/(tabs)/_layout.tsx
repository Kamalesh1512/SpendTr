// Persistent quick-add across the main tabs, opening Add Transaction
// directly (docs/design_system/templates/spendtr-app/home.jsx `QuickAdd`;
// implementation plan §3.4, §8.3 — "a wide docked pill, not a small
// circular FAB: it is the most-tapped control, so it gets the largest
// reachable target and shows the currency symbol").
import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/hooks/useSettings';
import { useCurrencies } from '@/hooks/useCurrencies';

export default function TabsLayout() {
  const { colors, space, font, radius, shadow, hitMin } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const { settings } = useSettings();
  const { currencies } = useCurrencies();
  const baseCurrency = currencies.find((c) => c.code === (settings?.baseCurrencyCode ?? 'USD'));
  // Recurring already has its own "+" (Add Recurring) in its header, so the
  // global quick-add is redundant — and confusing — there.
  const hideQuickAdd = segments[segments.length - 1] === 'recurring';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} /> }}
        />
        <Tabs.Screen
          name="recurring"
          options={{
            title: 'Recurring',
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

      {hideQuickAdd ? null : (
        <Pressable
          testID="quick-add"
          accessibilityRole="button"
          accessibilityLabel="Add transaction"
          onPress={() => router.push('/add-transaction')}
          style={[
            {
              position: 'absolute',
              left: space[20],
              right: space[20],
              bottom: 84,
              minHeight: hitMin,
              flexDirection: 'row',
              alignItems: 'center',
              gap: space[10],
              paddingLeft: space[16],
              paddingRight: space[8],
              borderRadius: radius.full,
              backgroundColor: colors.accent,
            },
            shadow.fab,
          ]}
        >
          <Text style={{ fontSize: font.size.lg, fontWeight: '700', color: colors.accentContrast, opacity: 0.7 }}>
            {baseCurrency?.symbol ?? '$'}
          </Text>
          <Text style={{ flex: 1, fontSize: font.size.md, fontWeight: '700', color: colors.accentContrast }}>
            Add transaction
          </Text>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: radius.full,
              backgroundColor: 'rgba(255,255,255,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="add" size={22} color={colors.accentContrast} />
          </View>
        </Pressable>
      )}
    </View>
  );
}
