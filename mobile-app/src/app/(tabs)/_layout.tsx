import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, useWindowDimensions, View } from 'react-native';
import { useApp } from '@/state/AppState';
import { C } from '@/theme';

export default function TabLayout() {
  const { hydrated, onboarded, requests, incoming, now } = useApp();
  // Computer variant: LinkedIn-style navigation across the top, content centered; phones keep bottom tabs.
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const gutter = wide ? Math.max(24, (width - 1080) / 2) : 0;
  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }
  if (!onboarded) return <Redirect href="/onboarding" />;

  const waiting =
    incoming.filter((i) => i.state === 'new').length +
    requests.filter((r) => r.incoming && r.status === 'requested').length +
    requests.filter((r) => !r.incoming && r.status === 'accepted' && r.updatedAt > now - 60 * 60_000).length;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.ink3,
        tabBarPosition: wide ? 'top' : 'bottom',
        tabBarStyle: wide
          ? { backgroundColor: C.bg, borderTopWidth: 0, borderBottomWidth: 1, borderBottomColor: C.line, height: 62, paddingHorizontal: Math.max(24, (width - 560) / 2) }
          : { backgroundColor: C.bg, borderTopColor: C.line },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        headerStyle: { backgroundColor: C.bg },
        headerShadowVisible: false,
        headerTitleAlign: wide ? 'center' : undefined,
        headerTitleStyle: { fontWeight: '700', color: C.ink },
        sceneStyle: wide ? { backgroundColor: C.bg2, paddingHorizontal: gutter } : { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Map', headerShown: false, sceneStyle: { backgroundColor: C.bg }, tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'map' : 'map-outline'} size={24} color={String(color)} /> }} />
      <Tabs.Screen name="events" options={{ title: 'Events', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={String(color)} /> }} />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarBadge: waiting || undefined,
          tabBarBadgeStyle: { backgroundColor: C.bad, fontSize: 11 },
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={24} color={String(color)} />,
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={25} color={String(color)} /> }} />
    </Tabs>
  );
}
