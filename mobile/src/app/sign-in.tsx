import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ChipGroup } from '@/components/ui/chip';
import { ErrorText } from '@/components/ui/message';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/format';
import { supabase } from '@/lib/supabase';

type Mode = 'sign-in' | 'sign-up';

const MIN_PASSWORD_LENGTH = 8;

export default function SignInScreen() {
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setNotice(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (mode === 'sign-up') {
      if (!displayName.trim()) {
        setError('Enter the name other people will see.');
        return;
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(`Use a password with at least ${MIN_PASSWORD_LENGTH} characters.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { data: { display_name: displayName.trim() } },
        });
        if (error) throw error;
        // With email confirmation turned on, there's no session until the
        // person clicks the link in their email.
        if (!data.session) {
          setNotice('Check your email to confirm your account, then sign in.');
          setMode('sign-in');
        }
      }
      // On success the auth listener swaps this screen for the app.
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Screen contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">Boost Your Community</ThemedText>
          <ThemedText themeColor="textSecondary">
            Give what local shelters and pantries actually need, when they need it.
          </ThemedText>

          <ChipGroup
            options={[
              { value: 'sign-in', label: 'Sign in' },
              { value: 'sign-up', label: 'Create account' },
            ]}
            value={mode}
            onChange={(next) => {
              setMode(next);
              setError(null);
            }}
          />

          {mode === 'sign-up' ? (
            <TextField
              label="Your name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Shown on leaderboards and to organizations"
              autoComplete="name"
              textContentType="name"
            />
          ) : null}
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            textContentType={mode === 'sign-in' ? 'password' : 'newPassword'}
            hint={mode === 'sign-up' ? `At least ${MIN_PASSWORD_LENGTH} characters.` : undefined}
            onSubmitEditing={submit}
          />

          {error ? <ErrorText>{error}</ErrorText> : null}
          {notice ? <ThemedText type="small">{notice}</ThemedText> : null}

          <Button
            label={mode === 'sign-in' ? 'Sign in' : 'Create account'}
            onPress={submit}
            loading={submitting}
          />
        </Screen>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingTop: Spacing.five },
});
