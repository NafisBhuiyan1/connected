import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthForm } from '@/components/AuthForm';
import { StepTitle } from '@/components/OnboardingParts';
import { IconButton } from '@/components/ui';
import { C, S, T } from '@/theme';

/** Sign in to an existing account. New accounts are created at the end of onboarding. */
export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [note, setNote] = useState('');

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: S.lg, paddingTop: insets.top + S.sm, gap: S.xl }} keyboardShouldPersistTaps="handled">
        <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} style={{ marginLeft: -S.sm }} />
        <StepTitle icon="log-in-outline" section="Welcome back" title="Sign in to Connected" sub="Your preferences, profile and conversations come back with you." />
        <AuthForm
          mode="signin"
          onDone={(r) => {
            if (r.hasProfile) router.replace('/');
            else setNote('Signed in. Let’s set up your profile so people can find you.');
          }}
          onSwitchMode={() => router.replace('/onboarding')}
        />
        {note ? (
          <View style={{ gap: S.md }}>
            <Text style={T.body}>{note}</Text>
            <Text style={[T.small, { color: C.accent, fontWeight: '600' }]} onPress={() => router.replace('/onboarding')} accessibilityRole="link">
              Start setup
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
