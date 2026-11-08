import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Intro } from '@/components/Intro';
import { AppProvider } from '@/state/AppState';
import { C } from '@/theme';

// Keep the native purple splash up until the animated intro is on screen (store builds only;
// Expo Go shows the app icon instead and this call is harmless there).
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [introDone, setIntroDone] = useState(false);
  // Computer variant: the same screens, centered in a readable column on wide screens.
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const column = (max: number) => (wide ? { paddingHorizontal: Math.max(24, (width - max) / 2), backgroundColor: C.bg2 } : null);
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style={introDone ? 'dark' : 'light'} />
        <View style={{ flex: 1, backgroundColor: C.bg }}>
          <Stack
            screenOptions={{
              headerTintColor: C.ink,
              headerStyle: { backgroundColor: C.bg },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: C.bg, ...column(760) },
              headerBackButtonDisplayMode: 'minimal',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false, contentStyle: { backgroundColor: C.bg, ...column(620) } }} />
            <Stack.Screen name="person/[id]" options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="open-door" options={{ title: 'Open Door', presentation: 'modal' }} />
            <Stack.Screen name="event/[id]" options={{ title: 'Event' }} />
            <Stack.Screen name="chat/[id]" options={{ title: 'Conversation' }} />
            <Stack.Screen name="search" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="assistant" options={{ headerShown: false, presentation: 'modal' }} />
          </Stack>
          {introDone ? null : <Intro onDone={() => setIntroDone(true)} />}
        </View>
      </AppProvider>
    </SafeAreaProvider>
  );
}
