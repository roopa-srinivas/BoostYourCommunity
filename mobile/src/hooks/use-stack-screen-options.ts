import type { NativeStackNavigationOptions } from 'expo-router';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Shared header styling: cream header with no divider and serif titles. */
export function useStackScreenOptions(): NativeStackNavigationOptions {
  const theme = useTheme();
  return {
    headerBackButtonDisplayMode: 'minimal',
    headerShadowVisible: false,
    headerStyle: { backgroundColor: theme.background },
    headerTintColor: theme.tint,
    headerTitleStyle: { fontFamily: FontFamily.display, color: theme.text },
    headerLargeTitleStyle: { fontFamily: FontFamily.display, color: theme.text },
    contentStyle: { backgroundColor: theme.background },
  };
}
