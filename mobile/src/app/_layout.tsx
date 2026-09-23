import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { useProfile } from '@/api/profile';
import { navigationTheme } from '@/constants/navigation-theme';
import { useStackScreenOptions } from '@/hooks/use-stack-screen-options';
import { queryClient } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';
import { AuthProvider, useAuth } from '@/providers/auth-provider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  // If fonts fail to load we carry on with system fonts rather than hang.
  const fontsReady = fontsLoaded || !!fontError;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider value={navigationTheme(colorScheme === 'dark' ? 'dark' : 'light')}>
          {fontsReady ? <RootStack /> : null}
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootStack() {
  const { session, loading } = useAuth();
  const screenOptions = useStackScreenOptions();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  // Keep the splash screen up until we know whether someone is signed in.
  if (loading) return null;

  return (
    <>
      {session ? <DeletedAccountGuard /> : null}
      <Stack screenOptions={screenOptions}>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="need/[id]" options={{ title: 'need' }} />
          <Stack.Screen name="organization/register" options={{ title: 'register your organization' }} />
          <Stack.Screen name="organization/need-form" options={{ title: 'need' }} />
          <Stack.Screen name="organization/need/[id]" options={{ title: 'need' }} />
          <Stack.Screen name="people" options={{ title: 'find people' }} />
          <Stack.Screen name="admin" options={{ title: 'review organizations' }} />
          <Stack.Screen name="org/[id]" options={{ title: '' }} />
          <Stack.Screen name="organization/edit-page" options={{ title: 'edit your page' }} />
          <Stack.Screen name="organization/checkin" options={{ title: 'check in a drop-off' }} />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

/**
 * A session can outlive its account (deleted on another device, or by an
 * admin). The profile lookup then finds no row: sign this device out rather
 * than leave screens waiting on data that will never come.
 */
function DeletedAccountGuard() {
  const profile = useProfile();
  const missing = profile.error && 'code' in profile.error && profile.error.code === 'PGRST116';

  useEffect(() => {
    if (missing) supabase.auth.signOut({ scope: 'local' });
  }, [missing]);

  return null;
}
