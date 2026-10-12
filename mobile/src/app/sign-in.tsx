import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LegalLinks } from '@/components/legal-links';
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

/**
 * sign-in / sign-up: the usual email + password.
 * confirm: a new account types the code we emailed to confirm the address.
 * forgot → reset: we email a code; they type it with a new password.
 */
type Mode = 'sign-in' | 'sign-up' | 'confirm' | 'forgot' | 'reset';

const MIN_PASSWORD_LENGTH = 8;
// Supabase codes are 6 digits by default; accept up to 10 in case the project setting changes.
const CODE_PATTERN = /^\d{6,10}$/;

export default function SignInScreen() {
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const trimmedEmail = email.trim();

  function goTo(next: Mode, message: string | null = null) {
    setMode(next);
    setError(null);
    setNotice(message);
    setCode('');
  }

  async function run(action: () => Promise<void>) {
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      await action();
      // When an action signs someone in, the auth listener swaps this screen for the app.
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  function checkPassword() {
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`use a password with at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
  }

  function checkCode() {
    if (!CODE_PATTERN.test(code.trim())) throw new Error('enter the code from the email.');
  }

  const submit = () =>
    run(async () => {
      if (!trimmedEmail) throw new Error('enter your email.');

      if (mode === 'sign-in') {
        if (!password) throw new Error('enter your email and password.');
        const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
        if (error?.code === 'email_not_confirmed') {
          await supabase.auth.resend({ type: 'signup', email: trimmedEmail });
          goTo('confirm', `your email isn’t confirmed yet. we sent a new code to ${trimmedEmail}.`);
          return;
        }
        if (error) throw error;
      } else if (mode === 'sign-up') {
        if (!displayName.trim()) throw new Error('enter the name other people will see.');
        checkPassword();
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { data: { display_name: displayName.trim() } },
        });
        if (error) throw error;
        // With email confirmation on, there's no session until the code is entered.
        if (!data.session) goTo('confirm', `we emailed a code to ${trimmedEmail}.`);
      } else if (mode === 'confirm') {
        checkCode();
        const { error } = await supabase.auth.verifyOtp({ email: trimmedEmail, token: code.trim(), type: 'email' });
        if (error) throw error;
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);
        if (error) throw error;
        // Supabase doesn't say whether the account exists, and neither do we.
        goTo('reset', `if there’s an account for ${trimmedEmail}, we emailed it a code.`);
      } else {
        checkCode();
        checkPassword();
        const verified = await supabase.auth.verifyOtp({ email: trimmedEmail, token: code.trim(), type: 'recovery' });
        if (verified.error) throw verified.error;
        // The code signed them in; now set the new password.
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      }
    });

  const resend = () =>
    run(async () => {
      const { error } =
        mode === 'confirm'
          ? await supabase.auth.resend({ type: 'signup', email: trimmedEmail })
          : await supabase.auth.resetPasswordForEmail(trimmedEmail);
      if (error) throw error;
      setNotice(`sent a new code to ${trimmedEmail}. it can take a minute; check spam too.`);
    });

  const entering = mode === 'sign-in' || mode === 'sign-up';
  const title = {
    'sign-in': 'boost your community',
    'sign-up': 'boost your community',
    confirm: 'confirm your email',
    forgot: 'forgot your password?',
    reset: 'set a new password',
  }[mode];
  const buttonLabel = {
    'sign-in': 'sign in',
    'sign-up': 'create account',
    confirm: 'confirm',
    forgot: 'email me a code',
    reset: 'save password and sign in',
  }[mode];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Screen contentContainerStyle={styles.content}>
          <ThemedText type="title">{title}</ThemedText>
          {entering ? (
            <>
              <ThemedText themeColor="textSecondary">
                give what local shelters and pantries actually need, when they need it.
              </ThemedText>
              <ChipGroup
                options={[
                  { value: 'sign-in', label: 'sign in' },
                  { value: 'sign-up', label: 'create account' },
                ]}
                value={mode}
                onChange={(next) => goTo(next)}
              />
            </>
          ) : mode === 'forgot' ? (
            <ThemedText themeColor="textSecondary">we’ll email you a code to set a new one.</ThemedText>
          ) : null}

          {mode === 'sign-up' ? (
            <TextField
              label="your name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="shown on leaderboards and to organizations"
              autoComplete="name"
              textContentType="name"
            />
          ) : null}

          {mode === 'confirm' || mode === 'reset' ? null : (
            <TextField
              label="email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              onSubmitEditing={mode === 'forgot' ? submit : undefined}
            />
          )}

          {mode === 'confirm' || mode === 'reset' ? (
            <TextField
              label="code from the email"
              value={code}
              onChangeText={(text) => setCode(text.replace(/\D/g, ''))}
              placeholder="123456"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={10}
              onSubmitEditing={mode === 'confirm' ? submit : undefined}
            />
          ) : null}

          {mode === 'sign-in' || mode === 'sign-up' || mode === 'reset' ? (
            <TextField
              label={mode === 'reset' ? 'new password' : 'password'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              textContentType={mode === 'sign-in' ? 'password' : 'newPassword'}
              hint={mode === 'sign-in' ? undefined : `at least ${MIN_PASSWORD_LENGTH} characters.`}
              onSubmitEditing={submit}
            />
          ) : null}

          {error ? <ErrorText>{error}</ErrorText> : null}
          {notice ? <ThemedText type="small">{notice}</ThemedText> : null}

          <Button label={buttonLabel} onPress={submit} loading={submitting} />

          {mode === 'sign-in' ? (
            <ThemedText type="link" accessibilityRole="button" style={styles.center} onPress={() => goTo('forgot')}>
              forgot your password?
            </ThemedText>
          ) : null}
          {mode === 'confirm' || mode === 'reset' ? (
            <ThemedText type="link" accessibilityRole="button" style={styles.center} onPress={resend}>
              send a new code
            </ThemedText>
          ) : null}
          {!entering ? (
            <ThemedText type="link" accessibilityRole="button" style={styles.center} onPress={() => goTo('sign-in')}>
              back to sign in
            </ThemedText>
          ) : (
            <LegalLinks />
          )}
        </Screen>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingTop: Spacing.five },
  center: { textAlign: 'center' },
});
