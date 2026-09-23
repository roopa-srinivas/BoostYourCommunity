import { Stack } from 'expo-router';

import { useStackScreenOptions } from '@/hooks/use-stack-screen-options';

export default function Layout() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      {/* The Give screen draws its own greeting and headline instead of a header. */}
      <Stack.Screen name="index" options={{ title: 'give', headerShown: false }} />
    </Stack>
  );
}
